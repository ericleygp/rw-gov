// Avalia a habilitação de todos os editais já baixados contra o perfil da empresa.
// Uso: node scripts/avaliar-habilitacao.mjs
// Saída: public/dados-locais/habilitacao-avaliada.json (fora do GitHub) e uma tabela no terminal.
import fs from 'node:fs'
import path from 'node:path'
import { avaliarHabilitacao, VEREDITO } from '../src/domain/edital/avaliacao.js'
import { extrairHabilitacao } from '../src/domain/edital/habilitacao.js'
import { lerManifesto, parseEditalRef, pastaDoEdital } from './baixar-arquivos.mjs'
import { lerPerfil } from './perfil-habilitacao.mjs'
import { textosDoEdital } from './texto-pdf.mjs'

const ENTRADA = process.env.OPORTUNIDADES || 'public/dados-locais/oportunidades-reais.json'
const SAIDA = process.env.HABILITACAO_SAIDA || 'public/dados-locais/habilitacao-avaliada.json'

async function main() {
  let dados
  try { dados = JSON.parse(fs.readFileSync(ENTRADA, 'utf8')) } catch { console.log(`Não encontrei ${ENTRADA}. Rode antes o motor de busca.`); return }
  const perfil = lerPerfil()
  const agora = Date.now()
  const resultado = {}
  for (const o of dados.oportunidades ?? []) {
    if (new Date(o.sessionAt).getTime() < agora) continue
    const ref = parseEditalRef(o.link) ?? parseEditalRef(o.id)
    const manifesto = ref && lerManifesto(ref)
    if (!manifesto) continue
    const textos = await textosDoEdital(pastaDoEdital(ref), manifesto.arquivos.filter((a) => a.arquivo))
    const hab = extrairHabilitacao(textos)
    const aval = avaliarHabilitacao(hab.exigencias, perfil, o.sessionAt)
    resultado[o.id] = {
      ref: `${ref.cnpj}/${ref.ano}/${ref.seq}`, orgao: o.agency ?? o.orgao ?? '', sessionAt: o.sessionAt, veredito: aval.veredito,
      faltam: aval.itens.filter((i) => i.status === 'falta').map((i) => i.rotulo),
      vencem: aval.itens.filter((i) => i.status === 'vence').map((i) => i.rotulo),
      conferir: aval.itens.filter((i) => ['conferir', 'sem_data'].includes(i.status)).map((i) => i.rotulo),
      editalEscaneado: hab.semTexto.length > 0 && hab.exigencias.length === 0,
    }
  }
  fs.mkdirSync(path.dirname(SAIDA), { recursive: true })
  fs.writeFileSync(SAIDA, JSON.stringify({ avaliadoEm: new Date().toISOString(), editais: resultado }, null, 1))
  const lista = Object.values(resultado).sort((a, b) => new Date(a.sessionAt) - new Date(b.sessionAt))
  console.log(`Habilitação avaliada em ${lista.length} edital(is) baixado(s).`)
  for (const r of lista) console.log(`- ${r.veredito.toUpperCase().padEnd(9)} ${String(r.sessionAt).slice(0, 10)} ${r.orgao} | faltam: ${r.faltam.join('; ') || 'nada'}${r.editalEscaneado ? ' | PDF escaneado' : ''}`)
  if (lista.length === 0) console.log(`(${VEREDITO.sem_dados})`)
}

await main()
