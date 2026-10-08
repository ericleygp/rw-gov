import { useEffect, useState } from 'react'
import { listOpportunityItems } from '../opportunities/repositories/itemRepository.js'
import { listOpportunities } from '../opportunities/repositories/opportunityRepository.js'
import { opportunityStatuses } from '../opportunities/model/opportunity.js'
import { getCompanyProfile } from '../company/repositories/companyProfileRepository.js'
import { getSessionTiming } from './utils/sessionTiming.js'
import { isRealData } from '../../data/realData.js'

const opportunities = listOpportunities()
const opportunityItems = listOpportunityItems()
const companyProfile = getCompanyProfile()
const REAL = isRealData()
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const dateFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
const deadlineFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

function DashboardPage({ onNavigate }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const greeting = getGreeting(now)
  const responsibleValue = companyProfile.responsibleName || companyProfile.responsible || ''
  const responsible = ['Não configurado', 'A confirmar', 'não informado'].includes(responsibleValue) ? '' : responsibleValue
  const dateLabel = dateFormat.format(now).toLocaleUpperCase('pt-BR')
  const activeOpportunities = opportunities.filter((item) => opportunityStatuses.includes(item.status) && item.status !== 'Encerrada')
  const upcomingDeadlines = activeOpportunities
    .map((item) => ({ item, timing: getSessionTiming(item.sessionAt, now) }))
    .filter(({ timing }) => !timing.hasPassed && timing.daysRemaining >= 0 && timing.daysRemaining <= 7)
    .sort((a, b) => new Date(a.item.sessionAt) - new Date(b.item.sessionAt))
  const knownValues = opportunities.filter((item) => Number.isFinite(item.estimatedValue))
  const totalEstimatedValue = knownValues.reduce((total, item) => total + item.estimatedValue, 0)
  const categoryCounts = countBy(opportunities, (item) => item.category)
  const stateCounts = countBy(opportunities, (item) => item.state)
  const detailedItemCounts = countBy(opportunityItems, (item) => item.opportunityId)

  return <div className="dashboard-page">
    <div className="demo-notice"><span>i</span><p><strong>{REAL ? 'Dados reais — PNCP.' : 'Ambiente demonstrativo — dados fictícios.'}</strong> {REAL ? 'Oportunidades abertas lidas do PNCP; o match com o catálogo é automático e não confirmado.' : 'Oportunidades e valores são exemplos locais e não representam editais reais.'}</p></div>

    <section className="welcome-row"><div><span className="eyebrow">{dateLabel}</span><h1>{greeting}{responsible ? `, ${responsible}` : ''} <em aria-hidden="true">{getGreetingIcon(now)}</em></h1><p>{REAL ? 'Resumo calculado a partir das oportunidades reais do Radar.' : 'Resumo calculado a partir da base demonstrativa do Radar.'}</p></div><span className="dashboard-data-source">{opportunities.length} oportunidades na base local</span></section>

    <section className="metrics-grid" aria-label="Indicadores calculados a partir do Radar">
      <MetricCard label="Total de oportunidades" value={opportunities.length} note="registros no Radar" icon="⌕" tone="violet" />
      <MetricCard label="Oportunidades ativas" value={activeOpportunities.length} note="não encerradas" icon="◉" tone="green" />
      <MetricCard label="Prazos nos próximos 7 dias" value={upcomingDeadlines.length} note="sessões futuras na amostra" icon="◷" tone="amber" />
      <MetricCard label="Valor estimado somado" value={currency.format(totalEstimatedValue)} note={`soma dos ${knownValues.length} valores informados`} icon="↗" tone="blue" />
    </section>

    <div className="dashboard-columns">
      <section className="panel opportunities-panel"><div className="panel-header"><div><h2>Oportunidades em destaque</h2><p>Sessões de hoje até os próximos 7 dias · dados do Radar</p></div><button className="text-action" type="button" onClick={() => onNavigate('Radar de Oportunidades')}>Abrir Radar <b>→</b></button></div>
        <div className="table-wrap"><table className="dashboard-feature-table"><thead><tr><th>OPORTUNIDADE / ÓRGÃO</th><th>MUNICÍPIO / UF</th><th>VALOR ESTIMADO</th><th>SESSÃO</th></tr></thead><tbody>
          {upcomingDeadlines.map(({ item, timing }) => <tr key={item.id}><td><div className="opportunity-name"><span className="opportunity-icon green">▤</span><span><strong>{item.title}</strong><small>{item.agency}</small><small>{item.category} · {detailedItemCounts[item.id] || 0} de {item.itemCount} itens detalhados</small></span></div></td><td><span className="table-primary">{item.city}</span><span className="table-secondary">{item.state}</span></td><td className="value-cell">{Number.isFinite(item.estimatedValue) ? currency.format(item.estimatedValue) : 'Não informado'}</td><td><span className="table-primary">{deadlineFormat.format(new Date(item.sessionAt))}</span><span className="table-secondary dashboard-deadline-left">{formatDaysRemaining(timing)}</span></td></tr>)}
          {upcomingDeadlines.length === 0 && <tr><td colSpan="4" className="dashboard-empty">Ainda não há sessões entre hoje e os próximos 7 dias {REAL ? 'nas oportunidades reais.' : 'na base demonstrativa.'}</td></tr>}
        </tbody></table></div>
        <div className="panel-footnote"><i /> Itens detalhados são uma amostra parcial; consulte o Radar para ver a declaração de cobertura.</div>
      </section>

      <aside className="dashboard-distributions">
        <DistributionPanel title="Por categoria" description="Quantidade de oportunidades" entries={categoryCounts} />
        <DistributionPanel title="Por UF" description="Distribuição geográfica da amostra" entries={stateCounts} compact />
      </aside>
    </div>
  </div>
}

function getGreeting(date) {
  const hour = date.getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getGreetingIcon(date) {
  const hour = date.getHours()
  if (hour < 12) return '☀'
  if (hour < 18) return '◒'
  return '☾'
}

function countBy(records, getKey) {
  return records.reduce((counts, record) => {
    const key = getKey(record) || 'Não informado'
    counts[key] = (counts[key] || 0) + 1
    return counts
  }, {})
}

function formatDaysRemaining({ daysRemaining, hasPassed }) {
  if (hasPassed) return 'Sessão realizada'
  if (daysRemaining === 0) return 'Hoje'
  if (daysRemaining === 1) return '1 dia restante'
  return `${daysRemaining} dias restantes`
}

function MetricCard({ label, value, note, icon, tone }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}>{icon}</span></div><div className="metric-value">{value}</div><div className="metric-foot"><span className="metric-note">{note}</span></div></article>
}

function DistributionPanel({ title, description, entries, compact = false }) {
  const sortedEntries = Object.entries(entries).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
  const maxCount = Math.max(1, ...sortedEntries.map(([, count]) => count))

  return <section className={`panel distribution-panel${compact ? ' compact-distribution' : ''}`}><div className="panel-header"><div><h2>{title}</h2><p>{description}</p></div></div><div className="distribution-list">{sortedEntries.map(([label, count]) => <div className="distribution-row" key={label}><span title={label}>{label}</span><div className="distribution-track"><i style={{ width: `${(count / maxCount) * 100}%` }} /></div><strong>{count}</strong></div>)}</div></section>
}

export default DashboardPage
