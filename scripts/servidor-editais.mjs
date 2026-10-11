// Mini-servidor local (só no "npm run dev"): deixa o app baixar e abrir os arquivos dos editais, sem usar o terminal.
import fs from 'node:fs'
import path from 'node:path'
import { extrairObservacoes } from '../src/domain/edital/observacoes.js'
import { textosDoEdital } from './texto-pdf.mjs'
import { baixarEdital, lerManifesto, parseEditalRef, pastaDoEdital } from './baixar-arquivos.mjs'

const emAndamento = new Map()

function resumo(ref) {
  const m = lerManifesto(ref)
  if (!m) return { baixado: false, arquivos: [] }
  const qs = (nome) => `/api/editais/arquivo?ref=${ref.cnpj}/${ref.ano}/${ref.seq}&nome=${encodeURIComponent(nome)}`
  return {
    baixado: true, baixadoEm: m.baixadoEm,
    arquivos: m.arquivos.filter((a) => a.arquivo).map((a) => ({ nome: a.arquivo, tipo: a.tipo, titulo: a.titulo, bytes: a.bytes, url: qs(a.arquivo) })),
    falhas: m.arquivos.filter((a) => !a.arquivo).length,
  }
}

const json = (res, status, corpo) => { res.statusCode = status; res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(corpo)) }

export async function tratarPedido(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const ref = parseEditalRef(url.searchParams.get('ref'))
  if (!ref) return json(res, 400, { erro: 'Edital inválido (use o link do PNCP).' })
  if (url.pathname === '/api/editais/arquivos' && req.method === 'GET') return json(res, 200, resumo(ref))
  if (url.pathname === '/api/editais/baixar' && req.method === 'POST') {
    const chave = `${ref.cnpj}-${ref.ano}-${ref.seq}`
    if (!emAndamento.has(chave)) emAndamento.set(chave, baixarEdital(ref).finally(() => emAndamento.delete(chave)))
    const r = await emAndamento.get(chave)
    return json(res, 200, { ...resumo(ref), ok: r.ok })
  }
  if (url.pathname === '/api/editais/observacoes' && req.method === 'GET') {
    const m = lerManifesto(ref)
    if (!m) return json(res, 200, { baixado: false, ...extrairObservacoes([]) })
    const textos = await textosDoEdital(pastaDoEdital(ref), m.arquivos.filter((a) => a.arquivo))
    return json(res, 200, { baixado: true, ...extrairObservacoes(textos) })
  }
  if (url.pathname === '/api/editais/arquivo' && req.method === 'GET') {
    const nome = url.searchParams.get('nome') ?? ''
    const m = lerManifesto(ref)
    const registrado = m?.arquivos.find((a) => a.arquivo === nome)
    const caminho = registrado ? path.join(pastaDoEdital(ref), registrado.arquivo) : null
    if (!caminho || !fs.existsSync(caminho)) return json(res, 404, { erro: 'Arquivo não encontrado.' })
    res.setHeader('content-type', nome.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream')
    res.setHeader('content-disposition', `inline; filename="${encodeURIComponent(nome)}"`)
    return fs.createReadStream(caminho).pipe(res)
  }
  return json(res, 404, { erro: 'Não encontrado.' })
}

export function editaisPlugin() {
  return {
    name: 'rw-gov-editais',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/editais/')) return next()
        tratarPedido(req, res).catch((e) => json(res, 500, { erro: e.message }))
      })
    },
  }
}
