import test from 'node:test'
import assert from 'node:assert/strict'
import { matchOpportunityItem, tokenize } from './matchEngine.js'
import { isPlaceholder } from './isPlaceholder.js'

const product = (name, overrides = {}) => ({
  id: name,
  name,
  description: 'Não informado',
  category: 'Escritório',
  subcategory: 'Papéis',
  unitOfSale: 'unidade',
  specifications: {},
  ...overrides,
})
const item = (description, overrides = {}) => ({
  id: 'item-test',
  originalDescription: description,
  normalizedDescription: description.toLocaleLowerCase('pt-BR'),
  declaredCategory: 'Escritório',
  supplyUnit: 'unidade',
  specifications: {},
  ...overrides,
})

// Keeps the original six scenario groups, updating their expected meaning for explicit validation.
test('exact match requires a specific name plus verified unit and requested specs', () => {
  const result = matchOpportunityItem(item('Caderno brochura', { specifications: { material: 'papel' } }), [product('Caderno brochura', { specifications: { material: 'papel' } })])
  assert.equal(result.match.type, 'exata')
  assert.deepEqual(result.match.validationPending, [])
})

test('missing requested specification changes direct name match to exact pending validation', () => {
  const result = matchOpportunityItem(item('Caderno brochura', { specifications: { material: 'papel' } }), [product('Caderno brochura')])
  assert.equal(result.match.type, 'exata_a_validar')
  assert.ok(result.match.validationPending.some((entry) => entry.includes('material')))
})

test('declared synonym returns equivalent', () => {
  const result = matchOpportunityItem(item('Prendedor de papel'), [product('Clips')])
  assert.equal(result.match.type, 'equivalente')
})

test('ambiguous broad description is not forced to a specific product', () => {
  const result = matchOpportunityItem(item('Material escolar diverso conforme necessidade', { declaredCategory: 'Material Escolar' }), [product('Lápis', { category: 'Material Escolar' }), product('Caderno', { category: 'Material Escolar' })])
  assert.equal(result.match.type, 'sem_cobertura')
})

test('item with no compatible product returns no catalog coverage', () => {
  const result = matchOpportunityItem(item('Livro de história infantil', { declaredCategory: 'Livros' }), [product('Pasta')])
  assert.equal(result.match.type, 'sem_cobertura')
  assert.equal(result.product, null)
})

test('unit conflict remains pending and prevents exact classification without conversion', () => {
  const result = matchOpportunityItem(item('Caderno brochura', { supplyUnit: 'caixa' }), [product('Caderno brochura', { unitOfSale: 'unidade' })])
  assert.equal(result.match.type, 'provavel')
  assert.ok(result.match.validationPending.some((entry) => entry.includes('nenhuma conversão')))
})

test('placeholders are recognized and never become tokens or false alternatives', () => {
  assert.equal(isPlaceholder('Não informado'), true)
  assert.equal(isPlaceholder('Não configurado'), true)
  assert.equal(isPlaceholder('A confirmar'), true)
  assert.equal(isPlaceholder('largura não informada'), true)
  assert.deepEqual(tokenize('Cola branca; Não informado'), ['cola', 'branca'])
  const result = matchOpportunityItem(item('Cola branca para uso escolar; conteúdo não informado', { declaredCategory: 'Material Escolar' }), [
    product('Cola', { category: 'Material Escolar' }),
    product('Apontador', { category: 'Material Escolar' }),
    product('Borracha', { category: 'Material Escolar' }),
  ])
  assert.equal(result.product.name, 'Cola')
  assert.deepEqual(result.alternatives, [])
})

test('exact classification accepts a fully specified test product', () => {
  const result = matchOpportunityItem(item('Papel A4 branco', { supplyUnit: 'resma', specifications: { cor: 'branca', dimensoes: 'A4' } }), [
    product('Papel A4', { unitOfSale: 'resma', specifications: { cor: 'branca', dimensoes: 'A4' } }),
  ])
  assert.equal(result.match.type, 'exata')
  assert.deepEqual(result.match.validationPending, [])
})

test('missing unit alone yields exact pending validation', () => {
  const result = matchOpportunityItem(item('Caderno brochura'), [product('Caderno brochura', { unitOfSale: 'Não informado' })])
  assert.equal(result.match.type, 'exata_a_validar')
  assert.ok(result.match.validationPending.some((entry) => entry.toLocaleLowerCase('pt-BR').includes('unidade')))
})

test('known conflicting specification prevents exact and exact pending validation', () => {
  const result = matchOpportunityItem(item('Papel A4 branco', { specifications: { cor: 'branca' } }), [product('Papel A4', { specifications: { cor: 'azul' } })])
  assert.equal(result.match.type, 'provavel')
  assert.ok(result.match.criteriaMet.some((entry) => entry.includes('conflito conhecido')))
})

test('generic product name with requested specs is only probable', () => {
  const result = matchOpportunityItem(item('Caneta esferográfica azul', { specifications: { cor: 'azul' } }), [product('Caneta', { specifications: { cor: 'Não informado' } })])
  assert.equal(result.match.type, 'provavel')
  assert.ok(result.match.validationPending.some((entry) => entry.includes('Nome genérico')))
})

test('book category without a catalog product has no coverage', () => {
  const result = matchOpportunityItem(item('Livro infantil brochura', { declaredCategory: 'Livros' }), [product('Papel cartão', { category: 'Papelaria Criativa' })])
  assert.equal(result.match.type, 'sem_cobertura')
})

test('a modifier word later in an item description is not treated as its product name', () => {
  const result = matchOpportunityItem(item('Pasta classificadora com elástico, tamanho ofício.', { specifications: { dimensoes: 'ofício' } }), [
    product('Pasta', { specifications: { dimensoes: 'Não informado' } }),
    product('Elástico', { category: 'Material Escolar' }),
  ])
  assert.equal(result.product.name, 'Pasta')
  assert.equal(result.match.type, 'provavel')
  assert.ok(result.alternatives.every((alternative) => alternative.product.name !== 'Elástico'))
})
