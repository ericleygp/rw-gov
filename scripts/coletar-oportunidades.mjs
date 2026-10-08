// Passo 3: coleta as oportunidades abertas no PNCP (PA) e filtra pelo vocabulário de papelaria.
// Saída: dados-locais/oportunidades-abertas.json (e um resumo na tela).
import fs from 'node:fs'

const BASE = process.env.PNCP_BASE || 'https://pncp.gov.br/api'
const PAUSA_MS = Number(process.env.PNCP_PAUSA_MS ?? 1500)
const UF = process.env.PNCP_UF || 'PA'
const DIAS = Number(process.env.PNCP_DIAS ?? 60)
const MODALIDADES = (process.env.PNCP_MODALIDADES || '6,8').split(',') // 6 = pregão eletrônico, 8 = dispensa
const PASTA = 'dados-locais'

// Vocabulário (sem acento, minúsculo). Ajustável: depois ele passa a vir do catálogo.
const TERMOS = ['material de expediente', 'material de escritorio', 'papelaria', 'material escolar', 'material didatico',
  'material pedagogico', 'material de consumo', 'suprimentos de escritorio', 'artigos de escritorio', 'armarinho', 'aviamento',
  'artesanato', 'papel', 'caneta', 'lapis', 'caderno', 'pasta', 'envelope', 'grampeador', 'cola', 'tesoura', 'tinta para carimbo']

const sem = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const ymd = (d) => d.toISOString().slice(0, 10).replaceAll('-', '')

async function pagina(modalidade, n, tamanho) {
  const url = `${BASE}/consulta/v1/contratacoes/proposta?${new URLSearchParams({
    pagina: String(n), tamanhoPagina: String(tamanho), uf: UF,
    dataFinal: ymd(new Date(Date.now() + DIAS * 86400000)), codigoModalidadeContratacao: modalidade })}`
  for (let tentativa = 1; tentativa <= 4; tentativa += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90000), headers: { Accept: 'application/json' } })
      const texto = await res.text()
      if (res.status === 204 || !texto) return { data: [], totalPaginas: 0 }
      if (res.status === 400 && tamanho > 10) return pagina(modalidade, n, 10)
      if (res.status === 200) { try { return JSON.parse(texto) } catch { /* HTML: trata como limite */ } }
      throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      const espera = 15000 * tentativa
      console.log(`  aviso (${e.message}); nova tentativa em ${espera / 1000}s`)
      await dormir(process.env.PNCP_PAUSA_MS ? 50 : espera)
    }
  }
  throw new Error(`falha ao ler a página ${n} da modalidade ${modalidade}`)
}

const vistos = new Map()
for (const m of MODALIDADES) {
  console.log(`Modalidade ${m}: lendo...`)
  let tamanho = 50
  const p1 = await pagina(m, 1, tamanho)
  const total = p1.totalPaginas || 0
  const guardar = (r) => { for (const c of r.data || []) vistos.set(c.numeroControlePNCP, c) }
  guardar(p1)
  for (let n = 2; n <= total; n += 1) { await dormir(PAUSA_MS); guardar(await pagina(m, n, tamanho)); process.stdout.write(`  página ${n}/${total}\r`) }
  console.log(`  ${p1.totalRegistros ?? 0} registros na modalidade ${m}`)
}

const agora = Date.now()
const abertas = [...vistos.values()].filter((c) => !c.dataEncerramentoProposta || new Date(c.dataEncerramentoProposta).getTime() >= agora)
const resultado = []
for (const c of abertas) {
  const texto = sem(`${c.objetoCompra} ${c.informacaoComplementar ?? ''}`)
  const termos = TERMOS.filter((t) => new RegExp(`(^|[^a-z])${t}([^a-z]|$)`).test(texto))
  if (!termos.length) continue
  const cnpj = c.orgaoEntidade?.cnpj
  resultado.push({
    id: c.numeroControlePNCP, cnpj, ano: c.anoCompra, sequencial: c.sequencialCompra,
    orgao: c.orgaoEntidade?.razaoSocial, municipio: c.unidadeOrgao?.municipioNome, uf: c.unidadeOrgao?.ufSigla,
    modalidade: c.modalidadeNome, objeto: c.objetoCompra, valorEstimado: c.valorTotalEstimado ?? null,
    abertura: c.dataAberturaProposta, encerramento: c.dataEncerramentoProposta, termos,
    link: `https://pncp.gov.br/app/editais/${cnpj}/${c.anoCompra}/${c.sequencialCompra}`,
  })
}
resultado.sort((a, b) => String(a.encerramento).localeCompare(String(b.encerramento)))
fs.mkdirSync(PASTA, { recursive: true })
fs.writeFileSync(`${PASTA}/oportunidades-abertas.json`, JSON.stringify({ geradoEm: new Date().toISOString(), uf: UF, modalidades: MODALIDADES, lidas: vistos.size, abertas: abertas.length, oportunidades: resultado }, null, 2))

console.log(`\nLidas: ${vistos.size} · abertas: ${abertas.length} · com vocabulário de papelaria: ${resultado.length}`)
for (const r of resultado.slice(0, 15)) console.log(`- ${String(r.encerramento).slice(0, 10)} · ${r.municipio} · ${r.modalidade} · ${String(r.objeto).slice(0, 90)} [${r.termos.slice(0, 3).join(', ')}]`)
if (resultado.length > 15) console.log(`... e mais ${resultado.length - 15} em ${PASTA}/oportunidades-abertas.json`)
