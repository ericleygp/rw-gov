// Pega UM edital de ponta a ponta: acha no PNCP, baixa os arquivos, lê o texto,
// copia para editais-publicos\ e (se quiser) faz commit e push para o GitHub.
// Uso:
//   node scripts/pegar-edital.mjs 925848 17/2026                 -> UASG + número/ano do pregão
//   node scripts/pegar-edital.mjs https://pncp.gov.br/app/editais/CNPJ/2026/38
//   node scripts/pegar-edital.mjs 05059936000101/2026/38        -> CNPJ/ano/sequencial
// Opções: --sem-git (só baixa e copia)  --uf=PA  --modalidade=6 (6 = pregão eletrônico, 8 = dispensa)
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { baixarEdital, lerManifesto, pastaDoEdital, parseEditalRef } from './baixar-arquivos.mjs'
import { extrairZips } from './extrair-zip.mjs'
import { textosDoEdital } from './texto-pdf.mjs'

const BASE = process.env.PNCP_BASE || 'https://pncp.gov.br/api'
const DESTINO = process.env.PUBLICOS_DIR || 'editais-publicos'
const ENTRADA = process.env.OPORTUNIDADES || 'public/dados-locais/oportunidades-reais.json'
const MAX_BYTES = Number(process.env.MAX_ARQUIVO_MB ?? 25) * 1024 * 1024
const PAUSA_MS = Number(process.env.PNCP_PAUSA_MS ?? 1000)
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const ymd = (d) => d.toISOString().slice(0, 10).replaceAll('-', '')

// "17/2026", "17-2026", "00017/2026" -> { numero: 17, ano: 2026 }
export function parseNumeroAno(texto) {
  const m = String(texto ?? '').match(/(\d{1,7})\s*[/-]\s*(\d{4})(?!\d)/)
  return m ? { numero: Number(m[1]), ano: Number(m[2]) } : null
}

export function lerArgumentos(argv) {
  const opcoes = { git: true, uf: 'PA', modalidade: '6' }
  const livres = []
  for (const a of argv) {
    if (a === '--sem-git') opcoes.git = false
    else if (a.startsWith('--uf=')) opcoes.uf = a.slice(5).toUpperCase()
    else if (a.startsWith('--modalidade=')) opcoes.modalidade = a.slice(13)
    else livres.push(a)
  }
  const ref = livres.map(parseEditalRef).find(Boolean)
  if (ref) return { ...opcoes, ref }
  const uasg = livres.find((t) => /^\d{5,7}$/.test(t))
  const na = parseNumeroAno(livres.filter((t) => t !== uasg).join(' '))
  if (uasg && na) return { ...opcoes, uasg, ...na }
  return { ...opcoes, erro: true }
}

// Procura, numa lista de compras do PNCP, a que tem a UASG e o número/ano pedidos.
export function acharCompra(compras, { uasg, numero, ano }) {
  return (compras ?? []).find((c) => {
    const u = String(c.unidadeOrgao?.codigoUnidade ?? '')
    const n = parseNumeroAno(`${c.numeroCompra}/${c.anoCompra}`)
    return u === String(uasg) && n && n.numero === numero && Number(c.anoCompra) === ano
  }) ?? null
}

export const refDaCompra = (c) => ({ cnpj: c.orgaoEntidade.cnpj, ano: String(c.anoCompra), seq: String(c.sequencialCompra) })

function procurarNoArquivoLocal({ uasg, numero, ano }) {
  try {
    const dados = JSON.parse(fs.readFileSync(ENTRADA, 'utf8'))
    const o = (dados.oportunidades ?? []).find((x) => String(x.uasg) === String(uasg) && parseNumeroAno(`${x.numeroCompra}/${x.anoCompra}`)?.numero === numero && Number(x.anoCompra) === ano)
    return o ? (parseEditalRef(o.link) ?? parseEditalRef(o.id)) : null
  } catch { return null }
}

