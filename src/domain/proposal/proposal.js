// Proposta de preços: regras de cálculo (sem tela). Valores digitados ficam como texto (pt-BR) e são lidos aqui.
const round2 = (value) => Math.round(value * 100) / 100

// Aceita "1,50", "1.234,50", "1234.5" e vazio. Retorna null quando não for número.
export function parseDecimal(text) {
  const clean = String(text ?? '').trim().replace(/\s/g, '').replace(/^R\$/i, '')
  if (!clean) return null
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

export const formatDecimal = (value) => (value === null || value === undefined || !Number.isFinite(value) ? '' : value.toFixed(2).replace('.', ','))

// Itens vindos do arquivo do motor de busca -> formato usado pela proposta.
export function normalizeEditalItems(opportunityId, rawItems) {
  return rawItems.map((raw) => ({
    id: `${opportunityId}-${raw.numeroItem}`,
    number: raw.numeroItem,
    description: String(raw.descricao ?? ''),
    quantity: Number(raw.quantidade),
    unit: raw.unidade || '',
    referenceUnitValue: Number.isFinite(raw.valorUnitario) && raw.valorUnitario > 0 ? raw.valorUnitario : null,
    sigiloso: Boolean(raw.sigiloso),
    isService: raw.tipo === 'S',
    match: raw.match ?? null,
  }))
}

// Por padrão entram só os itens materiais que combinam com o catálogo; o resto o usuário marca se quiser.
export function initialLines(items) {
  return Object.fromEntries(items.map((item) => [item.id, { include: item.match?.nivel === 'provavel' && !item.isService, costText: '', priceText: '' }]))
}

export function lineMetrics(item, line) {
  const price = parseDecimal(line.priceText)
  const cost = parseDecimal(line.costText)
  const hasQty = Number.isFinite(item.quantity)
  const reference = item.referenceUnitValue
  return {
    price, cost, reference,
    total: price !== null && hasQty ? round2(item.quantity * price) : null,
    costTotal: cost !== null && hasQty ? round2(item.quantity * cost) : null,
    marginPct: price !== null && price > 0 && cost !== null ? ((price - cost) / price) * 100 : null,
    aboveReference: reference !== null && price !== null && price > reference + 1e-9,
    belowCost: cost !== null && price !== null && price < cost - 1e-9,
  }
}

export function summarize(items, lines) {
  const summary = { total: 0, included: 0, missingPrice: 0, aboveReference: 0, belowCost: 0, marginPct: null, discountPct: null }
  let sumPrice = 0
  let sumCost = 0
  let refPriced = 0
  let refReference = 0
  for (const item of items) {
    const line = lines[item.id]
    if (!line?.include) continue
    const m = lineMetrics(item, line)
    summary.included += 1
    if (m.price === null) summary.missingPrice += 1
    if (m.aboveReference) summary.aboveReference += 1
    if (m.belowCost) summary.belowCost += 1
    if (m.total !== null) summary.total = round2(summary.total + m.total)
    if (m.total !== null && m.costTotal !== null) { sumPrice += m.total; sumCost += m.costTotal }
    if (m.total !== null && m.reference !== null && Number.isFinite(item.quantity)) { refPriced += m.total; refReference += item.quantity * m.reference }
  }
  if (sumPrice > 0) summary.marginPct = ((sumPrice - sumCost) / sumPrice) * 100
  if (refReference > 0) summary.discountPct = (1 - refPriced / refReference) * 100
  return summary
}

// Margem sobre o preço de venda: preço = custo / (1 - margem).
export function priceFromMargin(cost, marginPct) {
  const margin = marginPct / 100
  if (cost === null || !(margin >= 0 && margin < 1)) return null
  return round2(cost / (1 - margin))
}

export function applyTargetMargin(items, lines, marginPct) {
  const next = { ...lines }
  for (const item of items) {
    const line = next[item.id]
    if (!line?.include) continue
    const price = priceFromMargin(parseDecimal(line.costText), marginPct)
    if (price !== null) next[item.id] = { ...line, priceText: formatDecimal(price) }
  }
  return next
}

// Preenche com o preço de venda do catálogo só onde ainda não há preço.
export function applyCatalogPrices(items, lines) {
  const next = { ...lines }
  for (const item of items) {
    const line = next[item.id]
    if (!line?.include || parseDecimal(line.priceText) !== null) continue
    const catalogPrice = parseDecimal(item.match?.precoVenda)
    if (catalogPrice !== null && catalogPrice > 0) next[item.id] = { ...line, priceText: formatDecimal(catalogPrice) }
  }
  return next
}

// CSV (separador ";", vírgula decimal) com os itens incluídos, para conferir ou copiar para o portal do pregão.
export function toCsv(items, lines) {
  const quote = (text) => `"${String(text ?? '').replace(/"/g, '""').replace(/\s+/g, ' ')}"`
  const rows = [['Item', 'Descrição', 'Unidade', 'Quantidade', 'Valor de referência unit.', 'Custo unit.', 'Preço unit. proposto', 'Total', 'Margem %', 'Produto do catálogo'].join(';')]
  for (const item of items) {
    const line = lines[item.id]
    if (!line?.include) continue
    const m = lineMetrics(item, line)
    rows.push([item.number, quote(item.description), quote(item.unit), String(item.quantity).replace('.', ','), formatDecimal(m.reference), formatDecimal(m.cost), formatDecimal(m.price), formatDecimal(m.total),
      m.marginPct === null ? '' : m.marginPct.toFixed(1).replace('.', ','), quote(item.match?.produto ?? '')].join(';'))
  }
  return rows.join('\r\n')
}
