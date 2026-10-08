// Dados reais (PNCP) gerados por scripts/motor-busca.mjs e lidos de /dados-locais/oportunidades-reais.json.
// Sem o arquivo, o app continua com a base demonstrativa.
let realData = null

export function setRealData(data) {
  realData = data && Array.isArray(data.oportunidades) && data.oportunidades.length > 0 && Array.isArray(data.itens) ? data : null
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
