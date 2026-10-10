// Mapa de oportunidades: junta as oportunidades com os municípios do Pará e calcula o índice de recomendação.
// Índice (0 a 100) = 55 pts afinidade com o catálogo + 25 pts valor potencial + 20 pts proximidade da loja.
export const STORE = { name: 'Barcarena', ibge: '1501303', lat: -1.51187, lon: -48.6195 }

export const WEIGHTS = { fit: 55, value: 25, proximity: 20 }
// Limiares: ajustáveis conforme a experiência de uso.
export const BANDS = [
  { key: 'muito', label: 'Muito recomendada', min: 70, color: '#0f6b4a' },
  { key: 'boa', label: 'Recomendada', min: 45, color: '#4fb286' },
  { key: 'possivel', label: 'Possível', min: 25, color: '#e3b33a' },
  { key: 'baixa', label: 'Pouco indicada', min: 0, color: '#9aa5a0' },
]

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function normalizeName(text) {
  return String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

// Distância em linha reta (haversine), em km. Não considera estradas nem rios.
export function distanceKm(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

export function bandFor(score) {
  return BANDS.find((band) => score >= band.min) ?? BANDS[BANDS.length - 1]
}

export function scoreCity({ opportunities, potentialValue, km }) {
  const bestDistinct = Math.max(0, ...opportunities.map((item) => Number(item.produtosDistintos) || 0))
  const fit = clamp(bestDistinct / 25 + 0.1 * Math.max(0, opportunities.length - 1), 0, 1)
  const value = clamp(Math.sqrt(Math.max(0, potentialValue) / 1_000_000), 0, 1)
  const proximity = 1 - clamp((km - 100) / 700, 0, 1)
  const parts = { fit: WEIGHTS.fit * fit, value: WEIGHTS.value * value, proximity: WEIGHTS.proximity * proximity }
  const score = Math.round(parts.fit + parts.value + parts.proximity)
  return { score, band: bandFor(score), parts }
}

// Valor potencial = soma de quantidade x valor unitário estimado dos itens com correspondência "provável".
export function potentialValueOf(items) {
  return items.reduce((total, item) => {
    const amount = Number(item.quantity) * Number(item.estimatedUnitValue)
    return item.match?.nivel === 'provavel' && Number.isFinite(amount) && amount > 0 ? total + amount : total
  }, 0)
}

export function buildCityMap({ municipalities, opportunities, items = [], now = new Date() }) {
  const byCode = new Map(municipalities.map(([ibge, name, lat, lon]) => [String(ibge), { ibge: String(ibge), name, lat, lon }]))
  const byName = new Map([...byCode.values()].map((city) => [normalizeName(city.name), city]))
  const itemsByOpportunity = new Map()
  for (const item of items) itemsByOpportunity.set(item.opportunityId, [...(itemsByOpportunity.get(item.opportunityId) ?? []), item])

  const grouped = new Map()
  const unresolved = []
  for (const opportunity of opportunities) {
    if (new Date(opportunity.sessionAt).getTime() < now.getTime()) continue
    // Código IBGE e nome vêm do mesmo registro do PNCP. Se divergirem, vale o nome que aparece no edital.
    const cityByCode = byCode.get(String(opportunity.ibge ?? ''))
    const cityByName = byName.get(normalizeName(opportunity.city))
    const city = cityByCode && cityByName && cityByCode !== cityByName ? cityByName : (cityByCode ?? cityByName)
    if (!city) { unresolved.push(opportunity.city || 'município não informado'); continue }
    grouped.set(city.ibge, [...(grouped.get(city.ibge) ?? []), opportunity])
  }

  const cities = [...grouped.entries()].map(([ibge, list]) => {
    const city = byCode.get(ibge)
    const km = distanceKm(STORE, city)
    const potentialValue = list.reduce((total, opportunity) => total + potentialValueOf(itemsByOpportunity.get(opportunity.id) ?? []), 0)
    return { ...city, km, opportunities: list, potentialValue, ...scoreCity({ opportunities: list, potentialValue, km }) }
  }).sort((a, b) => b.score - a.score || b.potentialValue - a.potentialValue)

  return { cities, unresolved: [...new Set(unresolved)], municipalitiesWithoutOpportunity: [...byCode.values()].filter((city) => !grouped.has(city.ibge)) }
}
