// Sonda do PNCP: testa a conexão e salva a resposta real para conferirmos o formato.
// Faz poucas requisições, com pausa entre elas, para não ser bloqueada.
import fs from 'node:fs'

const BASE = process.env.PNCP_BASE || 'https://pncp.gov.br/api'
const PAUSA_MS = Number(process.env.PNCP_PAUSA_MS ?? 4000)
const TIMEOUT_MS = Number(process.env.PNCP_TIMEOUT_MS ?? 90000)
const PASTA = 'dados-locais'
fs.mkdirSync(PASTA, { recursive: true })

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const ymd = (d) => d.toISOString().slice(0, 10).replaceAll('-', '')
const iso = (d) => d.toISOString().slice(0, 10)
const limite = new Date(Date.now() + 30 * 86400000)
const resumo = []
const say = (t) => { console.log(t); resumo.push(t) }

async function chamar(rotulo, url) {
  const ini = Date.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    const texto = await res.text()
    const seg = ((Date.now() - ini) / 1000).toFixed(1)
    const tipo = res.headers.get('content-type') || ''
    let json = null
    try { json = texto ? JSON.parse(texto) : null } catch { /* não é JSON */ }
    say(`\n[${rotulo}] HTTP ${res.status} em ${seg}s · tipo: ${tipo || 'n/d'} · ${texto.length} bytes`)
    say(`  URL: ${url}`)
    if (res.status === 204 || !texto) say('  Resposta vazia (sem resultados).')
    else if (!json) say(`  Não veio JSON. Início: ${texto.slice(0, 160).replace(/\s+/g, ' ')}`)
    return { status: res.status, json, texto }
  } catch (e) {
    say(`\n[${rotulo}] FALHOU: ${e.name === 'AbortError' ? `sem resposta em ${TIMEOUT_MS / 1000}s` : e.message}`)
    say(`  URL: ${url}`)
    return { status: 0, json: null, texto: '' }
  } finally { clearTimeout(timer) }
}

function descrever(rotulo, json) {
  if (!json) return null
  const lista = Array.isArray(json) ? json : (json.data ?? json.content ?? json.items ?? null)
  say(`  Campos do topo: ${Array.isArray(json) ? '(lista direta)' : Object.keys(json).join(', ')}`)
  for (const k of ['totalRegistros', 'totalPaginas', 'numeroPagina', 'paginasRestantes', 'empty']) if (json[k] !== undefined) say(`  ${k}: ${json[k]}`)
  if (Array.isArray(lista)) {
    say(`  Itens nesta página: ${lista.length}`)
    if (lista[0]) {
      say(`  Campos de cada item: ${Object.keys(lista[0]).join(', ')}`)
      const a = lista[0]
      say(`  Exemplo: ${JSON.stringify({ numeroControlePNCP: a.numeroControlePNCP, objetoCompra: String(a.objetoCompra ?? '').slice(0, 120), uf: a.unidadeOrgao?.ufSigla, municipio: a.unidadeOrgao?.municipioNome, modalidade: a.modalidadeNome, valor: a.valorTotalEstimado, abertura: a.dataAberturaProposta, encerramento: a.dataEncerramentoProposta })}`)
    }
  }
  return Array.isArray(lista) ? lista : null
}

say(`Sonda PNCP — ${new Date().toISOString()} — base: ${BASE}`)

// 1) Propostas em aberto, PA, pregão eletrônico (6), data no formato AAAAMMDD
const q = (extra) => `${BASE}/consulta/v1/contratacoes/proposta?${new URLSearchParams({ pagina: '1', tamanhoPagina: '10', uf: 'PA', ...extra })}`
const t1 = await chamar('1 · AAAAMMDD + modalidade 6', q({ dataFinal: ymd(limite), codigoModalidadeContratacao: '6' }))
const lista1 = descrever('1', t1.json)
if (t1.json) fs.writeFileSync(`${PASTA}/sonda-pncp-proposta.json`, JSON.stringify(t1.json, null, 2))

// 2) Sem modalidade (para saber se ela é obrigatória)
await dormir(PAUSA_MS)
const t2 = await chamar('2 · AAAAMMDD sem modalidade', q({ dataFinal: ymd(limite) }))
descrever('2', t2.json)

// 3) Data no formato AAAA-MM-DD (só se a 1 não funcionou)
let t3 = null
if (t1.status !== 200 && t1.status !== 204) {
  await dormir(PAUSA_MS)
  t3 = await chamar('3 · AAAA-MM-DD + modalidade 6', q({ dataFinal: iso(limite), codigoModalidadeContratacao: '6' }))
  descrever('3', t3.json)
}

// 4) Itens da primeira compra encontrada
const base = lista1?.[0] ?? null
if (base?.orgaoEntidade?.cnpj && base.anoCompra && base.sequencialCompra) {
  await dormir(PAUSA_MS)
  const t4 = await chamar('4 · itens da 1ª compra', `${BASE}/pncp/v1/orgaos/${base.orgaoEntidade.cnpj}/compras/${base.anoCompra}/${base.sequencialCompra}/itens`)
  const itens = descrever('4', t4.json)
  if (itens?.[0]) say(`  1º item: ${JSON.stringify(itens[0]).slice(0, 400)}`)
  if (t4.json) fs.writeFileSync(`${PASTA}/sonda-pncp-itens.json`, JSON.stringify(t4.json, null, 2))
} else say('\n[4 · itens] pulado: nenhuma compra com cnpj/ano/sequencial para testar.')

fs.writeFileSync(`${PASTA}/sonda-pncp-resumo.txt`, resumo.join('\n'))
console.log(`\nResumo salvo em ${PASTA}/sonda-pncp-resumo.txt`)
