import test from 'node:test'
import assert from 'node:assert/strict'
import { loadStored, saveStored } from './usePersistentState.js'

function fakeStorage() {
  const data = new Map()
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) }
}

test('salva e recupera um filtro', () => {
  globalThis.localStorage = fakeStorage()
  saveStored('radar.busca', 'belém')
  assert.equal(loadStored('radar.busca', ''), 'belém')
})

test('sem valor salvo usa o padrão', () => {
  globalThis.localStorage = fakeStorage()
  assert.equal(loadStored('radar.estado', 'Todos'), 'Todos')
})

test('valor que não é mais válido volta ao padrão', () => {
  globalThis.localStorage = fakeStorage()
  saveStored('radar.categoria', 'Categoria antiga')
  assert.equal(loadStored('radar.categoria', 'Todas', (v) => ['Todas', 'Papelaria'].includes(v)), 'Todas')
})

test('conteúdo corrompido ou storage indisponível usa o padrão', () => {
  globalThis.localStorage = { getItem: () => '{quebrado', setItem: () => { throw new Error('cheio') } }
  assert.equal(loadStored('x', 'padrão'), 'padrão')
  assert.doesNotThrow(() => saveStored('x', 1))
  delete globalThis.localStorage
  assert.equal(loadStored('x', 'padrão'), 'padrão')
})
