import { Component, useMemo, useState } from 'react'
import { listOpportunities } from './repositories/opportunityRepository.js'
import { listMatchesByOpportunityId } from '../matching/repositories/matchRepository.js'
import { opportunityStatuses } from './model/opportunity.js'
import { normalizeText } from '../../utils/normalizeText.js'
import { isRealData } from '../../data/realData.js'
import { getSessionTiming } from '../dashboard/utils/sessionTiming.js'
import './OpportunitiesPage.css'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const REAL = isRealData()
const money = (value) => (Number.isFinite(value) ? currency.format(value) : 'Não informado')
const formatPublished = (value) => { const date = new Date(`${value}T12:00:00Z`); return Number.isNaN(date.getTime()) ? 'Não informado' : dateFormat.format(date) }
const opportunities = listOpportunities()
const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

// Mesmo cálculo do Dashboard (dias de calendário a partir de hoje), para as duas telas concordarem.
function daysUntil(date) {
  const timing = getSessionTiming(date, new Date())
  return timing.hasPassed || timing.daysRemaining === null ? -1 : timing.daysRemaining
}

function formatDeadline(date) {
  const days = daysUntil(date)
  if (days < 0) return 'Prazo encerrado'
  if (days === 0) return 'Hoje'
  if (days === 1) return '1 dia restante'
  return `${days} dias restantes`
}

