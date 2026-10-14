import test from 'node:test'
import assert from 'node:assert/strict'
import { extrairHabilitacao } from './habilitacao.js'
import { PERFIL_PADRAO, avaliacaoParaCsv, avaliarHabilitacao, resumoParaCopiar } from './avaliacao.js'

const SESSAO = '2026-10-23T09:00:00-03:00'
const doc = (texto) => ({ arquivo: 'e.pdf', tipo: 'Edital', paginas: [{ pagina: 2, texto }] })
const perfil = { ...PERFIL_PADRAO, validades: { federal: '2027-03-31', fgts: '2026-10-22', cndt: '2027-04-11', estadual: '2027-01-10', municipal: '2027-01-10' } }
const item = (a, id) => a.itens.find((i) => i.id === id)
const ex = (texto) => extrairHabilitacao([doc(texto)]).exigencias

test('níveis II a V feitos: certidão com validade posterior à sessão fica em dia', () => {
  const a = avaliarHabilitacao(ex('Apresentar certidão de tributos federais e Dívida Ativa da União.'), perfil, SESSAO)
  assert.equal(item(a, 'federal').status, 'tenho')
  assert.equal(a.veredito, 'pronto')
})

test('FGTS que vence antes da sessão vira atenção', () => {
  const a = avaliarHabilitacao(ex('Apresentar certificado de regularidade do FGTS.'), perfil, SESSAO)
  assert.equal(item(a, 'fgts').status, 'vence')
  assert.equal(a.veredito, 'atencao')
})

test('sem balanço (Nível VI não feito) o veredito é pendente', () => {
  const a = avaliarHabilitacao(ex('Apresentar balanço patrimonial e demonstrações contábeis do último exercício.'), perfil, SESSAO)
  assert.equal(item(a, 'balanco').status, 'falta')
  assert.match(item(a, 'balanco').motivo, /Nível VI/)
  assert.equal(a.veredito, 'pendente')
})

test('atestado de capacidade técnica falta enquanto não houver atestados cadastrados', () => {
  const texto = 'Apresentar atestado de capacidade técnica.'
  assert.equal(item(avaliarHabilitacao(ex(texto), perfil, SESSAO), 'atestado').status, 'falta')
  assert.equal(item(avaliarHabilitacao(ex(texto), { ...perfil, atestados: true }, SESSAO), 'atestado').status, 'tenho')
})

test('validade não informada pede para informar, sem dar o documento como em dia', () => {
  const a = avaliarHabilitacao(ex('Apresentar certidão negativa de débitos trabalhistas.'), PERFIL_PADRAO, SESSAO)
  assert.equal(item(a, 'cndt').status, 'sem_data')
  assert.equal(a.veredito, 'atencao')
})

test('declarações não pesam no veredito, amostra pede conferência', () => {
  const a = avaliarHabilitacao(ex('Declaração de elaboração independente de proposta. Poderá ser exigida amostra.'), perfil, SESSAO)
  assert.equal(item(a, 'decl_proposta').status, 'declaracao')
  assert.equal(item(a, 'amostra').status, 'conferir')
  assert.equal(a.veredito, 'atencao')
})

test('edital sem exigências lidas dá sem_dados e não inventa pronto', () => {
  assert.equal(avaliarHabilitacao([], perfil, SESSAO).veredito, 'sem_dados')
})

test('resumo para copiar e CSV listam o que falta', () => {
  const a = avaliarHabilitacao(ex('Apresentar balanço patrimonial. Certificado de regularidade do FGTS.'), perfil, SESSAO)
  const resumo = resumoParaCopiar(a, { orgao: 'Grupamento de Apoio de Belém', sessaoEm: SESSAO })
  assert.match(resumo, /Faltam: Balanço patrimonial/)
  assert.match(resumo, /Vencem antes da sessão: Regularidade do FGTS/)
  assert.match(resumo, /23\/10\/2026/)
  assert.match(avaliacaoParaCsv(a), /"Falta"/)
})

test('atestado "por item" cita os itens que a empresa disputa', () => {
  const texto = 'A licitante deverá apresentar no mínimo 01 Atestado de Capacidade Técnica, declarando ter realizado o fornecimento do item de interesse, compatível em quantidades e prazos.'
  const a = avaliarHabilitacao(ex(texto), perfil, SESSAO, ['Copo descartável 200 ml', 'Copo descartável 300 ml'])
  assert.equal(item(a, 'atestado').escopo, 'por_item')
  assert.equal(item(a, 'atestado').status, 'falta')
  assert.match(item(a, 'atestado').motivo, /Copo descartável 200 ml/)
})

test('documento pedido só do 1º colocado não bloqueia a participação', () => {
  const texto = 'Após a fase de lances, o licitante classificado em primeiro lugar será convocado para apresentar o atestado de capacidade técnica.'
  const a = avaliarHabilitacao(ex(texto), perfil, SESSAO)
  assert.equal(item(a, 'atestado').momento, 'arrematante')
  assert.equal(item(a, 'atestado').status, 'depois')
  assert.equal(a.veredito, 'atencao')
  assert.match(resumoParaCopiar(a), /Só se vencer a disputa: Atestado/)
})

test('documento pedido junto da proposta continua pendente', () => {
  const texto = 'Deverão ser anexados juntamente com a proposta o balanço patrimonial e as demonstrações contábeis.'
  const a = avaliarHabilitacao(ex(texto), perfil, SESSAO)
  assert.equal(item(a, 'balanco').momento, 'proposta')
  assert.equal(item(a, 'balanco').status, 'falta')
  assert.equal(a.veredito, 'pendente')
})

test('trecho mostra o contexto longo, sem cortar no item seguinte', () => {
  const longo = 'Atestado de capacidade técnica do item de interesse. ' + 'x'.repeat(500) + ' 9.34. Para tanto, fora apresentado o item seguinte.'
  const f = ex(longo).find((e) => e.id === 'atestado')
  assert.ok(f.trecho.includes('9.34'))
})
