import test from 'node:test'
import assert from 'node:assert/strict'
import { setRealData } from '../../../data/realData.js'
import { listOpportunities } from './opportunityRepository.js'

test('o numero da compra, a UASG e o link do sistema chegam as telas', () => {
  setRealData({
    oportunidades: [{
      id: 'pncp-34621748000123-1-000582-2026', processNumber: '23073.084332/2026-28', title: 'Material', agency: 'UFPA', city: 'Belém', state: 'PA', modality: 'Dispensa', status: 'Aberta',
      category: 'Não informado', estimatedValue: 2787.75, publishedAt: '2026-10-15', sessionAt: '2026-10-21T09:00:00', itemCount: 20, summary: 'x', source: 'PNCP', capturedAt: '2026-10-15T16:16:00Z',
      dataConfidence: 'Oficial (PNCP)', ibge: '1501402', numeroCompra: '955', anoCompra: 2026, uasg: '153063', linkSistema: 'https://exemplo/compra', proposalOpensAt: '2026-10-16T12:00:00',
    }],
    itens: [],
  })
  const [item] = listOpportunities()
  assert.equal(item.numeroCompra, '955')
  assert.equal(item.uasg, '153063')
  assert.equal(item.linkSistema, 'https://exemplo/compra')
  assert.equal(item.proposalOpensAt, '2026-10-16T12:00:00')
  setRealData(null)
})

test('dados antigos, sem esses campos, continuam funcionando', () => {
  setRealData({
    oportunidades: [{ id: 'a', title: 'x', agency: 'y', city: 'Belém', state: 'PA', sessionAt: '2099-01-01T09:00:00', ibge: '1501402' }],
    itens: [],
  })
  const [item] = listOpportunities()
  assert.equal(item.numeroCompra, null)
  assert.equal(item.uasg, null)
  setRealData(null)
})
