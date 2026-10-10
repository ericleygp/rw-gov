// Motor de busca: coleta compras abertas (PNCP), lê os ITENS de cada uma e compara com o seu catálogo.
// Entrada: dados-locais/catalogo-real-confiavel.csv  ·  Saída: dados-locais/resultado-busca.json
import fs from 'node:fs'

const BASE = process.env.PNCP_BASE || 'https://pncp.gov.br/api'
const PAUSA_MS = Number(process.env.PNCP_PAUSA_MS ?? 1000)
const UF = process.env.PNCP_UF || 'PA'
const DIAS = Number(process.env.PNCP_DIAS ?? 60)
const MODALIDADES = (process.env.PNCP_MODALIDADES || '6,8').split(',')
const PASTA = 'dados-locais'
const CSV = process.env.CATALOGO || `${PASTA}/catalogo-real-confiavel.csv`
const CACHE = `${PASTA}/cache-itens`
fs.mkdirSync(CACHE, { recursive: true })

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const sem = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const ymd = (d) => d.toISOString().slice(0, 10).replaceAll('-', '')
const PARADAS = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'com', 'sem', 'e', 'em', 'a', 'o', 'as', 'os', 'tipo', 'cor', 'modelo', 'marca', 'similar', 'ou', 'um', 'uma', 'no', 'na', 'ate', 'por', 'item', 'cx', 'un', 'unid', 'unidade', 'c', 'p'])
function tokens(t) {
  return [...new Set((sem(t).match(/[a-z0-9]+/g) || []).filter((x) => x.length > 1 && !PARADAS.has(x)).map((x) => (x.length > 3 && x.endsWith('s') && !x.endsWith('ss') ? x.slice(0, -1) : x)))]
}

const soLetras = (arr) => arr.filter((x) => /^[a-z]+$/.test(x))
// Em itens de "LOTE ... - Produto", o produto é o último trecho depois do hífen.
const nucleo = (d) => { const s = String(d ?? ''); const partes = s.split(/\s-\s/); return /^\s*lote\b/i.test(s) && partes.length > 1 ? partes[partes.length - 1] : s }

// ---------- catálogo ----------
function lerCsv(texto) {
  const linhas = []; let cel = ''; let lin = []; let aspas = false
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i]
    if (c === '"' && aspas && texto[i + 1] === '"') { cel += '"'; i += 1 } else if (c === '"') aspas = !aspas
    else if (!aspas && c === ';') { lin.push(cel); cel = '' } else if (!aspas && (c === '\n' || c === '\r')) {
      if (c === '\r' && texto[i + 1] === '\n') i += 1
      lin.push(cel); linhas.push(lin); lin = []; cel = ''
    } else cel += c
  }
  if (cel || lin.length) { lin.push(cel); linhas.push(lin) }
  return linhas.filter((l) => l.some(Boolean))
}
if (!fs.existsSync(CSV)) { console.error(`Catálogo não encontrado em ${CSV}. Coloque o CSV na pasta ${PASTA}.`); process.exit(1) }
const [cab, ...dados] = lerCsv(fs.readFileSync(CSV, 'utf8').replace(/^\uFEFF/, ''))
const col = (n) => cab.indexOf(n)
const produtos = dados.map((l) => {
  const t = soLetras(tokens(l[col('nome')]))
  return { nome: l[col('nome')], tokens: t, head: t[0], estoque: l[col('estoque')] || '', preco: l[col('preco_venda')] || '', codigo: l[col('codigo_interno')] }
}).filter((p) => p.head)
const porHead = new Map()
for (const p of produtos) porHead.set(p.head, [...(porHead.get(p.head) || []), p])
console.log(`Catálogo: ${produtos.length} produtos`)

