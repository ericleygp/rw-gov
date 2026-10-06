import { opportunityItems as mockItems } from '../../../data/mock/opportunityItems.js'

export function listOpportunityItems() {
  return mockItems
}

export function listItemsByOpportunityId(opportunityId) {
  return mockItems.filter((item) => item.opportunityId === opportunityId)
}
