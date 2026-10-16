// Dados reais (PNCP) gerados por scripts/motor-busca.mjs e lidos de /dados-locais/oportunidades-reais.json.
// Sem o arquivo, o app continua com a base demonstrativa.
import { filtrarPorRegiao } from '../domain/regiao.js'

let realData = null

export function setRealData(data) {
  const valido = data && Array.isArray(data.oportunidades) && data.oportunidades.length > 0 && Array.isArray(data.itens)
  // Só a região de atuação (src/domain/regiao.js) chega às telas.
  realData = valido ? filtrarPorRegiao(data) : null
}

export function getRealData() { return realData }

export function isRealData() { return realData !== null }

export async function loadRealData(url = `${import.meta.env?.BASE_URL ?? '/'}dados-locais/oportunidades-reais.json`) {
  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) return false
    setRealData(JSON.parse(await response.text()))
    return isRealData()
  } catch { return false }
}

// Veredito de habilitação por edital (scripts/avaliar-habilitacao.mjs). Opcional: sem o arquivo, nada é classificado.
let habilitacao = null

export function setHabilitacao(data) {
  habilitacao = data && typeof data.editais === 'object' && data.editais !== null ? data : null
}

export function getHabilitacao(id) { return habilitacao?.editais?.[id] ?? null }

export function temHabilitacao() { return habilitacao !== null && Object.keys(habilitacao.editais).length > 0 }

export async function loadHabilitacao(url = `${import.meta.env?.BASE_URL ?? '/'}dados-locais/habilitacao-avaliada.json`) {
  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) return false
    setHabilitacao(JSON.parse(await response.text()))
    return temHabilitacao()
  } catch { return false }
}
