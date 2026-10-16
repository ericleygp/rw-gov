// Copia os arquivos dos editais abertos (PDFs, manifest e texto já lido) de dados-locais\editais
// para editais-publicos\, que pode ir ao GitHub. Assim o Claude do chat consegue ler os editais.
// Uso: node scripts/publicar-editais.mjs            (copia)
//      node scripts/publicar-editais.mjs --simular  (só mostra tamanho, não copia)
// Variáveis: MAX_ARQUIVO_MB (padrão 25) pula arquivos maiores que isso.
// Só editais públicos vão para essa pasta. dados-locais\ continua fora do GitHub.
import fs from 'node:fs'
import path from 'node:path'
import { naRegiao } from '../src/domain/regiao.js'
import { parseEditalRef } from './baixar-arquivos.mjs'

const ORIGEM = process.env.EDITAIS_DIR || 'dados-locais/editais'
const DESTINO = process.env.PUBLICOS_DIR || 'editais-publicos'
const ENTRADA = process.env.OPORTUNIDADES || 'public/dados-locais/oportunidades-reais.json'
const MAX_BYTES = Number(process.env.MAX_ARQUIVO_MB ?? 25) * 1024 * 1024
const simular = process.argv.includes('--simular')
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`

function main() {
  let dados
  try { dados = JSON.parse(fs.readFileSync(ENTRADA, 'utf8')) } catch { console.log(`Não encontrei ${ENTRADA}. Rode antes o motor de busca.`); return }
  const agora = Date.now()
  const abertas = (dados.oportunidades ?? []).filter((o) => naRegiao(o) && !(new Date(o.sessionAt).getTime() < agora))
  let editais = 0
  let arquivos = 0
  let bytes = 0
  const pulados = []
  for (const o of abertas) {
    const ref = parseEditalRef(o.link) ?? parseEditalRef(o.id)
    if (!ref) continue
    const nome = `${ref.cnpj}-${ref.ano}-${ref.seq}`
    const origem = path.join(ORIGEM, nome)
    if (!fs.existsSync(origem)) continue
    let copiouAlgum = false
    for (const arquivo of fs.readdirSync(origem)) {
      if (!/\.(pdf|json)$/i.test(arquivo)) continue
      const de = path.join(origem, arquivo)
      const tamanho = fs.statSync(de).size
      if (tamanho > MAX_BYTES) { pulados.push(`${nome}/${arquivo} (${mb(tamanho)})`); continue }
      if (!simular) {
        const para = path.join(DESTINO, nome, arquivo)
        fs.mkdirSync(path.dirname(para), { recursive: true })
        fs.copyFileSync(de, para)
      }
      arquivos += 1
      bytes += tamanho
      copiouAlgum = true
    }
    if (copiouAlgum) editais += 1
  }
  console.log(`${simular ? 'Simulação: ' : ''}${editais} edital(is) aberto(s), ${arquivos} arquivo(s), ${mb(bytes)}.`)
  for (const p of pulados) console.log(`  pulado por tamanho: ${p}`)
  if (!simular && arquivos > 0) console.log(`Copiado para ${DESTINO}\\. Agora é só: git add editais-publicos, commit e push.`)
}

main()
