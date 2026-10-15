import test from 'node:test'
import assert from 'node:assert/strict'
import { classificarParticipacao } from './participacao.js'

test('edital pendente vira oportunidade e lista o que falta', () => {
  const p = classificarParticipacao({ veredito: 'pendente', faltam: ['Balanço patrimonial'] })
  assert.equal(p.grupo, 'oportunidade')
  assert.deepEqual(p.faltam, ['Balanço patrimonial'])
})

test('edital pronto ou com atenção é possível', () => {
  assert.equal(classificarParticipacao({ veredito: 'pronto' }).grupo, 'possivel')
  const a = classificarParticipacao({ veredito: 'atencao', vencem: ['FGTS'], conferir: ['Amostra'] })
  assert.equal(a.grupo, 'possivel')
  assert.deepEqual(a.conferir, ['FGTS', 'Amostra'])
})

test('sem avaliação ou sem dados não entra como possível', () => {
  assert.equal(classificarParticipacao(undefined).grupo, 'sem_avaliacao')
  assert.equal(classificarParticipacao({ veredito: 'sem_dados' }).grupo, 'sem_avaliacao')
})
