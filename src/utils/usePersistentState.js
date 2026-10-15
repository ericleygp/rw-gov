import { useCallback, useState } from 'react'

const PREFIX = 'rwgov.filtros.'

export function loadStored(key, fallback, isValid) {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key)
    if (raw === null || raw === undefined) return fallback
    const value = JSON.parse(raw)
    return !isValid || isValid(value) ? value : fallback
  } catch {
    return fallback
  }
}

export function saveStored(key, value) {
  try {
    globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // sem armazenamento disponível: o filtro só não será lembrado
  }
}

// Igual ao useState, mas lembra o valor ao sair da página e ao reabrir o app.
// isValid evita restaurar um valor que não existe mais nas opções.
export function usePersistentState(key, initial, isValid) {
  const [value, setValue] = useState(() => loadStored(key, typeof initial === 'function' ? initial() : initial, isValid))
  const update = useCallback((next) => {
    setValue((previous) => {
      const resolved = typeof next === 'function' ? next(previous) : next
      saveStored(key, resolved)
      return resolved
    })
  }, [key])
  return [value, update]
}
