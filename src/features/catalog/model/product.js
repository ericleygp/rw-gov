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
  status,
}) {
  return {
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
    status,
  }
}
