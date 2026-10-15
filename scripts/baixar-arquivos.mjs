// Baixa os arquivos (Edital, Termo de Referência etc.) das compras do PNCP.
// Uso:
//   node scripts/baixar-arquivos.mjs 05059936000101/2026/38     -> um edital (CNPJ/ano/sequencial)
//   node scripts/baixar-arquivos.mjs                            -> todos de relevância alta/média em public/dados-locais/oportunidades-reais.json
// Saída: dados-locais/editais/<cnpj>-<ano>-<seq>/ (arquivos + manifest.json). A pasta dados-locais NÃO vai para o GitHub.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const BASE = process.env.PNCP_BASE || 'https://pncp.gov.br/api'
const PASTA = process.env.EDITAIS_DIR || 'dados-locais/editais'
const ENTRADA = process.env.OPORTUNIDADES || 'public/dados-locais/oportunidades-reais.json'
const PAUSA_MS = Number(process.env.PNCP_PAUSA_MS ?? 1000)
const MAX_EDITAIS = Number(process.env.BAIXAR_MAX ?? 40)
const MAX_BYTES = Number(process.env.BAIXAR_MAX_MB ?? 80) * 1024 * 1024

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

export function parseEditalRef(texto) {
  const m = String(texto ?? '').match(/(\d{14})[/-](\d{4})[/-](\d{1,7})(?!\d)/)
  return m ? { cnpj: m[1], ano: m[2], seq: String(Number(m[3])) } : null
}

export function slug(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'arquivo'
}

export function extensaoDe({ contentDisposition, contentType, bytes }) {
  const nome = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition ?? '')?.[1]
  const doNome = nome ? path.extname(decodeURIComponent(nome)).toLowerCase() : ''
  if (/^\.[a-z0-9]{2,5}$/.test(doNome)) return doNome
  if (bytes?.length >= 4) {
    if (bytes.subarray(0, 4).toString('latin1') === '%PDF') return '.pdf'
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) return '.zip'
  }
  const tipo = String(contentType ?? '').toLowerCase()
  if (tipo.includes('pdf')) return '.pdf'
  if (tipo.includes('zip')) return '.zip'
  return '.bin'
}

