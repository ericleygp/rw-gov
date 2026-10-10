import test from 'node:test'
import assert from 'node:assert/strict'
import { deleteProposal, getProposal, listProposals, saveProposal } from './proposalRepository.js'

const fakeStorage = (limit = Infinity) => {
  const data = new Map()
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { if (value.length > limit) throw new Error('quota'); data.set(key, value) }, removeItem: (key) => data.delete(key) }
}

test('salva, atualiza e lista por data de alteração', () => {
  const storage = fakeStorage()
  assert.equal(saveProposal({ opportunityId: 'a', title: 'A' }, storage), true)
  assert.equal(saveProposal({ opportunityId: 'b', title: 'B' }, storage), true)
  assert.equal(saveProposal({ opportunityId: 'a', title: 'A2' }, storage), true)
  assert.equal(listProposals(storage).length, 2)
  assert.equal(getProposal('a', storage).title, 'A2')
  assert.equal(getProposal('zzz', storage), null)
})

test('exclui só a proposta pedida', () => {
  const storage = fakeStorage()
  saveProposal({ opportunityId: 'a' }, storage)
  saveProposal({ opportunityId: 'b' }, storage)
  deleteProposal('a', storage)
  assert.deepEqual(listProposals(storage).map((p) => p.opportunityId), ['b'])
})

test('avisa quando não consegue gravar e ignora dados corrompidos', () => {
  assert.equal(saveProposal({ opportunityId: 'a', big: 'x'.repeat(100) }, fakeStorage(10)), false)
  const broken = fakeStorage()
  broken.setItem('rwgov.propostas.v1', '{não é json')
  assert.deepEqual(listProposals(broken), [])
  assert.equal(saveProposal({ opportunityId: 'a' }, null), false)
})
