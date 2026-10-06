import { normalizeText } from '../../utils/normalizeText.js'

const placeholders = new Set([
  '', 'nao informado', 'nao informada', 'nao configurado', 'nao configurada',
  'a confirmar', 'confirmar', 'n a', 'n d', 'nd', 'null', 'undefined',
  'sem informacao', 'sem informacoes', 'nao especificado', 'nao especificada',
  'nao disponivel', 'nao definida', 'nao definido', 'desconhecido', 'desconhecida',
])

export function isPlaceholder(value) {
  if (value === null || value === undefined) return true
  if (typeof value !== 'string') return false
  const normalized = normalizeText(value.replace(/[—–-]/g, ' '))
  return placeholders.has(normalized)
    || /^(?:largura|dimensoes|dimensao|conteudo|composicao|gramatura|cor|material|quantidade|embalagem|preco|estoque|marca|fornecedor|nome|unidade) (?:nao informado|nao informada|nao configurado|nao configurada|nao especificado|nao especificada|nao disponivel|nao definido|nao definida|a confirmar|sem informacao|sem informacoes)$/.test(normalized)
}

export function removePlaceholderPhrases(value = '') {
  if (isPlaceholder(value)) return ''
  return String(value)
    .replace(/\b(?:não|nao)\s+(?:informado|informada|configurado|configurada|especificado|especificada|disponível|disponivel|definido|definida)\b/giu, ' ')
    .replace(/\b(?:a confirmar|sem informação|sem informacao|n\s*\/\s*a|n\s*\/\s*d)\b/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