function OpportunitiesPage({ onNavigate }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('Todas as situações')
  const [category, setCategory] = useState('Todas as categorias')
  const [state, setState] = useState('Todos os estados')
  const [modality, setModality] = useState('Todas as modalidades')
  const [valueBand, setValueBand] = useState('Qualquer valor')
  const [selectedId, setSelectedId] = useState(null)

  const categories = [...new Set(opportunities.map((item) => item.category))].sort()
  const states = [...new Set(opportunities.map((item) => item.state))].sort()
  const modalities = [...new Set(opportunities.map((item) => item.modality))].sort()

  const filteredOpportunities = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    return opportunities.filter((item) => {
      const searchable = [item.processNumber, item.title, item.agency, item.city, item.state, item.category, item.summary].join(' ').toLocaleLowerCase('pt-BR')
      const matchesValue = valueBand === 'Qualquer valor'
        || (valueBand === 'Até R$ 50 mil' && item.estimatedValue <= 50000)
        || (valueBand === 'R$ 50 mil a R$ 150 mil' && item.estimatedValue > 50000 && item.estimatedValue <= 150000)
        || (valueBand === 'Acima de R$ 150 mil' && item.estimatedValue > 150000)

      return (!query || searchable.includes(query))
        && (status === 'Todas as situações' || item.status === status)
        && (category === 'Todas as categorias' || item.category === category)
        && (state === 'Todos os estados' || item.state === state)
        && (modality === 'Todas as modalidades' || item.modality === modality)
        && matchesValue
    })
  }, [search, status, category, state, modality, valueBand])

  const openCount = opportunities.filter((item) => ['Aberta', 'Recebendo propostas'].includes(item.status)).length
  const upcomingCount = opportunities.filter((item) => daysUntil(item.sessionAt) >= 0 && daysUntil(item.sessionAt) <= 7).length
  const totalValue = opportunities.reduce((total, item) => total + (Number.isFinite(item.estimatedValue) ? item.estimatedValue : 0), 0)
  const selectedOpportunity = opportunities.find((item) => item.id === selectedId)

  function resetFilters() {
    setSearch('')
    setStatus('Todas as situações')
    setCategory('Todas as categorias')
    setState('Todos os estados')
    setModality('Todas as modalidades')
    setValueBand('Qualquer valor')
  }

  return <div className="opportunities-page">
    <div className="opportunity-demo-banner"><span className="demo-banner-icon">i</span><span><strong>{REAL ? 'Dados reais — PNCP' : 'Demonstração — dado simulado'}</strong><small>{REAL ? 'Oportunidades abertas lidas do Portal Nacional de Contratações Públicas. O match com o seu catálogo é automático e não confirmado.' : 'Esta base é fictícia e não representa editais publicados por órgãos reais.'}</small></span></div>
    <section className="opportunities-heading"><div><span className="eyebrow">RADAR DE COMPRAS PÚBLICAS</span><h1>Oportunidades</h1><p>{REAL ? 'Oportunidades abertas no PNCP, ordenadas pela relevância para o seu catálogo.' : 'Explore oportunidades demonstrativas por categoria, região e prazo.'}</p></div><span className="mock-source-label"><i /> {REAL ? 'Fonte: PNCP (leitura local)' : 'Fonte: base demonstrativa local'}</span></section>

    <section className="opportunity-stats" aria-label="Resumo do radar">
      <StatCard label="Total de oportunidades" value={opportunities.length} note={REAL ? 'abertas no PNCP com itens do seu catálogo' : 'na base demonstrativa'} icon="⌕" tone="violet" />
      <StatCard label="Oportunidades abertas" value={openCount} note="abertas ou recebendo propostas" icon="◉" tone="green" />
      <StatCard label="Próximas do prazo" value={upcomingCount} note="sessão nos próximos 7 dias" icon="◷" tone="amber" />
      <StatCard label="Valor total estimado" value={currency.format(totalValue)} note={REAL ? 'soma dos valores estimados informados' : 'soma da base simulada'} icon="↗" tone="blue" />
    </section>

    <section className="panel radar-panel">
      <div className="radar-panel-heading"><div><h2>Radar de oportunidades</h2><p>{filteredOpportunities.length} de {opportunities.length} {REAL ? 'oportunidades reais' : 'oportunidades demonstrativas'}</p></div><span className="simulation-tag">{REAL ? 'Fonte: PNCP' : 'Demonstração — dado simulado'}</span></div>
      <div className="radar-filters">
        <label className="search-filter"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar órgão, cidade, categoria..." aria-label="Buscar oportunidades" /></label>
        <FilterSelect label="Situação" value={status} onChange={setStatus} options={['Todas as situações', ...opportunityStatuses]} />
        <FilterSelect label="Categoria" value={category} onChange={setCategory} options={['Todas as categorias', ...categories]} />
        <FilterSelect label="Estado" value={state} onChange={setState} options={['Todos os estados', ...states]} />
        <FilterSelect label="Modalidade" value={modality} onChange={setModality} options={['Todas as modalidades', ...modalities]} />
        <FilterSelect label="Faixa de valor" value={valueBand} onChange={setValueBand} options={['Qualquer valor', 'Até R$ 50 mil', 'R$ 50 mil a R$ 150 mil', 'Acima de R$ 150 mil']} />
      </div>
      <div className="radar-table-wrap"><table className="radar-table"><thead><tr><th>OPORTUNIDADE / ÓRGÃO</th><th>MUNICÍPIO / UF</th><th>{REAL ? 'RELEVÂNCIA' : 'CATEGORIA'}</th><th>MODALIDADE</th><th>VALOR ESTIMADO</th><th>PRAZO / SESSÃO</th><th>SITUAÇÃO</th><th><span className="sr-only">Detalhes</span></th></tr></thead><tbody>
        {filteredOpportunities.map((item) => <tr key={item.id} onClick={() => setSelectedId(item.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(item.id) }} tabIndex="0" aria-label={`Ver detalhes de ${item.title}`}>
          <td><div className="radar-title-cell"><span className="radar-row-icon">▤</span><span><strong>{item.title}</strong><small>{item.agency}</small><em>{REAL ? 'Fonte: PNCP' : 'Demonstração — dado simulado'}</em></span></div></td>
          <td><strong className="radar-cell-primary">{item.city}</strong><small className="radar-cell-secondary">{item.state}</small></td>
          <td><span className="category-chip">{item.relevancia ? `${item.relevancia} · ${item.produtosDistintos} produtos` : item.category}</span></td>
          <td><span className="radar-cell-primary">{item.modality}</span><small className="radar-cell-secondary">{item.processNumber}</small></td>
          <td className="radar-value">{money(item.estimatedValue)}</td>
          <td><strong className="radar-cell-primary">{dateFormat.format(new Date(item.sessionAt))}</strong><small className={`radar-cell-secondary${daysUntil(item.sessionAt) <= 7 && daysUntil(item.sessionAt) >= 0 ? ' deadline-near' : ''}`}>{formatDeadline(item.sessionAt)}</small></td>
          <td><span className={`radar-status status-${statusClass(item.status)}`}><i />{item.status}</span></td>
          <td><button className="row-detail-button" type="button" aria-label={`Abrir ${item.title}`} onClick={(event) => { event.stopPropagation(); setSelectedId(item.id) }}>›</button></td>
        </tr>)}
        {filteredOpportunities.length === 0 && <tr><td className="empty-results" colSpan="8"><span>⌕</span><strong>Nenhuma oportunidade encontrada</strong><small>Altere os filtros ou tente outra busca.</small><button type="button" onClick={resetFilters}>Limpar filtros</button></td></tr>}
      </tbody></table></div>
      <div className="radar-table-footer"><span>Exibindo {filteredOpportunities.length} oportunidade(s)</span><span><i /> {REAL ? 'Valores são estimativas do órgão; prazos conforme o PNCP' : 'Valores e prazos são fictícios'}</span></div>
    </section>

    {selectedOpportunity && <RadarDetailErrorBoundary key={selectedOpportunity.id} onBack={() => setSelectedId(null)}><OpportunityDetail opportunity={selectedOpportunity} onClose={() => setSelectedId(null)} onStartProposal={(id) => { globalThis.sessionStorage?.setItem('rwgov.proposta.nova', id); onNavigate?.('Propostas de Preços') }} /></RadarDetailErrorBoundary>}
  </div>
}