async function pedir(url, { json = false, tentativas = 3 } = {}) {
  for (let i = 1; i <= tentativas; i += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120000), headers: { Accept: json ? 'application/json' : '*/*' } })
      if (res.status === 204 || res.status === 400 || res.status === 404) return { status: res.status }
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`)
      const tamanho = Number(res.headers.get('content-length') ?? 0)
      if (!json && tamanho > MAX_BYTES) return { status: 413 }
      if (json) return { status: 200, json: JSON.parse(await res.text()) }
      return { status: 200, bytes: Buffer.from(await res.arrayBuffer()), headers: res.headers }
    } catch (e) {
      console.log(`  aviso (${e.message}); nova tentativa ${i}/${tentativas}`)
      await dormir(PAUSA_MS * i)
    }
  }
  return { status: 0 }
}

export function pastaDoEdital({ cnpj, ano, seq }) { return path.join(PASTA, `${cnpj}-${ano}-${seq}`) }

export function lerManifesto(ref) {
  try { return JSON.parse(fs.readFileSync(path.join(pastaDoEdital(ref), 'manifest.json'), 'utf8')) } catch { return null }
}

export async function baixarEdital({ cnpj, ano, seq }) {
  const id = `${cnpj}-${ano}-${seq}`
  const pasta = path.join(PASTA, id)
  const base = `${BASE}/pncp/v1/orgaos/${cnpj}/compras/${ano}/${seq}/arquivos`
  fs.mkdirSync(pasta, { recursive: true })
  const manifestoPath = path.join(pasta, 'manifest.json')
  let anterior = { arquivos: [] }
  try { anterior = JSON.parse(fs.readFileSync(manifestoPath, 'utf8')) } catch { /* primeira vez */ }

  const lista = await pedir(base, { json: true })
  if (lista.status !== 200 || !Array.isArray(lista.json)) {
    console.log(`  ${id}: lista de arquivos indisponível (status ${lista.status}).`)
    return { id, ok: false, novos: 0, total: 0 }
  }
  const docs = lista.json.filter((d) => d && d.statusAtivo !== false)
  const arquivos = []
  let novos = 0
  for (const [i, doc] of docs.entries()) {
    const seqDoc = doc.sequencialDocumento ?? doc.sequencialDocumentoId ?? i + 1
    const tipo = doc.tipoDocumentoNome || doc.tipoDocumentoDescricao || ''
    const titulo = doc.titulo || doc.nomeArquivo || ''
    const jaTem = anterior.arquivos?.find((a) => a.seq === seqDoc && a.arquivo && fs.existsSync(path.join(pasta, a.arquivo)))
    if (jaTem) { arquivos.push(jaTem); continue }
    const url = `${base}/${seqDoc}`
    const r = await pedir(url)
    const usarUrlDoPncp = r.status !== 200 && doc.url && /^https?:/.test(doc.url) && doc.url !== url
    const res = usarUrlDoPncp ? await pedir(doc.url) : r
    if (res.status !== 200) {
      console.log(`  ${id}: não baixou "${titulo || tipo}" (status ${res.status}).`)
      arquivos.push({ seq: seqDoc, titulo, tipo, arquivo: null, status: res.status })
      continue
    }
    const ext = extensaoDe({ contentDisposition: res.headers.get('content-disposition'), contentType: res.headers.get('content-type'), bytes: res.bytes })
    const nome = `${String(seqDoc).padStart(2, '0')}-${slug(tipo || titulo)}${ext}`
    fs.writeFileSync(path.join(pasta, nome), res.bytes)
    arquivos.push({ seq: seqDoc, titulo, tipo, arquivo: nome, bytes: res.bytes.length, status: 200 })
    novos += 1
    console.log(`  ${id}: ${nome} (${Math.round(res.bytes.length / 1024)} KB)`)
    await dormir(PAUSA_MS)
  }
  // PDFs tirados de ZIPs (scripts/extrair-zip.mjs) continuam registrados quando a lista é refeita.
  for (const extra of anterior.arquivos ?? []) {
    if (extra.origem && extra.arquivo && fs.existsSync(path.join(pasta, extra.arquivo)) && !arquivos.some((a) => a.arquivo === extra.arquivo)) arquivos.push(extra)
  }
  // "bruto" guarda exatamente o que o PNCP devolveu, para conferir o formato real se algo não bater.
  fs.writeFileSync(manifestoPath, JSON.stringify({ id, baixadoEm: new Date().toISOString(), arquivos, bruto: lista.json }, null, 1))
  return { id, ok: true, novos, total: arquivos.filter((a) => a.arquivo).length }
}

function editaisDoApp() {
  let dados
  try { dados = JSON.parse(fs.readFileSync(ENTRADA, 'utf8')) } catch { return [] }
  const agora = Date.now()
  return (dados.oportunidades ?? [])
    .filter((o) => ['alta', 'media', 'média'].includes(String(o.relevancia).toLowerCase()) && !(new Date(o.sessionAt).getTime() < agora))
    .sort((a, b) => new Date(a.sessionAt) - new Date(b.sessionAt))
    .map((o) => parseEditalRef(o.link) ?? parseEditalRef(o.id))
    .filter(Boolean)
    .slice(0, MAX_EDITAIS)
}

async function main() {
  const arg = process.argv[2]
  const refs = arg ? [parseEditalRef(arg)].filter(Boolean) : editaisDoApp()
  if (arg && refs.length === 0) { console.log('Use o formato CNPJ/ano/sequencial, por exemplo: 05059936000101/2026/38'); process.exitCode = 1; return }
  if (refs.length === 0) { console.log(`Nenhum edital para baixar (confira ${ENTRADA}).`); return }
  console.log(`Baixando arquivos de ${refs.length} edital(is) para ${PASTA}`)
  let novos = 0
  let falhas = 0
  for (const ref of refs) {
    const r = await baixarEdital(ref)
    novos += r.novos
    if (!r.ok) falhas += 1
    await dormir(PAUSA_MS)
  }
  console.log(`Concluído: ${novos} arquivo(s) novo(s); ${falhas} edital(is) sem lista de arquivos.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
