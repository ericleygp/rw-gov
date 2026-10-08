import { opportunityItems as mockItems } from '../../../data/mock/opportunityItems.js'
import { createOpportunityItem } from '../model/opportunityItem.js'
import { getRealData } from '../../../data/realData.js'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
let cache = { source: null, items: [] }

function realItems(real) {
  if (cache.source === real) return cache.items
  const informationDate = String(real.geradoEm ?? '').slice(0, 10) || 'não informado'
  const items = real.itens.map((record) => ({
    ...createOpportunityItem({
      id: record.id, opportunityId: record.opportunityId, itemNumber: record.itemNumber, originalDescription: record.originalDescription,
      quantity: record.quantity, supplyUnit: record.supplyUnit,
      estimatedUnitValue: Number.isFinite(record.estimatedUnitValue) ? brl.format(record.estimatedUnitValue) : 'não informado',
      informationSource: 'PNCP — Portal Nacional de Contratações Públicas', informationDate, confidenceLevel: 'Referência', status: 'Aberta no PNCP',
    }),
    pncpMatch: record.match,
  }))
  cache = { source: real, items }
  return items
}

export function listOpportunityItems() {
  const real = getRealData()
  return real ? realItems(real) : mockItems
}

export function listItemsByOpportunityId(opportunityId) {
  return listOpportunityItems().filter((item) => item.opportunityId === opportunityId)
}
