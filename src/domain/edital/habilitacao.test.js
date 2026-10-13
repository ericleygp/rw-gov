import test from 'node:test'
import assert from 'node:assert/strict'
import { extrairHabilitacao } from './habilitacao.js'
import { checklistParaCsv, resumoChecklist, situacaoValidade } from './checklist.js'
import { NIVEIS } from './habilitacao.js'

const doc = (tipo, texto) => ({ arquivo: `${tipo}.pdf`, tipo, paginas: [{ pagina: 3, texto }] })
const achou = (r, id) => r.exigencias.find((e) => e.id === id)

const EDITAL = 'DA HABILITAÇÃO. Os documentos de habilitação já constantes do SICAF serão verificados pelo pregoeiro. ' +
  'Habilitação jurídica: ato constitutivo, estatuto ou contrato social em vigor. ' +
  'Regularidade fiscal: prova de regularidade perante a Fazenda Nacional, certidão de tributos federais e Dívida Ativa da União; ' +
  'certificado de regularidade do FGTS; certidão negativa de débitos trabalhistas (CNDT). ' +
  'Qualificação técnica: atestado de capacidade técnica fornecido por pessoa jurídica de direito público ou privado. ' +
  'Qualificação econômico-financeira: balanço patrimonial e demonstrações contábeis dos dois últimos exercícios. ' +
  'O licitante apresentará declaração de elaboração independente de proposta e declaração de enquadramento como microempresa. ' +
  'Poderá ser exigida amostra do primeiro colocado.'

test('classifica as exigências do edital nos níveis do SICAF', () => {
  const r = extrairHabilitacao([doc('Edital', EDITAL)])
  assert.equal(achou(r, 'contrato_social').nivel, 'II')
  assert.equal(achou(r, 'federal').nivel, 'III')
  assert.equal(achou(r, 'fgts').nivel, 'III')
  assert.equal(achou(r, 'cndt').nivel, 'III')
  assert.equal(achou(r, 'atestado').nivel, 'V')
  assert.equal(achou(r, 'balanco').nivel, 'VI')
  assert.equal(achou(r, 'decl_proposta').nivel, 'FORA')
  assert.equal(achou(r, 'decl_me_epp').nivel, 'FORA')
  assert.equal(achou(r, 'amostra').nivel, 'FORA')
  assert.equal(achou(r, 'falencia'), undefined)
})

test('cada exigência traz trecho original e página', () => {
  const r = extrairHabilitacao([doc('Edital', EDITAL)])
  const f = achou(r, 'balanco')
  assert.ok(f.trecho.includes('balanço patrimonial'))
  assert.equal(f.fonte.pagina, 3)
  assert.equal(f.fonte.tipo, 'Edital')
})

test('detecta quando o edital aceita documentos do SICAF', () => {
  assert.equal(extrairHabilitacao([doc('Edital', EDITAL)]).sicaf.citado, true)
  assert.equal(extrairHabilitacao([doc('Edital', 'Apresentar balanço patrimonial.')]).sicaf.citado, false)
})

test('Edital vale mais que a minuta de contrato quando os dois falam do assunto', () => {
  const r = extrairHabilitacao([
    doc('Minuta de Contrato', 'Manter regularidade do FGTS durante o contrato.'),
    doc('Edital', 'Apresentar o certificado de regularidade do FGTS.'),
  ])
  assert.equal(achou(r, 'fgts').fonte.tipo, 'Edital')
})

test('PDF escaneado vira aviso e não inventa exigência', () => {
  const r = extrairHabilitacao([{ arquivo: 'e.pdf', tipo: 'Edital', paginas: [{ pagina: 1, texto: '' }] }])
  assert.equal(r.exigencias.length, 0)
  assert.equal(r.semTexto.length, 1)
})

test('validade que vence antes da sessão é sinalizada', () => {
  const sessao = '2026-10-23T09:00:00-03:00'
  assert.equal(situacaoValidade('2026-10-22', sessao), 'vence')
  assert.equal(situacaoValidade('2026-10-23', sessao), 'ok')
  assert.equal(situacaoValidade('', sessao), 'sem_data')
})

test('resumo conta tenho, falta, vencem e sem data', () => {
  const ex = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
  const estado = { a: { status: 'tenho', validade: '2026-10-01' }, b: { status: 'tenho' }, c: { status: 'nao_se_aplica' } }
  const r = resumoChecklist(ex, estado, '2026-10-23T09:00:00-03:00')
  assert.deepEqual(r, { total: 4, tenho: 2, falta: 1, naoSeAplica: 1, vencem: 1, semData: 1 })
})

test('CSV escapa aspas e traz a situação da validade', () => {
  const ex = [{ id: 'a', nivel: 'III', rotulo: 'FGTS "CRF"', fonte: { tipo: 'Edital', pagina: 2 } }]
  const csv = checklistParaCsv(ex, { a: { status: 'tenho', validade: '2026-10-01' } }, '2026-10-23T09:00:00-03:00', NIVEIS)
  assert.ok(csv.includes('"FGTS ""CRF"""'))
  assert.ok(csv.includes('Vence antes da sessão'))
})
