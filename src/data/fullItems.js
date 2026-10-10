// Lista completa de itens dos editais (gerada por scripts/motor-busca.mjs). Carregada só quando alguém abre uma proposta.
let cache = null

export async function loadFullItems(url = `${import.meta.env?.BASE_URL ?? '/'}dados-locais/itens-completos.json`) {
  if (cache) return cache
  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) return null
    const json = JSON.parse(await response.text())
    cache = json && typeof json.editais === 'object' ? json.editais : null
  } catch { cache = null }
  return cache
}
