export const opportunityStatuses = [
  'Aberta',
  'Recebendo propostas',
  'Em análise',
  'Encerrada',
]

// Canonical shape for mock records and future source-provider adapters.
export function createOpportunity({
  id,
  processNumber,
  title,
  agency,
  city,
  state,
  modality,
  status,
  category,
  estimatedValue,
  publishedAt,
  sessionAt,
  itemCount,
  summary,
  source,
  capturedAt,
  dataConfidence,
}) {
  return {
    id,
    processNumber,
    title,
    agency,
    city,
    state,
    modality,
    status,
    category,
    estimatedValue,
    publishedAt,
    sessionAt,
    itemCount,
    summary,
    source,
    capturedAt,
    dataConfidence,
  }
}
