import test from 'node:test'
import assert from 'node:assert/strict'
import { parseDecimal, formatDecimal, normalizeEditalItems, initialLines, lineMetrics, summarize, priceFromMargin, applyTargetMargin, applyCatalogPrices, toCsv } from './proposal.js'

const raw = [
  { numeroItem: 1, descricao: 'Caneta esferográfica preta', unidade: 'UNIDADE', quantidade: 100, valorUnitario: 2, sigiloso: false, tipo: 'M', match: { nivel: 'provavel', produto: 'CANETA BIC PRETA', estoque: '275', precoVenda: '1,50', codigo: '100' } },
  { numeroItem: 2, descricao: 'Café em pó "extra forte"', unidade: 'PACOTE', quantidade: 10, valorUnitario: null, sigiloso: true, tipo: 'M', match: null },
  { numeroItem: 3, descricao: 'Serviço de limpeza', unidade: 'MES', quantidade: 1, valorUnitario: 900, sigiloso: false, tipo: 'S', match: { nivel: 'provavel', produto: 'X', estoque: '1', precoVenda: '5,00', codigo: '9' } },
  { numeroItem: 4, descricao: 'Papel higiênico', unidade: 'ROLO', quantidade: 50, valorUnitario: 3, sigiloso: false, tipo: 'M', match: { nivel: 'possivel', produto: 'PAPEL PARANA 80', estoque: '16', precoVenda: '9,00', codigo: '7' } },
]
const items = normalizeEditalItems('pncp-1', raw)

test('lê números no formato brasileiro', () => {
  assert.equal(parseDecimal('1,50'), 1.5)
  assert.equal(parseDecimal('1.234,50'), 1234.5)
  assert.equal(parseDecimal('R$ 2,10'), 2.1)
  assert.equal(parseDecimal('3.5'), 3.5)
  assert.equal(parseDecimal(''), null)
  assert.equal(parseDecimal('abc'), null)
  assert.equal(formatDecimal(1.5), '1,50')
  assert.equal(formatDecimal(null), '')
})

test('normaliza itens: sigiloso vira sem referência e serviço é marcado', () => {
  assert.equal(items[1].referenceUnitValue, null)
  assert.equal(items[1].sigiloso, true)
  assert.equal(items[2].isService, true)
  assert.equal(items[0].id, 'pncp-1-1')
})

test('por padrão só entram itens materiais com correspondência provável', () => {
  const lines = initialLines(items)
  assert.equal(lines['pncp-1-1'].include, true)
  assert.equal(lines['pncp-1-2'].include, false)
  assert.equal(lines['pncp-1-3'].include, false)
  assert.equal(lines['pncp-1-4'].include, false)
})

test('margem, total e alertas por linha', () => {
  const m = lineMetrics(items[0], { include: true, costText: '1,00', priceText: '1,60' })
  assert.equal(m.total, 160)
  assert.equal(m.costTotal, 100)
  assert.equal(Math.round(m.marginPct * 10) / 10, 37.5)
  assert.equal(m.aboveReference, false)
  assert.equal(lineMetrics(items[0], { costText: '1,00', priceText: '2,50' }).aboveReference, true)
  assert.equal(lineMetrics(items[0], { costText: '1,00', priceText: '0,90' }).belowCost, true)
  assert.equal(lineMetrics(items[1], { costText: '', priceText: '10' }).aboveReference, false)
})

test('resumo: só conta itens incluídos e avisa o que falta', () => {
  const lines = initialLines(items)
  lines['pncp-1-2'] = { include: true, costText: '8,00', priceText: '' }
  lines['pncp-1-1'] = { include: true, costText: '1,00', priceText: '1,80' }
  const summary = summarize(items, lines)
  assert.equal(summary.included, 2)
  assert.equal(summary.missingPrice, 1)
  assert.equal(summary.total, 180)
  assert.equal(Math.round(summary.marginPct * 10) / 10, 44.4)
  assert.equal(Math.round(summary.discountPct * 10) / 10, 10)
})

test('preço a partir da margem sobre o preço de venda', () => {
  assert.equal(priceFromMargin(7, 30), 10)
  assert.equal(priceFromMargin(null, 30), null)
  assert.equal(priceFromMargin(7, 100), null)
  const lines = applyTargetMargin(items, { 'pncp-1-1': { include: true, costText: '7,00', priceText: '' }, 'pncp-1-2': { include: false, costText: '5', priceText: '' } }, 30)
  assert.equal(lines['pncp-1-1'].priceText, '10,00')
  assert.equal(lines['pncp-1-2'].priceText, '')
})

test('preço do catálogo só entra onde não há preço', () => {
  const base = { 'pncp-1-1': { include: true, costText: '', priceText: '' }, 'pncp-1-4': { include: true, costText: '', priceText: '5,00' }, 'pncp-1-2': { include: true, costText: '', priceText: '' } }
  const lines = applyCatalogPrices(items, base)
  assert.equal(lines['pncp-1-1'].priceText, '1,50')
  assert.equal(lines['pncp-1-4'].priceText, '5,00')
  assert.equal(lines['pncp-1-2'].priceText, '')
})

test('CSV só com itens incluídos, aspas e vírgula decimal', () => {
  const lines = { 'pncp-1-1': { include: true, costText: '1,00', priceText: '1,60' }, 'pncp-1-2': { include: true, costText: '', priceText: '9,90' }, 'pncp-1-4': { include: false, costText: '', priceText: '' } }
  const rows = toCsv(items, lines).split('\r\n')
  assert.equal(rows.length, 3)
  assert.match(rows[1], /^1;"Caneta esferográfica preta";"UNIDADE";100;2,00;1,00;1,60;160,00;37,5;"CANETA BIC PRETA"$/)
  assert.match(rows[2], /"Café em pó ""extra forte"""/)
})
