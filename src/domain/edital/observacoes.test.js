import test from 'node:test'
import assert from 'node:assert/strict'
import { extrairObservacoes, simplificar } from './observacoes.js'

const doc = (tipo, texto) => ({ arquivo: `${tipo}.pdf`, tipo, paginas: [{ pagina: 1, texto }] })
const campo = (r, id) => r.campos.find((c) => c.id === id)

test('simplificar mantém o tamanho do texto', () => {
  const t = 'Execução — ÓRGÃO ação'
  assert.equal(simplificar(t).length, t.length)
  assert.equal(simplificar(t), 'execucao — orgao acao')
})

test('lê entrega, frete, multa, amostra e julgamento de um Termo de Referência', () => {
  const r = extrairObservacoes([doc('Termo de Referência',
    'A licitação será do tipo menor preço por item, sem adoção do Sistema de Registro de Preços, com fornecimento parcelado. ' +
    'O prazo de entrega não poderá ser superior a 10 (dez) dias úteis, contados do recebimento da nota de empenho. ' +
    'O frete e o descarregamento correrão por conta da contratada. ' +
    'Não será exigida amostra prévia como condição de habilitação. ' +
    'O pagamento será efetuado em até 10 (dez) dias úteis. ' +
    'Multa moratória de 5% por dia de atraso injustificado sobre o valor da parcela.')])
  assert.equal(campo(r, 'julgamento').valor, 'Menor preço por item')
  assert.match(campo(r, 'registro_precos').valor, /^Não/)
  assert.equal(campo(r, 'prazo_entrega').valor, '10 dias úteis')
  assert.match(campo(r, 'frete').valor, /fornecedor/)
  assert.equal(campo(r, 'amostra').valor, 'Não exigida')
  assert.equal(campo(r, 'pagamento').valor, '10 dias úteis')
  assert.match(campo(r, 'multa').valor, /5% ao dia/)
  assert.ok(campo(r, 'prazo_entrega').trecho.includes('10 (dez) dias úteis'))
  assert.equal(campo(r, 'prazo_entrega').fonte.pagina, 1)
})

test('prazo escrito por extenso e em horas', () => {
  const r = extrairObservacoes([doc('Edital', 'A contratada deverá entregar o objeto no prazo de cinco dias corridos a partir da ordem.')])
  assert.equal(campo(r, 'prazo_entrega').valor, '5 dias corridos')
  assert.ok(r.alertas.some((a) => /curto/.test(a.texto)))
})

test('Registro de Preços, garantia com percentual e lote geram alertas', () => {
  const r = extrairObservacoes([doc('Edital',
    'Pregão do tipo menor preço por lote. A ata de registro de preços terá validade de 12 meses. Cada ata de registro de preços será assinada. ' +
    'Deverá apresentar garantia de proposta de 1% do valor estimado.')])
  assert.match(campo(r, 'registro_precos').valor, /^Sim/)
  assert.match(campo(r, 'garantia').valor, /1%/)
  assert.ok(r.alertas.some((a) => /lote/i.test(a.texto)))
})

test('Termo de Referência vale mais que o Estudo Técnico quando os dois falam do assunto', () => {
  const r = extrairObservacoes([
    doc('Estudo Técnico Preliminar', 'O prazo de entrega será de 30 dias corridos.'),
    doc('Termo de Referência', 'O prazo de entrega será de 7 dias úteis.'),
  ])
  assert.equal(campo(r, 'prazo_entrega').valor, '7 dias úteis')
})

test('PDF escaneado vira aviso, sem inventar nada', () => {
  const r = extrairObservacoes([{ arquivo: 'tr.pdf', tipo: 'Termo de Referência', paginas: [{ pagina: 1, texto: '' }, { pagina: 2, texto: '' }] }])
  assert.equal(r.campos.length, 0)
  assert.equal(r.semTexto.length, 1)
  assert.ok(r.alertas.some((a) => /escaneado/.test(a.texto)))
})

test('sem arquivos baixados', () => {
  assert.ok(extrairObservacoes([]).alertas.some((a) => /Ainda não há arquivos/.test(a.texto)))
})

test('vigência não confunde o limite de prorrogação com o prazo do contrato', () => {
  const so = extrairObservacoes([doc('Edital', 'O prazo de vigência da contratação será prorrogável por até 10 anos, na forma da lei.')])
  assert.equal(campo(so, 'vigencia'), undefined)
  const ok = extrairObservacoes([doc('Termo de Referência', 'O contrato terá prazo de vigência de 12 (doze) meses, contados da assinatura.')])
  assert.equal(campo(ok, 'vigencia').valor, '12 meses')
})

test('documento lido por OCR gera aviso para conferir números no original', () => {
  const r = extrairObservacoes([{ arquivo: 'tr.pdf', tipo: 'Termo de Referência', paginas: [{ pagina: 1, ocr: true, texto: 'A entrega deverá ocorrer em 15 (quinze) dias corridos, contados do recebimento da nota de empenho.' }] }])
  assert.ok(r.alertas.some((a) => a.nivel === 'info' && /OCR/.test(a.texto)))
  assert.equal(r.semTexto.length, 0)
})
