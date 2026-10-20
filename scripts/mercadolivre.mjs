// Consulta de preços no Mercado Livre (catálogo de produtos + anúncios), só leitura.
// Credenciais: dados-locais/mercadolivre.json (client_id, client_secret, refresh_token). Nunca vai para o Git.
// Uso: node scripts/mercadolivre.mjs "caneta esferografica preta" --unidades 50 --cor preto
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const API = process.env.ML_API || 'https://api.mercadolibre.com'
const ARQ = process.env.ML_CREDENCIAIS || 'dados-locais/mercadolivre.json'
const sem = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

export function lerCredenciais(arquivo = ARQ) {
  const c = JSON.parse(fs.readFileSync(arquivo, 'utf8').replace(/^\uFEFF/, ''))
  if (!c.client_id || !c.client_secret || !c.refresh_token) throw new Error('mercadolivre.json incompleto')
  return c
}

// O Mercado Livre troca o refresh_token a cada renovação: o novo precisa ser salvo.
export async function obterToken({ arquivo = ARQ, fetchFn = fetch } = {}) {
  const c = lerCredenciais(arquivo)
  const corpo = new URLSearchParams({ grant_type: 'refresh_token', client_id: c.client_id, client_secret: c.client_secret, refresh_token: c.refresh_token })
  const r = await fetchFn(`${API}/oauth/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: corpo })
  if (!r.ok) throw new Error(`renovar token falhou (${r.status})`)
  const t = await r.json()
  if (t.refresh_token && t.refresh_token !== c.refresh_token) fs.writeFileSync(arquivo, JSON.stringify({ ...c, refresh_token: t.refresh_token }, null, 2))
  return t.access_token
}

const atributo = (produto, id) => (produto.attributes || []).find((a) => a.id === id)?.value_name

// Unidades vendidas no anúncio/produto (kit de 12, caixa de 50...). Sem informação = 1 unidade.
export function unidadesDoProduto(produto) {
  const n = Number(atributo(produto, 'UNITS_PER_PACK') ?? atributo(produto, 'UNITS_PER_PACKAGE'))
  return Number.isFinite(n) && n > 0 ? n : 1
}

// Confere o produto do catálogo contra a especificação. Devolve { ok, motivos }.
const radical = (t) => sem(t).replace(/(as|os|a|o)$/, '')
// Nomes de cor equivalentes (o catálogo mistura português e inglês, ex.: "midnight black").
const SINONIMOS = { pret: ['black'], azul: ['blue'], vermelh: ['red'], verd: ['green'], branc: ['white'] }
const nomesDaCor = (cor) => { const r = radical(cor); return [r, ...(SINONIMOS[r] ?? [])] }

export function confere(produto, espec = {}) {
  const motivos = []
  const avisos = []
  if (espec.cor) {
    const informada = atributo(produto, 'INK_COLOR') ?? atributo(produto, 'EXTERIOR_COLOR')
    const quer = nomesDaCor(espec.cor)
    if (informada) {
      if (!sem(informada).split(/[^a-z]+/).map(radical).some((x) => quer.includes(x))) motivos.push(`cor diferente (${sem(informada)})`)
    } else if (sem(produto.name).split(/[^a-z]+/).map(radical).some((x) => quer.includes(x))) avisos.push('cor não informada no catálogo; consta no nome')
    else motivos.push('cor não informada')
  }
  if (espec.tipo && !sem(atributo(produto, 'PEN_TYPE') ?? produto.name).includes(sem(espec.tipo))) motivos.push('tipo diferente')
  if (espec.ponta) {
    const ponta = atributo(produto, 'TRACE_TYPE')
    const categoria = (t) => { const x = sem(t); return /\bfin[oa]s?\b/.test(x) ? 'fina' : /\bmedi[oa]s?\b/.test(x) ? 'media' : /\bgross[oa]s?\b/.test(x) ? 'grossa' : null }
    const quer = categoria(espec.ponta) ?? sem(espec.ponta)
    const tem = ponta ? categoria(ponta) : null
    if (tem) { if (tem !== quer) motivos.push(`ponta ${tem}, edital pede ${quer}`) }
    else if (ponta) avisos.push(`ponta com valor estranho no catálogo (${sem(ponta)})`)
    else if (/\b(fina|fine|0[.,][3-8])\b/.test(sem(produto.name))) avisos.push('ponta não informada; o nome sugere fina')
    else avisos.push('ponta não informada')
  }
  if (espec.palavras?.length) {
    const texto = sem([produto.name, produto.short_description?.content, ...(produto.main_features ?? []).map((f) => f.text ?? f)].join(' '))
    const faltam = espec.palavras.filter((w) => !texto.includes(sem(w)))
    if (faltam.length) avisos.push(`não confirma: ${faltam.join(', ')}`)
  }
  if (espec.espessuraMaxMm) {
    const mm = parseFloat(String(atributo(produto, 'PEN_STROKE_THICKNESS') ?? '').replace(',', '.'))
    if (Number.isFinite(mm) && mm > espec.espessuraMaxMm) motivos.push(`traço grosso (${mm} mm)`)
    else if (!Number.isFinite(mm)) avisos.push('espessura do traço não informada')
  }
  return { ok: motivos.length === 0, motivos, avisos }
}

// Custo por unidade do anúncio e custo para completar a quantidade pedida (ex.: caixa com 50).
export function custoDoAnuncio({ preco, unidadesDoAnuncio }, unidadesPedidas) {
  const porUnidade = preco / unidadesDoAnuncio
  const pacotes = Math.ceil(unidadesPedidas / unidadesDoAnuncio)
  return { porUnidade: Math.round(porUnidade * 10000) / 10000, custoTotal: Math.round(pacotes * preco * 100) / 100, pacotes, sobra: pacotes * unidadesDoAnuncio - unidadesPedidas }
}

async function pegar(url, token, fetchFn) {
  const r = await fetchFn(url, { headers: { authorization: `Bearer ${token}` } })
  if (!r.ok) throw new Error(`${r.status} em ${url.replace(API, '')}`)
  return r.json()
}

export async function cotar({ consulta, espec = {}, unidades = 1, candidatos = 8, pausaMs = 300, token, fetchFn = fetch }) {
  const busca = await pegar(`${API}/products/search?status=active&site_id=MLB&limit=${candidatos}&q=${encodeURIComponent(consulta)}`, token, fetchFn)
  const resultados = []
  for (const p of busca.results || []) {
    const c = confere(p, espec)
    if (!c.ok) { resultados.push({ produtoId: p.id, nome: p.name, descartado: c.motivos }); continue }
    const unidadesProduto = unidadesDoProduto(p)
    let anuncios = []
    let aviso = ''
    try { anuncios = (await pegar(`${API}/products/${p.id}/items?limit=20`, token, fetchFn)).results || [] } catch (e) { aviso = e.message }
    await dormir(pausaMs)
    resultados.push({ produtoId: p.id, nome: p.name, semAnuncios: anuncios.length === 0, aviso })
    for (const a of anuncios) {
      if (a.condition && a.condition !== 'new') continue
      resultados.push({ produtoId: p.id, nome: p.name, avisos: c.avisos, itemId: a.item_id, preco: a.price, frete: a.shipping?.cost ?? 0, freteGratis: Boolean(a.shipping?.free_shipping), cidade: a.seller_address?.city?.name ?? '', unidadesDoAnuncio: unidadesProduto, link: `https://produto.mercadolivre.com.br/${a.item_id.replace('MLB', 'MLB-')}`, ...custoDoAnuncio({ preco: a.price, unidadesDoAnuncio: unidadesProduto }, unidades) })
    }
  }
  const semAnuncios = resultados.filter((x) => x.semAnuncios)
  const validos = resultados.filter((x) => x.itemId).sort((a, b) => a.custoTotal - b.custoTotal)
  return { consulta, unidades, melhor: validos[0] ?? null, alternativas: validos.slice(1, 5), descartados: resultados.filter((x) => x.descartado), semAnuncios }
}

