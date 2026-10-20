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

test('plataforma sem cadastro tira o edital de "possíveis agora"', () => {
  const sem = { nome: 'Portal de cotação do Banpará', status: 'nao' }
  const p = classificarParticipacao({ veredito: 'pronto' }, sem)
  assert.equal(p.grupo, 'oportunidade')
  assert.match(p.faltam[0], /Cadastro em Portal de cotação do Banpará/)
})

test('plataforma a confirmar mantém possível e pede conferência', () => {
  const p = classificarParticipacao({ veredito: 'pronto' }, { nome: 'BLL Compras', status: 'verificar' })
  assert.equal(p.grupo, 'possivel')
  assert.match(p.conferir[0], /Confirmar cadastro em BLL Compras/)
})

test('plataforma com cadastro não muda nada', () => {
  assert.equal(classificarParticipacao({ veredito: 'pronto' }, { nome: 'Compras.gov.br', status: 'tem' }).grupo, 'possivel')
})
