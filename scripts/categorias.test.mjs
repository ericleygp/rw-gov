import test from 'node:test'
import assert from 'node:assert/strict'
import { classificarItem } from './categorias.mjs'

const cat = (d) => classificarItem(d)?.categoria ?? null
const niv = (d) => classificarItem(d)?.nivel ?? null

test('papelaria: itens típicos de material de expediente', () => {
  for (const d of ['CANETA ESFEROGRÁFICA AZUL, CORPO SEXTAVADO', 'Lápis preto nº 2', 'Papel sulfite A4 75g, caixa com 10 resmas', 'GRAMPEADOR de mesa 26/6',
    'Fita adesiva transparente 45mm', 'Pasta suspensa marmorizada', 'Calculadora de mesa 12 dígitos', 'Envelope saco kraft ouro', 'Tesoura escolar 21 cm']) {
    assert.equal(cat(d), 'papelaria', d)
  }
})

test('informática: itens típicos', () => {
  for (const d of ['SSD externo portátil 4TB', 'Mouse óptico USB', 'Teclado mecânico sem fio', 'Memória RAM DDR5 16GB', 'Placa-Mãe AM5 ATX', 'Impressora multifuncional a laser',
    'Cartucho de tinta preto', 'Nobreak 1200VA', 'Cabo HDMI 2 metros', 'Pasta térmica para processador', 'Dock Station USB-C', 'Processador 4.4 GHz']) {
    assert.equal(cat(d), 'informatica', d)
  }
})

test('armarinho: itens típicos', () => {
  for (const d of ['Linha de costura 100% poliéster', 'Agulha de costura nº 10', 'Botão de camisa 4 furos', 'Zíper 20cm', 'Fita de cetim 10mm', 'Feltro 30x40cm', 'Elástico chato 20mm', 'Velcro adesivo']) {
    assert.equal(cat(d), 'armarinho', d)
  }
})

test('o produto precisa estar no início da descrição', () => {
  assert.equal(cat('CAIXA DE PAPELÃO ONDULADO'), null)
  assert.equal(cat('Caixa de papelão para mudança'), null)
  assert.equal(cat('Papel higiênico folha dupla'), null)
  assert.equal(cat('Papel toalha interfolhado'), null)
  assert.equal(cat('Pasta de dente'), null)
  assert.equal(cat('Cabo de aço 10mm'), null)
})

test('itens de lote usam o produto depois do hífen', () => {
  assert.equal(cat('LOTE 3 - Material de expediente - Caneta esferográfica preta'), 'papelaria')
})

test('termos ambíguos são só "possível"; claros são "provável"', () => {
  assert.equal(niv('Fita industrial 50mm'), 'possivel')
  assert.equal(niv('Papel branco'), 'possivel')
  assert.equal(niv('Caneta esferográfica'), 'provavel')
  assert.equal(niv('Papel sulfite A4'), 'provavel')
  assert.equal(niv('Mouse USB'), 'provavel')
})

test('o termo mais específico vence (fita crepe é papelaria; fita de cetim é armarinho)', () => {
  assert.equal(classificarItem('Fita crepe 18mm').termo, 'fita crepe')
  assert.equal(classificarItem('Fita de cetim 7mm').categoria, 'armarinho')
  assert.equal(classificarItem('Tesoura de costura 23cm').categoria, 'armarinho')
})

test('itens de outro ramo e descrições vazias não casam', () => {
  for (const d of ['Cimento Portland CP II', 'Uniforme esportivo camisa', 'Detergente líquido 500ml', 'Veículo automotor zero km', '', null, undefined]) assert.equal(classificarItem(d), null, String(d))
})
