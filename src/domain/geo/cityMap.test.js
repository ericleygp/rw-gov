import test from 'node:test'
import assert from 'node:assert/strict'
import { STORE, distanceKm, bandFor, scoreCity, potentialValueOf, buildCityMap, normalizeName } from './cityMap.js'

const municipalities = [['1501303', 'Barcarena', -1.51187, -48.6195], ['1501402', 'Belém', -1.4554, -48.4898], ['1507904', 'Santarém', -2.4431, -54.7083], ['1507300', 'São Félix do Xingu', -6.6447, -51.9947]]
const futuro = '2099-01-01T09:00:00'
const opp = (id, city, extra = {}) => ({ id, city, sessionAt: futuro, produtosDistintos: 10, ...extra })

test('distância Barcarena–Belém é de poucas dezenas de km', () => {
  const km = distanceKm(STORE, { lat: -1.4554, lon: -48.4898 })
  assert.ok(km > 15 && km < 40, `km=${km}`)
})

test('normaliza nomes com acento e caixa', () => {
  assert.equal(normalizeName('  Santo ANTÔNIO do Tauá '), 'santo antonio do taua')
})

test('faixas de cor respeitam os limiares', () => {
  assert.equal(bandFor(100).key, 'muito')
  assert.equal(bandFor(70).key, 'muito')
  assert.equal(bandFor(69).key, 'boa')
  assert.equal(bandFor(45).key, 'boa')
  assert.equal(bandFor(44).key, 'possivel')
  assert.equal(bandFor(25).key, 'possivel')
  assert.equal(bandFor(24).key, 'baixa')
  assert.equal(bandFor(0).key, 'baixa')
})

test('índice fica entre 0 e 100 e perto/afinidade alta pontuam mais', () => {
  const forte = scoreCity({ opportunities: [{ produtosDistintos: 47 }], potentialValue: 2_000_000, km: 80 })
  const fraco = scoreCity({ opportunities: [{ produtosDistintos: 1 }], potentialValue: 0, km: 900 })
  assert.equal(forte.score, 100)
  assert.ok(fraco.score >= 0 && fraco.score < 10)
  const perto = scoreCity({ opportunities: [{ produtosDistintos: 5 }], potentialValue: 100000, km: 100 })
  const longe = scoreCity({ opportunities: [{ produtosDistintos: 5 }], potentialValue: 100000, km: 700 })
  assert.ok(perto.score > longe.score)
})

test('valor potencial soma só itens prováveis com valores numéricos', () => {
  const total = potentialValueOf([
    { quantity: 10, estimatedUnitValue: 2, match: { nivel: 'provavel' } },
    { quantity: 5, estimatedUnitValue: 4, match: { nivel: 'possivel' } },
    { quantity: 5, estimatedUnitValue: 'não informado', match: { nivel: 'provavel' } },
  ])
  assert.equal(total, 20)
})

test('junta por código IBGE e, na falta dele, pelo nome; lista o que não achou', () => {
  const result = buildCityMap({
    municipalities,
    opportunities: [opp('a', 'qualquer', { ibge: '1501402' }), opp('b', 'SANTARÉM'), opp('c', 'Cidade Inexistente'), opp('d', 'Belém', { sessionAt: '2020-01-01T09:00:00' })],
    items: [{ opportunityId: 'a', quantity: 10, estimatedUnitValue: 100, match: { nivel: 'provavel' } }],
    now: new Date('2026-10-08T12:00:00'),
  })
  assert.deepEqual(result.cities.map((city) => city.name).sort(), ['Belém', 'Santarém'])
  assert.deepEqual(result.unresolved, ['Cidade Inexistente'])
  assert.equal(result.cities.find((city) => city.name === 'Belém').potentialValue, 1000)
  assert.equal(result.cities.find((city) => city.name === 'Belém').opportunities.length, 1)
  assert.equal(result.municipalitiesWithoutOpportunity.length, 2)
})

test('se código IBGE e nome divergem, vale o nome do edital', () => {
  const result = buildCityMap({ municipalities, opportunities: [opp('a', 'Santarém', { ibge: '1501402' })], now: new Date('2026-10-08T12:00:00') })
  assert.deepEqual(result.cities.map((city) => city.name), ['Santarém'])
})

test('com código válido e nome não encontrado, usa o código', () => {
  const result = buildCityMap({ municipalities, opportunities: [opp('a', 'Grafia Diferente', { ibge: '1501402' })], now: new Date('2026-10-08T12:00:00') })
  assert.deepEqual(result.cities.map((city) => city.name), ['Belém'])
})