function melhorProduto(descricao) {
  const tk = soLetras(tokens(nucleo(descricao)))
  const conjunto = new Set(tk)
  let melhor = null
  // O produto do catálogo precisa ser o início da descrição (1º ou 2º termo).
  for (const t of tk.slice(0, 2)) for (const p of porHead.get(t) || []) {
    const comuns = p.tokens.filter((x) => conjunto.has(x)).length
    const cobertura = comuns / p.tokens.length
    if (!melhor || cobertura > melhor.cobertura || (cobertura === melhor.cobertura && comuns > melhor.comuns)) melhor = { p, comuns, cobertura }
  }
  if (!melhor) return null
  const nivel = melhor.comuns >= 2 && melhor.cobertura >= 0.6 ? 'provavel' : 'possivel'
  return { ...melhor, nivel }
}

// ---------- PNCP ----------
async function get(url, tentativas = 4) {
  for (let i = 1; i <= tentativas; i += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90000), headers: { Accept: 'application/json' } })
      const texto = await res.text()
      if (res.status === 204 || (res.status === 200 && !texto)) return { status: 204, json: null }
      if (res.status === 400 || res.status === 404) return { status: res.status, json: null }
      if (res.status === 200) { try { return { status: 200, json: JSON.parse(texto) } } catch { /* HTML */ } }
      throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      console.log(`  aviso (${e.message}); nova tentativa`)
      await dormir(process.env.PNCP_PAUSA_MS ? 50 : 15000 * i)
    }
  }
  return { status: 0, json: null }
}
async function listar(modalidade) {
  const lista = []
  let tamanho = 50
  for (let n = 1; ; n += 1) {
    const q = () => `${BASE}/consulta/v1/contratacoes/proposta?${new URLSearchParams({ pagina: String(n), tamanhoPagina: String(tamanho), uf: UF, dataFinal: ymd(new Date(Date.now() + DIAS * 86400000)), codigoModalidadeContratacao: modalidade })}`
    let r = await get(q())
    if (r.status === 400 && tamanho > 10) { tamanho = 10; r = await get(q()) }
    if (r.status === 0) throw new Error('Não foi possível ler o PNCP (sem internet ou portal fora do ar). A lista anterior foi mantida.')
    if (!r.json) break
    lista.push(...(r.json.data || []))
    process.stdout.write(`  modalidade ${modalidade}: página ${n}/${r.json.totalPaginas}\r`)
    if (n >= (r.json.totalPaginas || 0)) break
    await dormir(PAUSA_MS)
  }
  console.log()
  return lista
}
async function itensDe(c) {
  const arq = `${CACHE}/${c.numeroControlePNCP.replaceAll('/', '_')}.json`
  if (fs.existsSync(arq)) return JSON.parse(fs.readFileSync(arq, 'utf8'))
  const base = `${BASE}/pncp/v1/orgaos/${c.orgaoEntidade.cnpj}/compras/${c.anoCompra}/${c.sequencialCompra}/itens`
  const todos = []
  for (let pg = 1; pg <= 20; pg += 1) {
    let r = await get(`${base}?pagina=${pg}&tamanhoPagina=500`)
    if (r.status === 400) r = await get(base)
    const arr = Array.isArray(r.json) ? r.json : []
    if (r.status === 0) return null // falha de rede: não grava cache
    if (!arr.length || (pg > 1 && todos[0] && arr[0].numeroItem === todos[0].numeroItem)) break
    todos.push(...arr)
    if (arr.length < 500 || r.status === 400) break
    await dormir(PAUSA_MS)
  }
  fs.writeFileSync(arq, JSON.stringify(todos))
  return todos
}

// ---------- execução ----------
const todas = new Map()
try {
  for (const m of MODALIDADES) for (const c of await listar(m)) todas.set(c.numeroControlePNCP, c)
} catch (e) { console.error(`\n${e.message}`); process.exit(1) }
const agora = Date.now()
const abertas = [...todas.values()].filter((c) => !c.dataEncerramentoProposta || new Date(c.dataEncerramentoProposta).getTime() >= agora)
if (abertas.length === 0) { console.error('\nNenhuma compra aberta foi lida. A lista anterior foi mantida.'); process.exit(1) }
console.log(`Compras abertas: ${abertas.length}. Lendo os itens (a primeira vez demora; depois usa o cache)...`)

