import { products as referenceProducts } from '../../../data/mock/products.js'
import { createProduct } from '../model/product.js'

const STORAGE_KEY = 'rw-gov.catalog.import.v1'
export const CATALOG_SOURCE_CHANGE_EVENT = 'rw-gov:catalog-source-change'

function notifyCatalogSourceChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CATALOG_SOURCE_CHANGE_EVENT))
}

function readImport() {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEY)
    return value ? JSON.parse(value) : null
  } catch { return null }
}

let importedCatalog = readImport()

// Swap this local implementation for a provider when a real data source exists.
export function listProducts() {
  return importedCatalog?.products?.map((product) => createProduct(product)) || referenceProducts
}

export function getImportedCatalogInfo() {
  return importedCatalog ? { importedAt: importedCatalog.importedAt, fileName: importedCatalog.fileName } : null
}

export function saveImportedCatalog(products, fileName, importedAt) {
  const next = { products, fileName, importedAt }
  try { globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { throw new Error('Não foi possível salvar no armazenamento local deste navegador.') }
  importedCatalog = next
  notifyCatalogSourceChange()
}

export function clearImportedCatalog() {
  try { globalThis.localStorage?.removeItem(STORAGE_KEY) } catch { throw new Error('Não foi possível limpar o armazenamento local deste navegador.') }
  importedCatalog = null
  notifyCatalogSourceChange()
}
