import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCsvRows, validateCatalogCsv } from './csvImport.js'

const header = 'nome;categoria;subcategoria;descricao;unidade_venda;marca;gramatura;dimensoes;cor;material;qtd_por_embalagem;outras_especificacoes;estoque;custo;preco_venda;fornecedor;codigo_interno'
const row = ({ name = 'Produto', category = 'Categoria', stock = '', cost = '', price = '' } = {}) => {
  const fields = Array(17).fill('')
  fields[0] = name; fields[1] = category; fields[12] = stock; fields[13] = cost; fields[14] = price
  return fields.join(';')
}

test('aceita separador ponto e vírgula, BOM, aspas com separador e decimal brasileiro', () => {
  const csv = `\uFEFF${header}\r\n${row({ name: 'Papel; especial', category: 'Papelaria', stock: '1.234,56', cost: '12,50', price: '18,90' }).replace('Papel; especial', '"Papel; especial"')}`
  const result = validateCatalogCsv(csv)
  assert.equal(result.valid.length, 1)
  assert.equal(result.valid[0].data.nome, 'Papel; especial')
  assert.equal(result.valid[0].numbers.stock, 1234.56)
})

test('detecta vírgula e números simples com ponto', () => {
  const commaHeader = header.replaceAll(';', ',')
  const commaRow = row({ name: 'Caneta', category: 'Escrita', stock: '1234.56' }).replaceAll(';', ',')
  const { delimiter, rows } = parseCsvRows(`${commaHeader}\n${commaRow}`)
  assert.equal(delimiter, ',')
  assert.equal(rows[1][12], '1234.56')
  assert.equal(validateCatalogCsv(`${commaHeader}\n${commaRow}`).valid[0].numbers.stock, 1234.56)
})

test('células vazias viram Não informado', () => {
  const result = validateCatalogCsv(`${header}\n${row({ name: 'Produto', category: 'Cat' })}`)
  assert.equal(result.valid[0].numbers.stock, 'Não informado')
})

test('número inválido gera erro de linha, sem virar zero', () => {
  const result = validateCatalogCsv(`${header}\n${row({ stock: 'abc' })}`)
  assert.match(result.errors[0].message, /estoque.*número inválido/)
  assert.equal(result.errors[0].line, 2)
})

test('nome e categoria ausentes são erros da linha', () => {
  const result = validateCatalogCsv(`${header}\n${row({ name: '', category: '' })}`)
  assert.match(result.errors[0].message, /nome obrigatório/)
  assert.match(result.errors[0].message, /categoria obrigatória/)
})