const resultado = []
let i = 0
let falhas = 0
for (const c of abertas) {
  i += 1
  const cacheado = fs.existsSync(`${CACHE}/${c.numeroControlePNCP.replaceAll('/', '_')}.json`)
  const itens = await itensDe(c)
  process.stdout.write(`  ${i}/${abertas.length}\r`)
  if (!cacheado) await dormir(PAUSA_MS)
  if (!itens) { falhas += 1; continue }
  const materiais = itens.filter((it) => it.materialOuServico !== 'S')
  const achados = []
  for (const it of materiais) {
    const m = melhorProduto(it.descricao)
    if (m) achados.push({ numeroItem: it.numeroItem, descricao: String(it.descricao).slice(0, 140), descricaoCompleta: String(it.descricao ?? ''), unidade: it.unidadeMedida ?? null, valorUnitario: it.valorUnitarioEstimado ?? null, quantidade: it.quantidade, valorTotal: it.valorTotal ?? null, nivel: m.nivel, produto: m.p.nome, estoque: m.p.estoque, precoVenda: m.p.preco, codigo: m.p.codigo })
  }
  const prov = achados.filter((a) => a.nivel === 'provavel')
  // Relevância = quantos produtos DIFERENTES do catálogo aparecem como provável (derruba coincidências de 1 produto só).
  const distintos = new Set(prov.map((a) => a.codigo)).size
  // Lista completa do edital (para montar proposta): só das compras com algum item provável, para o arquivo não crescer à toa.
  const porNumero = new Map(achados.map((a) => [a.numeroItem, a]))
  const todosItens = prov.length > 0 ? itens.map((it) => {
    const a = porNumero.get(it.numeroItem)
    return {
      numeroItem: it.numeroItem, descricao: String(it.descricao ?? ''), unidade: it.unidadeMedida ?? null, quantidade: it.quantidade ?? null,
      valorUnitario: it.orcamentoSigiloso ? null : (it.valorUnitarioEstimado ?? null), sigiloso: Boolean(it.orcamentoSigiloso), tipo: it.materialOuServico ?? null,
      match: a ? { nivel: a.nivel, produto: a.produto, estoque: a.estoque || 'não informado', precoVenda: a.precoVenda || 'não informado', codigo: a.codigo } : null,
    }
  }) : undefined
  const relevancia = distintos >= 8 ? 'alta' : distintos >= 3 ? 'media' : distintos >= 1 ? 'baixa' : 'nenhuma'
  resultado.push({
    id: c.numeroControlePNCP, orgao: c.orgaoEntidade?.razaoSocial, municipio: c.unidadeOrgao?.municipioNome, modalidade: c.modalidadeNome,
    objeto: c.objetoCompra, encerramento: c.dataEncerramentoProposta, valorEstimado: c.valorTotalEstimado ?? null,
    link: `https://pncp.gov.br/app/editais/${c.orgaoEntidade?.cnpj}/${c.anoCompra}/${c.sequencialCompra}`,
    ibge: c.unidadeOrgao?.codigoIbge != null ? String(c.unidadeOrgao.codigoIbge) : null,
    numeroCompra: c.numeroCompra ?? null, processo: c.processo ?? null, publicadoEm: c.dataPublicacaoPncp ?? null,
    relevancia, produtosDistintos: distintos, cobertura: materiais.length ? Math.round((prov.length / materiais.length) * 100) : 0,
    totalItens: itens.length, itensMateriais: materiais.length, todosItens, provaveis: prov.length, possiveis: achados.length - prov.length,
    valorProvavel: prov.reduce((s, a) => s + (Number(a.valorTotal) || 0), 0), itens: achados,
  })
}
const peso = { alta: 3, media: 2, baixa: 1, nenhuma: 0 }
if (falhas > Math.max(5, abertas.length * 0.1)) { console.error(`\nMuitas falhas ao ler itens (${falhas}). A lista anterior foi mantida; tente de novo mais tarde.`); process.exit(1) }
resultado.sort((a, b) => peso[b.relevancia] - peso[a.relevancia] || b.valorProvavel - a.valorProvavel || b.provaveis - a.provaveis)
fs.writeFileSync(`${PASTA}/resultado-busca.json`, JSON.stringify({ geradoEm: new Date().toISOString(), uf: UF, lidas: abertas.length, resultado: resultado.map(({ todosItens: _todosItens, ...resto }) => resto) }, null, 2))

