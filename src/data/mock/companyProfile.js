import { createCompanyProfile } from '../../features/company/model/companyProfile.js'

const categories = [
  'Material Escolar',
  'Armarinho & Tecidos',
  'Escritório',
  'Papelaria Criativa',
  'Presentes & Utilidades',
]

export const companyProfile = createCompanyProfile({
  id: 'rw-comercial',
  name: 'R W Comercial',
  cnpj: '83.271.700/0001-48',
  location: 'A confirmar',
  state: 'A confirmar',
  serviceAreas: 'Não configurado',
  productCategories: categories,
  productCategoriesStatus: 'Referência / demonstração; a confirmar com a empresa',
  minimumDesiredMargin: 'Não configurado',
  financialCapacity: 'Não configurado',
  logisticsCapacity: 'Não configurado',
  stockCapacity: 'Não configurado',
  suppliers: 'Não configurado',
  documentation: 'Não configurado',
  observations: 'Perfil demonstrativo; demais informações comerciais ainda não fornecidas.',
})