async function principal() {
  const args = process.argv.slice(2)
  const consulta = args.find((a) => !a.startsWith('--') && !/^\d/.test(a)) ?? ''
  const opc = (nome) => { const i = args.indexOf(`--${nome}`); return i >= 0 ? args[i + 1] : undefined }
  if (!consulta) { console.log('Uso: node scripts/mercadolivre.mjs "caneta esferografica preta" --unidades 50 --cor preto --tipo esferografica --espessura 0.7'); return }
  const token = await obterToken()
  const r = await cotar({ consulta, unidades: Number(opc('unidades') ?? 1), candidatos: Number(opc('candidatos') ?? 8), espec: { ponta: opc('ponta'), palavras: opc('palavras')?.split(','), cor: opc('cor'), tipo: opc('tipo'), espessuraMaxMm: opc('espessura') ? Number(opc('espessura')) : undefined }, token })
  const linha = (x) => `R$ ${x.custoTotal.toFixed(2)} (${x.pacotes} x R$ ${x.preco.toFixed(2)}, ${x.unidadesDoAnuncio} un, R$ ${x.porUnidade.toFixed(4)}/un, sobra ${x.sobra}) frete R$ ${x.frete.toFixed(2)} (de 1 un, confira) ${x.cidade}\n   ${x.avisos.length ? 'CONFERIR: ' + x.avisos.join('; ') + '\n   ' : ''}   ${x.nome}\n   ${x.link}`
  console.log(r.melhor ? `MELHOR PARA ${r.unidades} un:\n${linha(r.melhor)}` : 'Nenhum anúncio encontrado dentro da especificação.')
  r.alternativas.forEach((x, i) => console.log(`\nALTERNATIVA ${i + 1}:\n${linha(x)}`))
  console.log(`\nDescartados por especificação: ${r.descartados.length}`)
  if (args.includes('--detalhes')) {
    r.descartados.forEach((x) => console.log(`  - ${x.nome} -> ${x.descartado.join('; ')}`))
    r.semAnuncios.forEach((x) => console.log(`  - sem anúncios: ${x.nome} ${x.aviso}`))
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) principal().catch((e) => { console.error('erro:', e.message); process.exitCode = 1 })
