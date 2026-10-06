import { normalizeText } from '../../utils/normalizeText.js'
import { createMatch } from '../../features/matching/model/match.js'
import { synonymGroups } from './synonymGroups.js'
import { isPlaceholder, removePlaceholderPhrases } from './isPlaceholder.js'

const ignored = new Set(['com', 'para', 'em', 'de', 'do', 'da', 'e', 'ou', 'o', 'a', 'por', 'unidade', 'unidades', 'nao', 'informado', 'informada'])
const specFields = [['gramatura', 'gramatura'], ['dimensoes', 'dimensões'], ['cor', 'cor'], ['material', 'material'], ['quantidadePorEmbalagem', 'quantidade por embalagem']]
const normalize = (value) => isPlaceholder(value) ? '' : normalizeText(removePlaceholderPhrases(String(value ?? '')))
const phraseIn = (text, phrase) => Boolean(phrase) && (` ${text} `).includes(` ${phrase} `)
export const tokenize = (value) => normalize(value).split(' ').filter((word) => word && !ignored.has(word))

function synonymGroup(text) {
  const normalized = normalize(text)
  return synonymGroups.find((group) => group.some((term) => phraseIn(normalized, normalize(term))))
}

function categoryCompatibility(item, product) {
  const itemCategory = normalize(item.declaredCategory)
  const productCategory = normalize(product.category)
  const productSubcategory = normalize(product.subcategory)
  if (!itemCategory || !productCategory) return false
  const broadCategoryTerms = new Set(['material', 'materiais', 'diverso', 'diversos'])
  const categoryOverlap = tokenize(itemCategory).some((term) => !broadCategoryTerms.has(term) && tokenize(productCategory).includes(term))
  return itemCategory === productCategory
    || phraseIn(itemCategory, productCategory)
    || phraseIn(productCategory, itemCategory)
    || categoryOverlap
    || Boolean(productSubcategory && (phraseIn(itemCategory, productSubcategory) || phraseIn(productSubcategory, itemCategory)))
}

const genericNames = new Set(['papel', 'caneta', 'pasta', 'caderno', 'tecido', 'fita', 'botao', 'organizador', 'cartolina', 'cola', 'linha', 'lapis', 'clips', 'clipe', 'borracha', 'apontador', 'grampeador', 'grampos', 'marcador', 'calculadora', 'tesoura', 'agulha', 'alfinete', 'barbante', 'sacola', 'eva'])
function genericName(name) {
  const terms = tokenize(name)
  return terms.length === 1 && genericNames.has(terms[0])
}

