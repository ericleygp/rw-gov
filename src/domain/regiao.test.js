import test from 'node:test'
import assert from 'node:assert/strict'
import { filtrarPorRegiao, naRegiao, regiaoAtiva, REGIOES } from './regiao.js'

const op = (city, state = 'PA') => ({ id: `${city}-${state}`, city, state })

test('a região metropolitana de Belém reconhece os municípios, com ou sem acento', () => {
  for (const cidade of ['Belém', 'BELEM', 'Ananindeua', 'Santa Bárbara do Pará', 'Santa Izabel do Pará', 'Santa Isabel do Pará', 'Castanhal', 'Barcarena']) {
    assert.equal(naRegiao(op(cidade), 'rmb'), true, cidade)
  }
})

test('fora da região ou de outro estado não entra', () => {
  assert.equal(naRegiao(op('Marabá'), 'rmb'), false)
  assert.equal(naRegiao(op('Belém', 'SP'), 'rmb'), false)
  assert.equal(naRegiao({}, 'rmb'), false)
})

test('ampliar a região: Pará inteiro e todas', () => {
  assert.equal(naRegiao(op('Marabá'), 'pa'), true)
  assert.equal(naRegiao(op('Campinas', 'SP'), 'pa'), false)
  assert.equal(naRegiao(op('Campinas', 'SP'), 'todas'), true)
})

test('filtrarPorRegiao mantém só os itens das oportunidades da região', () => {
  const dados = {
    oportunidades: [{ id: 'a', city: 'Belém', state: 'PA' }, { id: 'b', city: 'Marabá', state: 'PA' }],
    itens: [{ opportunityId: 'a' }, { opportunityId: 'b' }, { opportunityId: 'a' }],
  }
  const r = filtrarPorRegiao(dados, 'rmb')
  assert.equal(r.oportunidades.length, 1)
  assert.equal(r.itens.length, 2)
  assert.equal(r.regiao, 'rmb')
})

test('região padrão é a metropolitana de Belém', () => {
  assert.equal(regiaoAtiva(), 'rmb')
  assert.ok(REGIOES.rmb.municipios.includes('Barcarena'))
})
