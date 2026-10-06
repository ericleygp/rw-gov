import { productInformationLevels } from '../../catalog/model/product.js'

export const matchTypes = ['exata', 'exata_a_validar', 'provavel', 'equivalente', 'sem_cobertura']
export const matchConfidence = productInformationLevels.find((level) => level === 'Não confirmado')

export function createMatch({ id, opportunityItemId, productId = null, type, criteriaMet = [], validationPending = [], justification }) {
  return {
    id,
    opportunityItemId,
    productId,
    type,
    criteriaMet,
    validationPending,
    justification,
    origin: 'Regras automáticas v1 — demonstração',
    confidence: matchConfidence,
  }
}
