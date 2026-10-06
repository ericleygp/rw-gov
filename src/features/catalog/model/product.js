export const productInformationLevels = [
  'Confirmado',
  'Referência',
  'Não confirmado',
  'Estimado',
]

export const productStatuses = ['Ativo', 'Inativo', 'Não informado', 'Demonstração — catálogo de referência']

// Product identity is kept independent from any future opportunity match.
// Relationship concept: OpportunityItem -> Match -> Product.
export function createProduct({
  id,
  name,
  category,
  subcategory,
  description,
  unitOfSale,
  specifications,
  brands,
  stock,
  cost,
  salePrice,
  suppliers,
  informationSource,
  informationDate,
  confidenceLevel,
  confirmedFields,
  fieldConfidence,
  internalCode,
  status,
}) {
  const unknown = 'Não informado'
  const normalizedSpecifications = typeof specifications === 'object' && specifications !== null
    ? {
      gramatura: specifications.gramatura || unknown,
      dimensoes: specifications.dimensoes || unknown,
      cor: specifications.cor || unknown,
      material: specifications.material || unknown,
      quantidadePorEmbalagem: specifications.quantidadePorEmbalagem || unknown,
      outras: specifications.outras || unknown,
    }
    : {
      gramatura: unknown,
      dimensoes: unknown,
      cor: unknown,
      material: unknown,
      quantidadePorEmbalagem: unknown,
      outras: unknown,
    }
  return {
    id,
    name,
    category,
    subcategory,
    description,
    unitOfSale,
    specifications: normalizedSpecifications,
    brands,
    stock,
    cost,
    salePrice,
    suppliers,
    informationSource,
    informationDate,
    confidenceLevel,
    confirmedFields,
    fieldConfidence,
    internalCode,
    status,
  }
}
