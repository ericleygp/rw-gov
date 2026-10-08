import { listItemsByOpportunityId } from '../../opportunities/repositories/itemRepository.js'
import { listProducts } from '../../catalog/repositories/productRepository.js'
import { matchOpportunityItem } from '../../../domain/matching/matchEngine.js'
import { createMatch } from '../model/match.js'

// Itens reais já chegam comparados com o catálogo pelo motor de busca (scripts/motor-busca.mjs).
function realMatch(item) {
  const found = item.pncpMatch
  const weak = found.nivel !== 'provavel'
  const match = {
    ...createMatch({
      id: `match-${item.id}`, opportunityItemId: item.id, productId: found.codigo, type: 'provavel',
      criteriaMet: ['O nome do produto do catálogo coincide com o início da descrição do item'],
      validationPending: [...(weak ? ['Correspondência fraca: só o nome genérico do produto coincide'] : []), 'Unidade, marca e especificações não confirmadas'],
      justification: `${weak ? 'Correspondência parcial por nome genérico' : 'Correspondência por nome e palavras-chave'}; a identidade requer validação. Estoque informado no catálogo: ${found.estoque}. Preço de venda: ${found.precoVenda}.`,
    }),
    origin: 'Motor de busca PNCP v1 — regras automáticas',
  }
  return { item, match, product: { id: found.codigo, name: found.produto }, alternatives: [] }
}

// Local provider boundary: future data sources can replace these repositories without changing the page.
export function listMatchesByOpportunityId(opportunityId) {
  const products = listProducts()
  return listItemsByOpportunityId(opportunityId).map((item) => (item.pncpMatch ? realMatch(item) : { item, ...matchOpportunityItem(item, products) }))
}
