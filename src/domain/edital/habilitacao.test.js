import test from 'node:test'
import assert from 'node:assert/strict'
import { extrairGrupos, extrairHabilitacao } from './habilitacao.js'
import { situacaoValidade } from './checklist.js'

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


test('lê a lista de grupos de uma exigência', () => {
  assert.deepEqual(extrairGrupos('(grupos 01, 02, 03, 04 ou 05).', 0), [1, 2, 3, 4, 5])
  assert.deepEqual(extrairGrupos('exigido nos grupos 1 a 3 do termo', 0), [1, 2, 3])
  assert.deepEqual(extrairGrupos('exigido no grupo 6', 0), [6])
  assert.deepEqual(extrairGrupos('sem nenhuma lista', 0), [])
})

test('não pega grupos de outra cláusula', () => {
  const texto = 'certidao negativa de falencia expedida pelo distribuidor da sede do fornecedor; 9.20 qualificacao tecnica (grupos 01, 02 ou 03)'
  assert.deepEqual(extrairGrupos(texto, 0), [])
})

test('reconhece atestado de capacidade técnico-operacional com os grupos', () => {
  const documentos = [{ arquivo: 'edital.pdf', tipo: 'Edital', paginas: [{ pagina: 1, texto: '9.20 Para a comprovação da capacidade técnico-operacional, o licitante deverá apresentar um ou mais atestados que demonstrem experiência anterior (Grupos 01, 02, 03, 04 ou 05). 9.21 Os atestados poderão ser somados.' }] }]
  const atestado = extrairHabilitacao(documentos).exigencias.find((e) => e.id === 'atestado')
  assert.ok(atestado)
  assert.deepEqual(atestado.grupos, [1, 2, 3, 4, 5])
})

test('reconhece "Atestado (s) de capacidade técnica" com (s) e quebra de linha (edital FADESP)', () => {
  const r = extrairHabilitacao([doc('Edital', '11.1.3. Qualificação Técnica\na) Atestado (s) de capacidade técnica, fornecido (s) por pessoa (s)\njurídica (s) de direito público ou privado, comprovando que a empresa\nforneceu MATERIAIS em quantidades e características com o objeto desta seleção;')])
  assert.ok(achou(r, 'atestado'))
})
