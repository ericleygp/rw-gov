import { products as referenceProducts } from '../../../data/mock/products.js'

// Swap this local implementation for a provider when a real data source exists.
export function listProducts() {
  return referenceProducts
}
