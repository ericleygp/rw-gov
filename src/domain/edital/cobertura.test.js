import test from 'node:test'
import assert from 'node:assert/strict'
import { classificarCobertura } from './cobertura.js'

const ref = { cnpj: '08412130000143', ano: '2026', seq: '5' }
const pdf = (arquivo = '01-Edital.pdf') => ({ seq: 1, arquivo, status: 200 })
const comTexto = [{ arquivo: '01-Edital.pdf', paginas: [{ pagina: 1, texto: 'a'.repeat(100) }] }]

test('sem número do PNCP', () => assert.equal(classificarCobertura({ ref: null }).status, 'sem_referencia'))

test('sem manifesto: não baixado, ou falha ao pedir a lista', () => {
  assert.equal(classificarCobertura({ ref, manifesto: null }).status, 'nao_baixado')
  assert.equal(classificarCobertura({ ref, manifesto: null, falhaLista: true }).status, 'falha_lista')
})

test('PNCP sem arquivos e download que falhou', () => {
  assert.equal(classificarCobertura({ ref, manifesto: { arquivos: [] } }).status, 'sem_arquivos_pncp')
  const r = classificarCobertura({ ref, manifesto: { arquivos: [{ seq: 1, arquivo: null, status: 404 }, { seq: 2, arquivo: null, status: 500 }] } })
  assert.equal(r.status, 'falha_download')
  assert.equal(r.faltamArquivos, 2)
})

test('só ZIP, sem PDF', () => assert.equal(classificarCobertura({ ref, manifesto: { arquivos: [{ seq: 1, arquivo: '01-Edital.zip' }] } }).status, 'sem_pdf'))

test('PDF escaneado (sem texto) e texto sem exigências', () => {
  const manifesto = { arquivos: [pdf()] }
  assert.equal(classificarCobertura({ ref, manifesto, textos: [{ arquivo: '01-Edital.pdf', paginas: [{ pagina: 1, texto: '' }] }] }).status, 'escaneado')
  assert.equal(classificarCobertura({ ref, manifesto, textos: comTexto, exigencias: [] }).status, 'sem_palavras_chave')
})

test('lido com exigências; conta arquivos que faltaram', () => {
  const manifesto = { arquivos: [pdf(), { seq: 2, arquivo: null, status: 404 }] }
  const r = classificarCobertura({ ref, manifesto, textos: comTexto, exigencias: [{ nivel: 'II' }] })
  assert.equal(r.status, 'ok')
  assert.equal(r.faltamArquivos, 1)
})