function StatCard({ label, value, note, icon, tone }) {
  return <article className="radar-stat"><div className="radar-stat-top"><span>{label}</span><i className={tone}>{icon}</i></div><strong>{value}</strong><small>{note}</small></article>
}

function FilterSelect({ label, value, onChange, options }) {
  return <label className="filter-select"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} aria-label={`Filtrar por ${label.toLocaleLowerCase('pt-BR')}`}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
}

function OpportunityDetail({ opportunity, onClose, onStartProposal }) {
  return <div className="detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="opportunity-detail" role="dialog" aria-modal="true" aria-labelledby="opportunity-detail-title">
      <div className="detail-topline"><span className="simulation-tag">{REAL ? 'Fonte: PNCP' : 'Demonstração — dado simulado'}</span><button type="button" className="detail-close" onClick={onClose} aria-label="Fechar detalhes">×</button></div>
      <span className="eyebrow">{opportunity.processNumber} · {opportunity.modality}</span>
      <h2 id="opportunity-detail-title">{opportunity.title}</h2>
      <p className="detail-agency">{opportunity.agency}</p>
      <span className={`radar-status status-${statusClass(opportunity.status)}`}><i />{opportunity.status}</span>
      <p className="detail-summary">{opportunity.summary}</p>
      {opportunity.link && <p className="detail-summary"><a href={opportunity.link} target="_blank" rel="noreferrer">Abrir edital no PNCP ↗</a></p>}
      {REAL && onStartProposal && <p className="detail-summary"><button type="button" className="proposal-start-button" onClick={() => onStartProposal(opportunity.id)}>Montar proposta de preços</button></p>}
      <div className="detail-facts">
        <DetailFact label="Município / UF" value={`${opportunity.city} / ${opportunity.state}`} />
        <DetailFact label="Categoria" value={opportunity.category} />
        <DetailFact label="Valor estimado" value={money(opportunity.estimatedValue)} />
        <DetailFact label="Itens previstos" value={opportunity.itemCount} />
        {opportunity.relevancia && <DetailFact label="Relevância para o seu catálogo" value={`${opportunity.relevancia} — ${opportunity.produtosDistintos} produtos seus, ${opportunity.itensProvaveis} itens (${opportunity.cobertura}%)`} />}
        <DetailFact label="Publicada em" value={formatPublished(opportunity.publishedAt)} />
        <DetailFact label="Sessão / prazo" value={dateTimeFormat.format(new Date(opportunity.sessionAt))} />
      </div>
      <OpportunityItems opportunity={opportunity} />
      <div className="detail-provenance"><strong>Origem e confiança dos dados</strong><p>Fonte: {opportunity.source}</p><p>Capturado em: {dateTimeFormat.format(new Date(opportunity.capturedAt))}</p><p>Confiança: {opportunity.dataConfidence} — {REAL ? 'dados lidos do PNCP; o match com o catálogo não é confirmado.' : 'registro inteiramente fictício.'}</p></div>
      <div className="future-sections"><strong>Áreas previstas para etapas futuras</strong><div>{['Match com catálogo', 'Fornecedores', 'Análise financeira', 'Opportunity Score', 'Documentação e pipeline'].map((label) => <span key={label}>{label}<small>Não implementado</small></span>)}</div></div>
    </section>
  </div>
}

