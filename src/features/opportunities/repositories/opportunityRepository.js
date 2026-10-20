import { opportunities as mockOpportunities } from '../../../data/mock/opportunities.js'
import { createOpportunity } from '../model/opportunity.js'
import { getHabilitacao, getRealData } from '../../../data/realData.js'
import { classificarParticipacao } from '../../../domain/edital/participacao.js'
import { identificarPlataforma } from '../../../domain/edital/plataforma.js'

// Valor ausente, zero ou sigiloso vira NaN: as telas já tratam como "Não informado".
const knownValue = (value) => (Number.isFinite(value) && value > 0 ? value : NaN)
// new Date(null) vira 1970 (data "válida"), então prazo ausente precisa ser checado antes.
const hasValidSession = (record) => Boolean(record.sessionAt) && !Number.isNaN(new Date(record.sessionAt).getTime())

export function listOpportunities() {
  const real = getRealData()
  if (!real) return mockOpportunities
  return real.oportunidades.filter(hasValidSession).map((record) => ({
    ...createOpportunity({ ...record, estimatedValue: knownValue(record.estimatedValue) }),
    link: record.link, numeroCompra: record.numeroCompra ?? null, anoCompra: record.anoCompra ?? null, uasg: record.uasg ?? null, linkSistema: record.linkSistema ?? null, proposalOpensAt: record.proposalOpensAt ?? null, ibge: record.ibge ?? null, relevancia: record.relevancia, produtosDistintos: record.produtosDistintos, itensProvaveis: record.itensProvaveis, cobertura: record.cobertura,
    plataforma: identificarPlataforma(record),
    participacao: classificarParticipacao(getHabilitacao(record.id), identificarPlataforma(record)),
  }))
}
