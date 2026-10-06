const unknown = 'Não informado'
const numberFormat = new Intl.NumberFormat('pt-BR')
const currencyFormat = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatStock(value) {
  return typeof value === 'number' ? numberFormat.format(value) : value ?? unknown
}

export function formatCurrency(value) {
  return typeof value === 'number' ? currencyFormat.format(value) : value ?? unknown
}
