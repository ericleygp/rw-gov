// Confere, para cada oportunidade futura do Radar, se os arquivos do edital foram baixados e lidos.
// Tenta baixar de novo o que faltou (limite por rodada) e grava o motivo de cada "sem dados".
// Uso: node scripts/verificar-cobertura.mjs
// Saída: public/dados-locais/cobertura-editais.json (fora do GitHub) e um resumo no terminal.
// Variáveis: COBERTURA_MAX_TENTATIVAS (padrão 30; 0 = só conferir, sem baixar).
import fs from 'node:fs'
import path from 'node:path'
import { naRegiao } from '../src/domain/regiao.js'
import { classificarCobertura } from '../src/domain/edital/cobertura.js'
import { extrairHabilitacao } from '../src/domain/edital/habilitacao.js'
import { baixarEdital, lerManifesto, parseEditalRef, pastaDoEdital } from './baixar-arquivos.mjs'
import { extrairZips } from './extrair-zip.mjs'
import { textosDoEdital } from './texto-pdf.mjs'

const ENTRADA = process.env.OPORTUNIDADES || 'public/dados-locais/oportunidades-reais.json'
const SAIDA = process.env.COBERTURA_SAIDA || 'public/dados-locais/cobertura-editais.json'
const MAX_TENTATIVAS = Number(process.env.COBERTURA_MAX_TENTATIVAS ?? 30)
const REBAIXAR = ['nao_baixado', 'falha_lista', 'sem_arquivos_pncp', 'falha_download']

async function main() {
  let dados
  try { dados = JSON.parse(fs.readFileSync(ENTRADA, 'utf8')) } catch { console.log(`Não encontrei ${ENTRADA}. Rode antes o motor de busca.`); return }
  const agora = Date.now()
  const futuras = (dados.oportunidades ?? [])
    .filter((o) => naRegiao(o) && !(new Date(o.sessionAt).getTime() < agora))
    .sort((a, b) => new Date(a.sessionAt) - new Date(b.sessionAt))

  let tentativas = 0
  const editais = {}
  for (const o of futuras) {
    const ref = parseEditalRef(o.link) ?? parseEditalRef(o.id)
    let falhaLista = false
    let zipSemPdf = false
    const avaliar = () => classificarCobertura({ ref, manifesto: ref && lerManifesto(ref), falhaLista, zipSemPdf })
    let cobertura = await avaliar()
    if (ref && REBAIXAR.includes(cobertura.status) && tentativas < MAX_TENTATIVAS) {
      tentativas += 1
      console.log(`Tentando baixar de novo: ${ref.cnpj}/${ref.ano}/${ref.seq} (${cobertura.rotulo})`)
      const r = await baixarEdital(ref)
      falhaLista = !r.ok
      cobertura = await avaliar()
    }
    if (ref && cobertura.status === 'sem_pdf') {
      console.log(`Abrindo ZIP: ${ref.cnpj}/${ref.ano}/${ref.seq}`)
      zipSemPdf = (await extrairZips(ref)).semPdf
      cobertura = await avaliar()
    }
    if (ref && ['escaneado', 'sem_palavras_chave', 'ok'].includes(cobertura.status)) {
      const manifesto = lerManifesto(ref)
      const textos = await textosDoEdital(pastaDoEdital(ref), manifesto.arquivos.filter((a) => a.arquivo))
      cobertura = classificarCobertura({ ref, manifesto, textos, exigencias: extrairHabilitacao(textos).exigencias })
    }
    editais[o.id] = { ref: ref ? `${ref.cnpj}/${ref.ano}/${ref.seq}` : null, orgao: o.agency ?? o.orgao ?? '', sessionAt: o.sessionAt, ...cobertura }
  }

  const resumo = {}
  for (const e of Object.values(editais)) resumo[e.status] = (resumo[e.status] ?? 0) + 1
  fs.mkdirSync(path.dirname(SAIDA), { recursive: true })
  fs.writeFileSync(SAIDA, JSON.stringify({ verificadoEm: new Date().toISOString(), resumo, editais }, null, 1))

  console.log(`Cobertura dos editais: ${Object.keys(editais).length} oportunidade(s) futura(s).`)
  for (const [status, n] of Object.entries(resumo)) console.log(`- ${status}: ${n}`)
  const problemas = Object.values(editais).filter((e) => e.status !== 'ok')
  for (const e of problemas.slice(0, 15)) console.log(`  ${String(e.sessionAt).slice(0, 10)} ${e.orgao} | ${e.rotulo}: ${e.motivo}`)
}

await main()
