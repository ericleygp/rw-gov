import test from 'node:test'
import assert from 'node:assert/strict'
import { setRealData, isRealData } from './realData.js'
import { listOpportunities } from '../features/opportunities/repositories/opportunityRepository.js'
import { listMatchesByOpportunityId } from '../features/matching/repositories/matchRepository.js'

const dados = {
  geradoEm: '2026-10-07T20:00:00Z',
  oportunidades: [
    { id: 'pncp-1', processNumber: '1/2026', title: 'Material de expediente', agency: 'Prefeitura', city: 'Belém', state: 'PA', modality: 'Pregão - Eletrônico', status: 'Aberta', category: 'Não informado', estimatedValue: 0, publishedAt: 'não informado', sessionAt: '2099-01-01T09:00:00', itemCount: 10, summary: 'x', source: 'PNCP', capturedAt: '2026-10-07T20:00:00Z', dataConfidence: 'Oficial (PNCP)' },
    { id: 'pncp-2', title: 'sem prazo', sessionAt: null },
  ],
  itens: [{ id: 'pncp-1-1', opportunityId: 'pncp-1', itemNumber: 1, originalDescription: 'Caneta preta', quantity: 5, supplyUnit: 'UN', estimatedUnitValue: 1.5, match: { nivel: 'provavel', produto: 'CANETA BIC PRETA', estoque: '275', precoVenda: '1,50', codigo: '100' } }],
}

test('sem dados reais o app usa a base demonstrativa', () => {
  setRealData(null)
  assert.equal(isRealData(), false)
  assert.ok(listOpportunities()[0].id.startsWith('demo-'))
})

test('com dados reais: valor zero vira "não informado" e prazo inválido é descartado', () => {
  setRealData(dados)
  const list = listOpportunities()
  assert.equal(list.length, 1)
  assert.ok(Number.isNaN(list[0].estimatedValue))
  setRealData(null)
})

test('itens reais usam o match pré-calculado do motor de busca', () => {
  setRealData(dados)
  const [entry] = listMatchesByOpportunityId('pncp-1')
  assert.equal(entry.match.type, 'provavel')
  assert.equal(entry.product.name, 'CANETA BIC PRETA')
  assert.match(entry.match.justification, /275/)
  setRealData(null)
})
