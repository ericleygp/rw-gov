// Propostas ficam só neste navegador (localStorage): preços e custos da empresa não saem do computador nem vão para o Git.
const KEY = 'rwgov.propostas.v1'

const defaultStorage = () => { try { return globalThis.localStorage ?? null } catch { return null } }

function readAll(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

export function listProposals(storage = defaultStorage()) {
  return readAll(storage).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
}

export function getProposal(opportunityId, storage = defaultStorage()) {
  return readAll(storage).find((proposal) => proposal.opportunityId === opportunityId) ?? null
}

// Retorna false se não conseguiu gravar (por exemplo, espaço do navegador cheio).
export function saveProposal(proposal, storage = defaultStorage()) {
  if (!storage) return false
  const others = readAll(storage).filter((item) => item.opportunityId !== proposal.opportunityId)
  try {
    storage.setItem(KEY, JSON.stringify([...others, { ...proposal, updatedAt: new Date().toISOString() }]))
    return true
  } catch { return false }
}

export function deleteProposal(opportunityId, storage = defaultStorage()) {
  if (!storage) return
  try { storage.setItem(KEY, JSON.stringify(readAll(storage).filter((item) => item.opportunityId !== opportunityId))) } catch { /* sem espaço ou bloqueado */ }
}
