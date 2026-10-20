import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { obterToken, unidadesDoProduto, confere, custoDoAnuncio, cotar } from './mercadolivre.mjs'

const attr = (id, value_name) => ({ id, value_name })
const resp = (corpo, ok = true, status = 200) => ({ ok, status, json: async () => corpo })

test('unidades por kit e custo para completar 50 unidades', () => {
  assert.equal(unidadesDoProduto({ attributes: [attr('UNITS_PER_PACK', '12')] }), 12)
  assert.equal(unidadesDoProduto({ attributes: [] }), 1)
  const c = custoDoAnuncio({ preco: 24, unidadesDoAnuncio: 12 }, 50)
  assert.equal(c.pacotes, 5)
  assert.equal(c.custoTotal, 120)
  assert.equal(c.sobra, 10)
  assert.equal(c.porUnidade, 2)
})

test('confere cor, tipo e espessura do traço', () => {
  const caneta = { name: 'Caneta', attributes: [attr('INK_COLOR', 'Preto'), attr('PEN_TYPE', 'Caneta esferográfica'), attr('PEN_STROKE_THICKNESS', '0.5 mm')] }
  assert.equal(confere(caneta, { cor: 'preto', tipo: 'esferografica', espessuraMaxMm: 0.7 }).ok, true)
  assert.equal(confere(caneta, { cor: 'azul' }).ok, false)
  assert.equal(confere(caneta, { cor: 'preta' }).ok, true)
  assert.equal(confere({ name: 'Caneta Preta', attributes: [] }, { cor: 'preto' }).ok, true)
  assert.equal(confere({ name: 'Caneta Preta', attributes: [] }, { cor: 'preto' }).avisos.length, 1)
  assert.equal(confere({ name: 'Caneta', attributes: [] }, { cor: 'preto' }).ok, false)
  assert.equal(confere({ name: 'x', attributes: [attr('INK_COLOR', 'Midnight black')] }, { cor: 'preto' }).ok, true)
  assert.equal(confere({ name: 'x', attributes: [attr('INK_COLOR', 'Azul')] }, { cor: 'preto' }).ok, false)
  assert.equal(confere({ ...caneta, attributes: [attr('INK_COLOR', 'Preto'), attr('PEN_STROKE_THICKNESS', '1 mm')] }, { espessuraMaxMm: 0.7 }).ok, false)
})

test('confere a ponta e avisa o que o catálogo não confirma', () => {
  const media = { name: 'Bic Cristal', attributes: [attr('TRACE_TYPE', 'Média')] }
  assert.equal(confere(media, { ponta: 'fina' }).ok, false)
  assert.equal(confere({ name: 'Bic', attributes: [attr('TRACE_TYPE', 'Fina')] }, { ponta: 'fina' }).ok, true)
  assert.equal(confere({ name: 'Bic', attributes: [attr('TRACE_TYPE', 'Fino')] }, { ponta: 'fina' }).ok, true)
  const estranho = confere({ name: 'Bic', attributes: [attr('TRACE_TYPE', '1.0 mm')] }, { ponta: 'fina' })
  assert.equal(estranho.ok, true)
  assert.match(estranho.avisos[0], /estranho/)
  const sugere = confere({ name: 'Caneta Bic Cristal 0.8 Fina', attributes: [] }, { ponta: 'fina' })
  assert.equal(sugere.ok, true)
  assert.match(sugere.avisos[0], /sugere fina/)
  const a = confere({ name: 'Caneta ponta de tungstênio', attributes: [] }, { palavras: ['tungstenio', 'sextavado'] })
  assert.equal(a.ok, true)
  assert.deepEqual(a.avisos, ['não confirma: sextavado'])
})

test('renova o token e guarda o novo refresh_token', async () => {
  const arq = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ml-')), 'mercadolivre.json')
  fs.writeFileSync(arq, JSON.stringify({ client_id: '1', client_secret: 's', refresh_token: 'antigo' }))
  const token = await obterToken({ arquivo: arq, fetchFn: async () => resp({ access_token: 'abc', refresh_token: 'novo' }) })
  assert.equal(token, 'abc')
  assert.equal(JSON.parse(fs.readFileSync(arq, 'utf8')).refresh_token, 'novo')
  await assert.rejects(obterToken({ arquivo: arq, fetchFn: async () => resp({}, false, 400) }), /400/)
})

test('cotar escolhe o menor custo total e descarta cor errada', async () => {
  const produtos = [
    { id: 'P1', name: 'Pilot 12 un preta', attributes: [attr('INK_COLOR', 'Preto'), attr('UNITS_PER_PACK', '12')] },
    { id: 'P2', name: 'Caixa 50 preta', attributes: [attr('INK_COLOR', 'Preto'), attr('UNITS_PER_PACK', '50')] },
    { id: 'P3', name: 'Azul 50', attributes: [attr('INK_COLOR', 'Azul'), attr('UNITS_PER_PACK', '50')] },
  ]
  const anuncios = { P1: [{ item_id: 'MLB1', price: 30, condition: 'new' }], P2: [{ item_id: 'MLB2', price: 70, condition: 'new', shipping: { cost: 0 } }, { item_id: 'MLB3', price: 40, condition: 'used' }] }
  const fetchFn = async (url) => {
    if (url.includes('/products/search')) return resp({ results: produtos })
    const id = url.match(/products\/(\w+)\/items/)[1]
    return resp({ results: anuncios[id] ?? [] })
  }
  const r = await cotar({ consulta: 'caneta', espec: { cor: 'preto' }, unidades: 50, token: 't', fetchFn, pausaMs: 0 })
  assert.equal(r.melhor.itemId, 'MLB2')
  assert.equal(r.melhor.custoTotal, 70)
  assert.equal(r.alternativas[0].itemId, 'MLB1')
  assert.equal(r.alternativas[0].custoTotal, 150)
  assert.equal(r.descartados.length, 1)
  assert.equal(r.semAnuncios.length, 0)
})
