// Região de atuação do app. Para ampliar depois, é só adicionar uma região abaixo
// (ou usar 'pa' / 'todas') e trocar REGIAO_PADRAO; nada mais no código muda.
// Pode ser trocada sem editar código: variável REGIAO (scripts) ou VITE_REGIAO (app).
export const REGIOES = {
  rmb: {
    nome: 'Região Metropolitana de Belém',
    uf: 'PA',
    municipios: ['Belém', 'Ananindeua', 'Marituba', 'Benevides', 'Santa Bárbara do Pará', 'Santa Izabel do Pará', 'Castanhal', 'Barcarena'],
  },
  pa: { nome: 'Pará', uf: 'PA', municipios: null },
  todas: { nome: 'Todo o Brasil', uf: null, municipios: null },
}

export const REGIAO_PADRAO = 'rmb'

const semAcento = (texto) => String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
// "Santa Izabel" e "Santa Isabel" aparecem nas duas grafias.
const chave = (texto) => semAcento(texto).replace('isabel', 'izabel')

export function regiaoAtiva() {
  const pedida = (typeof process !== 'undefined' && process.env?.REGIAO) || import.meta.env?.VITE_REGIAO
  return REGIOES[pedida] ? pedida : REGIAO_PADRAO
}

export function nomeDaRegiao(id = regiaoAtiva()) { return REGIOES[id]?.nome ?? '' }

export function naRegiao(oportunidade, id = regiaoAtiva()) {
  const regiao = REGIOES[id]
  if (!regiao) return true
  if (regiao.uf && String(oportunidade?.state ?? '').toUpperCase() !== regiao.uf) return false
  if (!regiao.municipios) return true
  const cidade = chave(oportunidade?.city)
  return regiao.municipios.some((m) => chave(m) === cidade)
}

// Mantém só as oportunidades da região e os itens que pertencem a elas.
export function filtrarPorRegiao(dados, id = regiaoAtiva()) {
  if (!dados) return dados
  const oportunidades = (dados.oportunidades ?? []).filter((o) => naRegiao(o, id))
  const ids = new Set(oportunidades.map((o) => o.id))
  const itens = (dados.itens ?? []).filter((item) => ids.has(item.opportunityId))
  return { ...dados, oportunidades, itens, regiao: id }
}
