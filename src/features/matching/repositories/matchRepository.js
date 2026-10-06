import { listItemsByOpportunityId } from '../../opportunities/repositories/itemRepository.js'
import { listProducts } from '../../catalog/repositories/productRepository.js'
import { matchOpportunityItem } from '../../../domain/matching/matchEngine.js'

// Local provider boundary: future data sources can replace these repositories without changing the page.
export function listMatchesByOpportunityId(opportunityId) {
  const products = listProducts()
  return listItemsByOpportunityId(opportunityId).map((item) => ({ item, ...matchOpportunityItem(item, products) }))
}
