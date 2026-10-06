import { productInformationLevels } from '../../catalog/model/product.js'
import { normalizeText } from '../../../utils/normalizeText.js'

const notProvided = 'não informado'

export { productInformationLevels as opportunityItemConfidenceLevels }

export function createOpportunityItem({
  id,
  opportunityId,
  itemNumber,
  originalDescription,
  quantity = notProvided,
  supplyUnit = notProvided,
  specifications = {},
  estimatedUnitValue = notProvided,
  declaredCategory = notProvided,
  informationSource,
  informationDate = notProvided,
  confidenceLevel,
  status,
}) {
  return {
    id,
    opportunityId,
    itemNumber,
    originalDescription,
    normalizedDescription: normalizeText(originalDescription),
    quantity,
    supplyUnit,
    specifications: {
      gramatura: specifications.gramatura ?? notProvided,
      dimensoes: specifications.dimensoes ?? notProvided,
      cor: specifications.cor ?? notProvided,
      material: specifications.material ?? notProvided,
      quantidadePorEmbalagem: specifications.quantidadePorEmbalagem ?? notProvided,
      outras: specifications.outras ?? notProvided,
    },
    estimatedUnitValue,
    declaredCategory,
    informationSource,
    informationDate,
    confidenceLevel,
    status,
  }
}