const com = resultado.filter((r) => r.provaveis > 0)
const cont = (n) => resultado.filter((r) => r.relevancia === n).length
console.log(`\n\nCompras abertas lidas: ${abertas.length} · relevância ALTA: ${cont('alta')} · MÉDIA: ${cont('media')} · baixa: ${cont('baixa')}`)
for (const r of com.filter((x) => x.relevancia !== 'baixa').slice(0, 12)) {
  console.log(`\n- [${r.relevancia.toUpperCase()}] ${String(r.encerramento).slice(0, 10)} · ${r.municipio} · ${r.modalidade} · ${r.produtosDistintos} produtos seus · ${r.provaveis} itens de ${r.itensMateriais} (${r.cobertura}%)`)
  console.log(`  ${String(r.objeto).slice(0, 100)}`)
}

// Arquivo no formato do app (o app lê de /dados-locais/oportunidades-reais.json)
const dinheiro = (v) => (v == null || Number.isNaN(Number(v)) ? 'não informado' : Number(v))
const oportunidades = com.map((r) => ({
  id: `pncp-${r.id.replaceAll('/', '-')}`, processNumber: r.processo || r.numeroCompra || r.id, title: String(r.objeto ?? '').replace(/^\[[^\]]+\]\s*-\s*/, '').slice(0, 160),
  agency: r.orgao, city: r.municipio, state: UF, modality: r.modalidade, status: 'Aberta', category: 'Não informado',
  estimatedValue: dinheiro(r.valorEstimado), publishedAt: String(r.publicadoEm ?? '').slice(0, 10) || 'não informado', sessionAt: r.encerramento,
  itemCount: r.totalItens, summary: String(r.objeto ?? ''), source: 'PNCP', capturedAt: new Date().toISOString(), dataConfidence: 'Oficial (PNCP)',
  link: r.link, ibge: r.ibge, relevancia: r.relevancia, produtosDistintos: r.produtosDistintos, itensProvaveis: r.provaveis, cobertura: r.cobertura,
}))
const itensApp = com.flatMap((r) => r.itens.map((a) => ({
  id: `pncp-${r.id.replaceAll('/', '-')}-${a.numeroItem}`, opportunityId: `pncp-${r.id.replaceAll('/', '-')}`, itemNumber: a.numeroItem,
  originalDescription: a.descricaoCompleta, quantity: dinheiro(a.quantidade), supplyUnit: a.unidade || 'não informado', estimatedUnitValue: dinheiro(a.valorUnitario),
  match: { nivel: a.nivel, produto: a.produto, estoque: a.estoque || 'não informado', precoVenda: a.precoVenda || 'não informado', codigo: a.codigo },
})))
fs.mkdirSync('public/dados-locais', { recursive: true })
const editais = Object.fromEntries(com.filter((r) => r.todosItens).map((r) => [`pncp-${r.id.replaceAll('/', '-')}`, r.todosItens]))
fs.writeFileSync('public/dados-locais/itens-completos.json', JSON.stringify({ geradoEm: new Date().toISOString(), fonte: 'PNCP', editais }))
fs.writeFileSync('public/dados-locais/oportunidades-reais.json', JSON.stringify({ geradoEm: new Date().toISOString(), fonte: 'PNCP', uf: UF, oportunidades, itens: itensApp }))
console.log(`\nDetalhes em ${PASTA}/resultado-busca.json · arquivo do app: public/dados-locais/oportunidades-reais.json (${oportunidades.length} oportunidades, ${itensApp.length} itens) + itens-completos.json (${Object.keys(editais).length} editais)`)