function OpportunityItems({ opportunity }) {
  const [search, setSearch] = useState('')
  const [coverageType, setCoverageType] = useState('todas')
  const [expandedId, setExpandedId] = useState(null)
  const matches = listMatchesByOpportunityId(opportunity.id)
  const items = matches.map((entry) => entry.item)
  const normalizedSearch = normalizeText(search)
  const filteredMatches = matches.filter(({ item, match, product }) => normalizeText(`${item.itemNumber} ${item.originalDescription} ${item.declaredCategory} ${product?.name ?? ''}`).includes(normalizedSearch)
    && (coverageType === 'todas' || match.type === coverageType))
  const isPartial = items.length < opportunity.itemCount
  const counts = matches.reduce((result, entry) => ({ ...result, [entry.match.type]: result[entry.match.type] + 1 }), { exata: 0, exata_a_validar: 0, provavel: 0, equivalente: 0, sem_cobertura: 0 })

  return <section className="opportunity-items" aria-labelledby="opportunity-items-title">
    <div className="opportunity-items-heading"><div><h3 id="opportunity-items-title">Itens</h3><p>{isPartial ? `${items.length} itens ${REAL ? 'com correspondência no seu catálogo' : 'detalhados'} de ${opportunity.itemCount}` : `${items.length} itens detalhados`}</p></div><span className="simulation-tag">{REAL ? 'Fonte: PNCP' : 'Demonstração — item fictício'}</span></div>
    {isPartial && <div className="partial-items-note">{REAL ? 'Mostrando só os itens que têm correspondência no seu catálogo; os demais itens da compra não estão listados.' : 'A lista é parcial e não representa todos os itens previstos na oportunidade demonstrativa.'}</div>}
    <div className="match-summary"><strong>{REAL ? 'Match automático — não confirmado' : 'Match automático — demonstração, não confirmado'}</strong><span>Considerando apenas os {items.length} itens detalhados de {opportunity.itemCount}: Exatas {counts.exata} · Exatas — a validar {counts.exata_a_validar} · Prováveis {counts.provavel} · Equivalentes {counts.equivalente} · Sem cobertura {counts.sem_cobertura}</span><small>“Exata — a validar” indica nome compatível, mas unidade ou especificação exigida ainda não confirmada.</small></div>
    <div className="item-filters"><label className="item-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Pesquisar nos itens desta oportunidade" aria-label="Pesquisar itens da oportunidade" /></label><label className="filter-select"><span>Cobertura pelo catálogo</span><select value={coverageType} onChange={(event) => setCoverageType(event.target.value)}><option value="todas">Todos os tipos</option><option value="exata">Exata</option><option value="exata_a_validar">Exata — a validar</option><option value="provavel">Provável</option><option value="equivalente">Equivalente</option><option value="sem_cobertura">Sem cobertura</option></select></label></div>
    <div className="opportunity-items-table-wrap"><table className="opportunity-items-table"><thead><tr><th>Nº</th><th>DESCRIÇÃO ORIGINAL</th><th>QUANTIDADE</th><th>UNIDADE</th><th>ESPECIFICAÇÕES RESUMIDAS</th><th>VALOR UNIT. ESTIMADO</th><th>CONFIANÇA</th><th>COBERTURA PELO CATÁLOGO</th><th><span className="sr-only">Detalhes</span></th></tr></thead><tbody>
      {filteredMatches.map((entry) => <ItemTableRows key={entry.item.id} {...entry} expanded={expandedId === entry.item.id} onToggle={() => setExpandedId(expandedId === entry.item.id ? null : entry.item.id)} />)}
      {filteredMatches.length === 0 && <tr><td className="items-empty" colSpan="9">Nenhum item corresponde aos filtros.</td></tr>}
    </tbody></table></div>
  </section>
}