function assess(item, product) {
  const itemText = normalize(`${item.originalDescription ?? ''} ${item.normalizedDescription ?? ''}`)
  const productName = normalize(product.name)
  const itemTokens = [...new Set(tokenize(item.originalDescription))]
  const productTokens = new Set(tokenize(`${product.name ?? ''} ${product.description ?? ''}`))
  const group = synonymGroup(item.originalDescription)
  const productGroup = synonymGroup(product.name)
  const sameGroup = Boolean(group && productGroup && group === productGroup)
  const shared = itemTokens.filter((token) => productTokens.has(token))
  const categorySame = categoryCompatibility(item, product)
  const subcategoryTerms = tokenize(product.subcategory)
  const subcategorySame = subcategoryTerms.some((term) => itemTokens.includes(term))
  const nameTokens = tokenize(product.name)
  const namePhraseFound = !isPlaceholder(product.name) && phraseIn(itemText, productName)
  const directName = namePhraseFound && (nameTokens.length > 1 || itemTokens[0] === nameTokens[0])
  const criteriaMet = []
  const validationPending = []
  const conflicts = []
  const missingSpecs = []
  let equivalenceUsed = false

  for (const [field, label] of specFields) {
    const requestedValue = item.specifications?.[field]
    if (isPlaceholder(requestedValue)) continue
    const providedValue = product.specifications && typeof product.specifications === 'object' ? product.specifications[field] : undefined
    if (isPlaceholder(providedValue)) {
      const message = `${label}: item exige “${requestedValue}”, mas o catálogo não informa essa especificação.`
      validationPending.push(message)
      missingSpecs.push(field)
    } else if (normalize(requestedValue) === normalize(providedValue)) {
      criteriaMet.push(`${label} informado no item coincide com o catálogo.`)
    } else {
      const message = `${label}: conflito conhecido; item informa “${requestedValue}” e catálogo informa “${providedValue}”.`
      conflicts.push(message)
      criteriaMet.push(message)
    }
  }

  const itemUnit = isPlaceholder(item.supplyUnit) ? '' : normalize(item.supplyUnit)
  const productUnit = isPlaceholder(product.unitOfSale) ? '' : normalize(product.unitOfSale)
  if (itemUnit && !productUnit) validationPending.push('Unidade de fornecimento do produto não informada no catálogo.')
  else if (itemUnit && productUnit && itemUnit !== productUnit) {
    const unitConflict = 'Unidade do item difere da unidade do produto; nenhuma conversão foi aplicada.'
    conflicts.push(unitConflict)
    validationPending.push(unitConflict)
  }
  else if (itemUnit && productUnit) criteriaMet.push('Unidade do item coincide com a unidade informada no catálogo.')

  const requiredSpecs = specFields.filter(([field]) => !isPlaceholder(item.specifications?.[field])).map(([field]) => field)
  let type = 'sem_cobertura'
  if (directName) {
    criteriaMet.push('Nome do produto aparece como frase completa na descrição do item.')
    if (categorySame) criteriaMet.push('Categoria/subcategoria declarada compatível.')
    else {
      type = 'provavel'
      validationPending.push('Categoria declarada do item não coincide com a categoria/subcategoria do produto; validar manualmente.')
    }
    if (conflicts.length) {
      type = 'provavel'
      criteriaMet.push(...conflicts)
      validationPending.push(...conflicts)
    } else if (type === 'provavel') {
      // Category mismatch prevents a confirmed exact catalog relationship.
    } else if (genericName(product.name) && requiredSpecs.length > 0) {
      type = 'provavel'
      validationPending.push('Nome genérico e especificações exigidas impedem confirmação nominal; validar a identidade do produto.')
    } else if (validationPending.length) {
      type = 'exata_a_validar'
    } else {
      type = 'exata'
    }
  } else if (sameGroup) {
    type = conflicts.length ? 'provavel' : 'equivalente'
    equivalenceUsed = true
    criteriaMet.push(`Correspondência pela equivalência declarada no dicionário v1: ${group.join(' / ')}.`)
    if (conflicts.length) {
      criteriaMet.push(...conflicts)
      validationPending.push(...conflicts)
    }
    if (categorySame) criteriaMet.push('Categoria/subcategoria declarada compatível.')
  } else if (shared.length >= 2 && (categorySame || subcategorySame)) {
    type = 'provavel'
    criteriaMet.push('Termos relevantes em comum e contexto de categoria/subcategoria compatível.')
    validationPending.push('A descrição contém termos sem correspondência específica no catálogo; validar manualmente.')
    if (categorySame) criteriaMet.push('Categoria/subcategoria declarada compatível.')
    if (conflicts.length) {
      criteriaMet.push(...conflicts)
      validationPending.push(...conflicts)
    }
  }

  const itemUnitKnown = Boolean(itemUnit)
  if (type === 'equivalente' && itemUnitKnown && !productUnit) validationPending.push('Unidade de fornecimento do produto não informada no catálogo.')
  const unmatched = itemTokens.filter((token) => token.length > 2 && !productTokens.has(token) && !(sameGroup && group.some((term) => tokenize(term).includes(token))))
  if (type === 'provavel' && unmatched.length) validationPending.push(`Termos do item sem correspondência direta: ${unmatched.join(', ')}.`)

  return {
    type,
    criteriaMet: [...new Set(criteriaMet)],
    validationPending: [...new Set(validationPending)],
    sharedCount: shared.length,
    categorySame,
    subcategorySame,
    directName,
    equivalenceUsed,
  }
}

const priority = { exata: 0, exata_a_validar: 1, equivalente: 2, provavel: 3, sem_cobertura: 4 }

export function matchOpportunityItem(item, products) {
  const candidates = products
    .filter((product) => !isPlaceholder(product.name))
    .map((product) => ({ product, assessment: assess(item, product) }))
    .filter(({ assessment }) => assessment.type !== 'sem_cobertura')
    .sort((a, b) => priority[a.assessment.type] - priority[b.assessment.type]
      || Number(b.assessment.categorySame) - Number(a.assessment.categorySame)
      || Number(b.assessment.subcategorySame) - Number(a.assessment.subcategorySame)
      || b.assessment.sharedCount - a.assessment.sharedCount
      || a.product.name.localeCompare(b.product.name, 'pt-BR'))
  const build = (candidate, suffix = '') => {
    if (!candidate) return { match: createMatch({ id: `match-${item.id}${suffix}`, opportunityItemId: item.id, type: 'sem_cobertura', justification: 'Nenhum produto atingiu as regras mínimas de correspondência no catálogo atual.' }), product: null }
    const { product, assessment } = candidate
    const reasons = {
      exata: 'Nome, unidade e especificações exigidas estão compatíveis e confirmados no catálogo.',
      exata_a_validar: 'O nome é compatível e não há conflito conhecido, mas faltam dados para confirmação.',
      equivalente: 'Correspondência por equivalência declarada no dicionário v1; validar os dados ausentes.',
      provavel: 'Há correspondência parcial, nome genérico ou conflito; a identidade requer validação.',
    }
    return { match: createMatch({ id: `match-${item.id}${suffix}`, opportunityItemId: item.id, productId: product.id, type: assessment.type, criteriaMet: assessment.criteriaMet, validationPending: assessment.validationPending, justification: reasons[assessment.type] }), product }
  }
  const best = candidates[0]
  const alternatives = best ? candidates.filter((candidate) => candidate.product.id !== best.product.id).slice(0, 2) : []
  return { ...build(best), alternatives: alternatives.map((candidate, index) => build(candidate, `-alt-${index + 1}`)) }
}
