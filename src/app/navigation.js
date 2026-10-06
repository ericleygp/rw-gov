const pagesByHash = {
  dashboard: 'Dashboard',
  radar: 'Radar de Oportunidades',
  catalogo: 'Catálogo',
  empresa: 'Empresa',
}

const hashesByPage = Object.fromEntries(Object.entries(pagesByHash).map(([hash, page]) => [page, hash]))

export function readCurrentPage(hash = globalThis.location?.hash) {
  const slug = String(hash || '').replace(/^#\/?/, '').toLocaleLowerCase('pt-BR')
  return pagesByHash[slug] || pagesByHash.dashboard
}

export function writeCurrentPage(page) {
  const hash = hashesByPage[page] || 'dashboard'
  if (globalThis.location && globalThis.location.hash !== `#/${hash}`) globalThis.location.hash = `/${hash}`
}