function ItemTableRows({ item, match, product, alternatives, expanded, onToggle }) {
  const summarizedSpecs = [
    ['Gramatura', item.specifications.gramatura], ['Dimensões', item.specifications.dimensoes], ['Cor', item.specifications.cor], ['Material', item.specifications.material],
  ].filter(([, value]) => value !== 'não informado').map(([label, value]) => `${label}: ${value}`)
  return <>
    <tr className="opportunity-item-row" tabIndex="0" onClick={onToggle} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onToggle() }} aria-expanded={expanded}>
      <td>{item.itemNumber}</td><td className="item-description-cell">{item.originalDescription}<small>{item.declaredCategory}</small></td><td>{item.quantity}</td><td>{item.supplyUnit}</td><td className={summarizedSpecs.length ? '' : 'item-unknown'}>{summarizedSpecs.length ? summarizedSpecs.join(' · ') : 'não informado'}</td><td className="item-unknown">{item.estimatedUnitValue}</td><td><span className="item-confidence">{item.confidenceLevel}</span></td>
      <td><span className={`match-type match-${match.type}`}>{matchLabel(match.type)}</span><small className="match-product-name">{product?.name ?? 'Sem cobertura no catálogo atual'}</small></td><td><button type="button" className="item-expand-button" onClick={(event) => { event.stopPropagation(); onToggle() }} aria-label={`${expanded ? 'Fechar' : 'Expandir'} detalhes do item ${item.itemNumber}`}>{expanded ? '−' : '+'}</button></td>
    </tr>
    {expanded && <tr className="item-expanded-row"><td colSpan="9"><div className="expanded-item-content"><div className="expanded-description"><small>Descrição normalizada (derivada)</small><span>{item.normalizedDescription || 'não informado'}</span></div><div className="expanded-match"><strong>Justificativa</strong><p>{match.justification}</p><strong>Critérios atendidos</strong>{match.criteriaMet.length ? <ul>{match.criteriaMet.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul> : <p>Nenhum critério de cobertura atingido.</p>}<strong>Pendências de validação</strong>{match.validationPending.length ? <ul>{match.validationPending.map((pending) => <li key={pending}>{pending}</li>)}</ul> : <p>Nenhuma pendência identificada pelas regras v1; os dados do catálogo ainda são apenas referência.</p>}{alternatives.length > 0 && <><strong>Alternativas consideradas</strong><ul>{alternatives.map((entry) => <li key={entry.match.id}>{entry.product.name} — {matchLabel(entry.match.type)}. {entry.match.justification}</li>)}</ul></>}</div><div className="expanded-specs">{[
      ['Gramatura', item.specifications.gramatura], ['Dimensões', item.specifications.dimensoes], ['Cor', item.specifications.cor], ['Material', item.specifications.material], ['Quantidade por embalagem', item.specifications.quantidadePorEmbalagem], ['Outras especificações', item.specifications.outras],
    ].map(([label, value]) => <div key={label}><small>{label}</small><strong className={value === 'não informado' ? 'item-unknown' : ''}>{value}</strong></div>)}</div><div className="expanded-item-source"><span>Origem: {item.informationSource}</span><span>Data: {item.informationDate}</span><span>Status: {item.status}</span><span>{match.origin} · {match.confidence}</span></div></div></td></tr>}
  </>
}

class RadarDetailErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) return <div className="detail-backdrop"><section className="opportunity-detail radar-detail-error" role="alert"><h2>Não foi possível abrir os detalhes desta oportunidade.</h2><p>Volte à lista e tente abrir novamente.</p><button type="button" onClick={this.props.onBack}>Voltar à lista</button></section></div>
    return this.props.children
  }
}

function matchLabel(type) {
  return ({ exata: 'Exata', exata_a_validar: 'Exata — a validar', provavel: 'Provável', equivalente: 'Equivalente', sem_cobertura: 'Sem cobertura no catálogo atual' })[type]
}function DetailFact({ label, value }) {
  return <div><small>{label}</small><strong>{value}</strong></div>
}

function statusClass(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replaceAll(' ', '-')
}

export default OpportunitiesPage