async function pedirJson(url) {
  for (let i = 1; i <= 3; i += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90000), headers: { Accept: 'application/json' } })
      if (res.status === 204 || res.status === 400 || res.status === 404) return { status: res.status, json: null }
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`)
      return { status: 200, json: JSON.parse(await res.text()) }
    } catch (e) {
      console.log(`  aviso (${e.message}); nova tentativa ${i}/3`)
      await dormir(PAUSA_MS * i * 3)
    }
  }
  return { status: 0, json: null }
}

// Pregões com proposta aberta no PNCP, página por página, até achar a compra pedida.
async function procurarNoPncp({ uasg, numero, ano, uf, modalidade }) {
  let tamanho = 50
  for (let n = 1; n <= 200; n += 1) {
    const q = () => `${BASE}/consulta/v1/contratacoes/proposta?${new URLSearchParams({
      pagina: String(n), tamanhoPagina: String(tamanho), uf, codigoModalidadeContratacao: modalidade,
      dataFinal: ymd(new Date(Date.now() + 120 * 86400000)), codigoUnidadeAdministrativa: String(uasg),
    })}`
    let r = await pedirJson(q())
    if (r.status === 400 && tamanho > 10) { tamanho = 10; r = await pedirJson(q()) }
    if (r.status === 0) throw new Error('Não consegui falar com o PNCP (internet ou portal fora do ar). Tente de novo em alguns minutos.')
    if (!r.json) return null
    const achou = acharCompra(r.json.data, { uasg, numero, ano })
    if (achou) return refDaCompra(achou)
    process.stdout.write(`  página ${n}/${r.json.totalPaginas ?? '?'}\r`)
    if (n >= (r.json.totalPaginas || 0)) return null
    await dormir(PAUSA_MS)
  }
  return null
}

export function publicar(ref, origemBase = process.env.EDITAIS_DIR || 'dados-locais/editais') {
  const nome = `${ref.cnpj}-${ref.ano}-${ref.seq}`
  const origem = path.join(origemBase, nome)
  if (!fs.existsSync(origem)) return { arquivos: 0, pulados: [] }
  const pulados = []
  let arquivos = 0
  for (const arq of fs.readdirSync(origem)) {
    if (!/\.(pdf|json)$/i.test(arq)) continue
    const de = path.join(origem, arq)
    if (fs.statSync(de).size > MAX_BYTES) { pulados.push(arq); continue }
    const para = path.join(DESTINO, nome, arq)
    fs.mkdirSync(path.dirname(para), { recursive: true })
    fs.copyFileSync(de, para)
    arquivos += 1
  }
  return { arquivos, pulados, nome }
}

function git(...args) { return execFileSync('git', args, { encoding: 'utf8' }).trim() }

async function main() {
  const a = lerArgumentos(process.argv.slice(2))
  if (a.erro) {
    console.log('Use um destes formatos:\n  node scripts/pegar-edital.mjs 925848 17/2026\n  node scripts/pegar-edital.mjs https://pncp.gov.br/app/editais/CNPJ/ANO/SEQ')
    process.exitCode = 1
    return
  }
  let ref = a.ref ?? procurarNoArquivoLocal(a)
  if (!ref) {
    console.log(`Procurando o pregão ${a.numero}/${a.ano} da UASG ${a.uasg} no PNCP (UF ${a.uf})...`)
    ref = await procurarNoPncp(a)
    console.log()
  }
  if (!ref) {
    console.log('Não achei esse edital no PNCP. Confira a UASG e o número, ou use o link do PNCP (https://pncp.gov.br/app/editais/CNPJ/ANO/SEQ).')
    process.exitCode = 1
    return
  }
  console.log(`Edital no PNCP: ${ref.cnpj}/${ref.ano}/${ref.seq}`)
  const r = await baixarEdital(ref)
  if (!r.ok) { console.log('O PNCP não devolveu a lista de arquivos. Tente de novo mais tarde.'); process.exitCode = 1; return }
  try { await extrairZips(ref) } catch (e) { console.log(`  aviso: não abri os ZIPs (${e.message})`) }
  const manifesto = lerManifesto(ref)
  try { await textosDoEdital(pastaDoEdital(ref), (manifesto?.arquivos ?? []).filter((x) => x.arquivo)) } catch (e) { console.log(`  aviso: não li o texto dos PDFs (${e.message})`) }
  const p = publicar(ref)
  console.log(`Copiados ${p.arquivos} arquivo(s) para ${DESTINO}\\${p.nome ?? ''}`)
  for (const x of p.pulados) console.log(`  pulado por tamanho: ${x}`)
  if (p.arquivos === 0) return
  if (!a.git) { console.log('Sem git (--sem-git). Para enviar: git add editais-publicos, commit e push.'); return }
  git('add', path.join(DESTINO, p.nome))
  if (!git('status', '--porcelain', '--', path.join(DESTINO, p.nome))) { console.log('Nada novo para enviar ao GitHub.'); return }
  git('commit', '-m', `Adiciona edital ${ref.cnpj}/${ref.ano}/${ref.seq}`)
  git('push')
  console.log('Enviado ao GitHub. Pode avisar o Claude do chat.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
