import { useEffect, useMemo, useState } from 'react'
import './ProposalsPage.css'
import { getRealData, isRealData } from '../../data/realData.js'
import { loadFullItems } from '../../data/fullItems.js'
import { applyCatalogPrices, applyTargetMargin, initialLines, lineMetrics, normalizeEditalItems, summarize, toCsv } from '../../domain/proposal/proposal.js'
import { normalizeText } from '../../utils/normalizeText.js'
import { getSessionTiming } from '../dashboard/utils/sessionTiming.js'
import { listOpportunities } from '../opportunities/repositories/opportunityRepository.js'
import { deleteProposal, getProposal, listProposals, saveProposal } from './repositories/proposalRepository.js'

export const PENDING_KEY = 'rwgov.proposta.nova'
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const percent = (value) => (value === null || value === undefined ? '—' : `${value.toFixed(1).replace('.', ',')}%`)
const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const RELEVANCE_RANK = { alta: 0, media: 1, baixa: 2 }
const FILTERS = [['todos', 'Todos'], ['correspondencia', 'Com correspondência'], ['incluidos', 'Incluídos'], ['pendentes', 'Sem preço']]

function deadlineOf(sessionAt) {
  const days = getSessionTiming(sessionAt, new Date()).daysRemaining
  if (days === null || days === undefined) return { text: 'prazo não informado', short: false }
  if (days <= 0) return { text: 'encerra hoje', short: true }
  return { text: days === 1 ? '1 dia restante' : `${days} dias restantes`, short: days <= 2 }
}

function ItemRow({ item, line, onChange }) {
  const m = lineMetrics(item, line)
  const rowClass = !line.include ? 'row-off' : m.aboveReference ? 'row-over' : m.belowCost ? 'row-below' : ''
  const reference = item.sigiloso ? 'sigiloso' : m.reference === null ? '—' : money.format(m.reference)
  return <tr className={rowClass}>
    <td><input type="checkbox" checked={line.include} onChange={(event) => onChange(item.id, { include: event.target.checked })} aria-label={`Incluir item ${item.number} na proposta`} /></td>
    <td className="num">{item.number}</td>
    <td className="desc" title={item.description}>{item.description}{item.isService && <em className="tag">serviço</em>}</td>
    <td className="num qty">{Number.isFinite(item.quantity) ? item.quantity.toLocaleString('pt-BR') : '—'}<small>{item.unit}</small></td>
    <td className="num">{reference}</td>
    <td className="match">{item.match ? <><b>{item.match.produto}</b><small>estoque {item.match.estoque} · venda {item.match.precoVenda}{item.match.nivel === 'possivel' ? ' · correspondência fraca' : ''}</small></> : '—'}</td>
    <td><input className="money-input" inputMode="decimal" placeholder="0,00" value={line.costText} disabled={!line.include} onChange={(event) => onChange(item.id, { costText: event.target.value })} aria-label={`Custo unitário do item ${item.number}`} /></td>
    <td><input className="money-input" inputMode="decimal" placeholder="0,00" value={line.priceText} disabled={!line.include} onChange={(event) => onChange(item.id, { priceText: event.target.value })} aria-label={`Preço unitário do item ${item.number}`} /></td>
    <td className="num">{line.include ? <>{percent(m.marginPct)}{m.aboveReference && <small className="warn">acima da referência</small>}{m.belowCost && <small className="warn">abaixo do custo</small>}</> : ''}</td>
    <td className="num">{line.include && m.total !== null ? money.format(m.total) : ''}</td>
  </tr>
}

function ProposalsPage() {
  const real = isRealData()
  const opportunities = useMemo(() => {
    if (!real) return []
    return listOpportunities().filter((item) => new Date(item.sessionAt).getTime() >= Date.now())
      .sort((a, b) => (RELEVANCE_RANK[a.relevancia] ?? 3) - (RELEVANCE_RANK[b.relevancia] ?? 3) || String(a.sessionAt).localeCompare(String(b.sessionAt)))
  }, [real])
  const [saved, setSaved] = useState(() => listProposals())
  const [proposal, setProposal] = useState(() => listProposals()[0] ?? null)
  const [query, setQuery] = useState('')
  const [pickedId, setPickedId] = useState('')
  const [filter, setFilter] = useState('todos')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [saveFailed, setSaveFailed] = useState(false)

  // Salva sozinho, pouco depois da última alteração.
  useEffect(() => {
    if (!proposal) return undefined
    const timer = setTimeout(() => { setSaveFailed(!saveProposal(proposal)); setSaved(listProposals()) }, 300)
    return () => clearTimeout(timer)
  }, [proposal])

  async function start(opportunityId) {
    const existing = getProposal(opportunityId)
    if (existing) { setProposal(existing); setNotice(''); return }
    const opportunity = opportunities.find((item) => item.id === opportunityId)
    if (!opportunity) { setNotice('Esse edital não está mais na lista de oportunidades abertas.'); return }
    setLoading(true)
    const editais = await loadFullItems()
    let raw = editais?.[opportunityId]
    let partial = false
    if (!raw) {
      // Sem a lista completa (rode a atualização): usa só os itens que o Radar guardou.
      partial = true
      raw = getRealData().itens.filter((item) => item.opportunityId === opportunityId).map((item) => ({
        numeroItem: item.itemNumber, descricao: item.originalDescription, unidade: item.supplyUnit, quantidade: item.quantity,
        valorUnitario: Number.isFinite(item.estimatedUnitValue) ? item.estimatedUnitValue : null, sigiloso: false, tipo: 'M', match: item.match,
      }))
    }
    const items = normalizeEditalItems(opportunityId, raw)
    setLoading(false)
    setNotice(partial ? 'Lista parcial: só os itens que combinam com o catálogo. Rode a atualização (scripts\\atualizar.cmd) para trazer o edital completo.' : '')
    setProposal({
      opportunityId, title: opportunity.title, agency: opportunity.agency, city: opportunity.city, sessionAt: opportunity.sessionAt, link: opportunity.link ?? '',
      estimatedValue: Number.isFinite(opportunity.estimatedValue) ? opportunity.estimatedValue : null, marginTargetText: '30', items, lines: initialLines(items), createdAt: new Date().toISOString(),
    })
  }

  // Vindo do botão "Montar proposta" do Radar.
  useEffect(() => {
    const pending = globalThis.sessionStorage?.getItem(PENDING_KEY)
    if (pending && real) { globalThis.sessionStorage.removeItem(PENDING_KEY); start(pending) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const changeLine = (itemId, patch) => setProposal((current) => ({ ...current, lines: { ...current.lines, [itemId]: { ...current.lines[itemId], ...patch } } }))
  const setLines = (lines) => setProposal((current) => ({ ...current, lines }))

  if (!real) {
    return <div className="proposals-page"><div className="proposals-empty"><strong>As propostas usam as oportunidades reais do PNCP.</strong><p>Rode a atualização (<code>scripts\atualizar.cmd</code>) para gerar a lista e recarregue a página.</p></div></div>
  }

  const filteredOptions = opportunities.filter((item) => !query.trim() || normalizeText(`${item.agency} ${item.title} ${item.city}`).includes(normalizeText(query)))
  const summary = proposal ? summarize(proposal.items, proposal.lines) : null
  const visibleItems = proposal ? proposal.items.filter((item) => {
    const line = proposal.lines[item.id]
    if (filter === 'correspondencia') return Boolean(item.match)
    if (filter === 'incluidos') return line.include
    if (filter === 'pendentes') return line.include && lineMetrics(item, line).price === null
    return true
  }) : []
  const deadline = proposal ? deadlineOf(proposal.sessionAt) : null

  function exportCsv() {
    const blob = new Blob([`\uFEFF${toCsv(proposal.items, proposal.lines)}`], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `proposta-${proposal.opportunityId}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  function removeProposal() {
    if (!globalThis.confirm('Excluir esta proposta? Os preços digitados serão apagados deste navegador.')) return
    deleteProposal(proposal.opportunityId)
    const rest = listProposals()
    setSaved(rest)
    setProposal(rest[0] ?? null)
  }

  return <div className="proposals-page">
    <header className="proposals-header"><div><span className="proposals-eyebrow">RADAR DE COMPRAS PÚBLICAS</span><h1>Propostas de preços</h1><p>Monte a proposta de um edital: o que entra, quanto custa, por quanto vender e qual a margem.</p></div><span className="proposals-local">Salvo só neste computador</span></header>
    <details className="proposals-start" open={!proposal}>
      <summary>Iniciar ou abrir proposta</summary>
      <div className="proposals-start-grid">
        <section className="proposals-panel">
          <h2>Iniciar proposta</h2>
          <input type="search" className="proposals-search" placeholder="Filtrar por órgão, cidade ou objeto" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Filtrar editais" />
          <select size={5} className="proposals-select" value={pickedId} onChange={(event) => setPickedId(event.target.value)} aria-label="Editais abertos">
            {filteredOptions.map((item) => <option key={item.id} value={item.id}>{`${item.agency} — ${item.title.slice(0, 60)} (${dateFormat.format(new Date(item.sessionAt))})`}</option>)}
          </select>
          <button type="button" className="proposals-primary" disabled={!pickedId || loading} onClick={() => start(pickedId)}>{loading ? 'Carregando itens…' : 'Iniciar proposta'}</button>
          {filteredOptions.length === 0 && <small className="proposals-muted">Nenhum edital aberto com esse filtro.</small>}
        </section>
        <section className="proposals-panel">
          <h2>Minhas propostas</h2>
          {saved.length === 0 ? <small className="proposals-muted">Nenhuma proposta ainda.</small> : <ul className="proposals-saved">{saved.map((item) => <li key={item.opportunityId}><button type="button" className={proposal?.opportunityId === item.opportunityId ? 'active' : ''} onClick={() => { setProposal(item); setNotice('') }}><b>{item.agency}</b><small>{item.title.slice(0, 70)}</small></button></li>)}</ul>}
        </section>
      </div>
    </details>
    <main className="proposals-main">
        {!proposal ? <div className="proposals-empty"><strong>Escolha um edital ao lado para começar.</strong><p>Os itens que combinam com o seu catálogo já vêm marcados.</p></div> : <>
          <section className="proposals-card">
            <div className="proposal-head">
              <div><h2>{proposal.agency}</h2><p>{proposal.title}</p><small>{proposal.city} · encerra em {dateFormat.format(new Date(proposal.sessionAt))} · {deadline.text}{deadline.short && <em className="chip-short">prazo curto</em>}</small></div>
              <div className="proposal-head-actions">{proposal.link && <a href={proposal.link} target="_blank" rel="noreferrer">Abrir edital no PNCP ↗</a>}<button type="button" onClick={removeProposal}>Excluir proposta</button></div>
            </div>
            {notice && <p className="proposals-notice">{notice}</p>}
            {saveFailed && <p className="proposals-notice proposals-notice-error">Não foi possível salvar no navegador (espaço cheio ou bloqueado). Exporte o CSV para não perder o trabalho.</p>}
            <div className="proposal-tools">
              <label>Margem alvo <input className="money-input margin-input" inputMode="decimal" value={proposal.marginTargetText} onChange={(event) => setProposal((current) => ({ ...current, marginTargetText: event.target.value }))} aria-label="Margem alvo em porcentagem" /> %</label>
              <button type="button" onClick={() => setLines(applyTargetMargin(proposal.items, proposal.lines, Number(String(proposal.marginTargetText).replace(',', '.'))))}>Calcular preço pela margem</button>
              <button type="button" onClick={() => setLines(applyCatalogPrices(proposal.items, proposal.lines))}>Usar preço de venda do catálogo</button>
              <button type="button" onClick={() => setLines(Object.fromEntries(proposal.items.map((item) => [item.id, { ...proposal.lines[item.id], include: Boolean(item.match) && !item.isService }])))}>Marcar itens com correspondência</button>
              <button type="button" onClick={() => setLines(Object.fromEntries(proposal.items.map((item) => [item.id, { ...proposal.lines[item.id], include: false }])))}>Desmarcar todos</button>
              <button type="button" className="proposals-primary" onClick={exportCsv}>Exportar CSV</button>
            </div>
            <div className="proposal-filters" role="group" aria-label="Filtrar itens">{FILTERS.map(([key, label]) => <button key={key} type="button" className={filter === key ? 'active' : ''} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}<span>{visibleItems.length} de {proposal.items.length} itens</span></div>
          </section>
          <section className="proposals-card table-card">
            <div className="table-scroll"><table className="proposal-table">
              <thead><tr><th /><th>Nº</th><th>Item do edital</th><th>Qtd / un.</th><th>Referência unit.</th><th>Produto no catálogo</th><th>Custo unit.</th><th>Preço unit.</th><th>Margem</th><th>Total</th></tr></thead>
              <tbody>{visibleItems.map((item) => <ItemRow key={item.id} item={item} line={proposal.lines[item.id]} onChange={changeLine} />)}</tbody>
            </table></div>
          </section>
          <section className="proposal-summary" aria-live="polite">
            <div><small>Itens na proposta</small><b>{summary.included} de {proposal.items.length}</b></div>
            <div><small>Total da proposta</small><b>{money.format(summary.total)}</b></div>
            <div><small>Margem geral</small><b>{percent(summary.marginPct)}</b></div>
            <div><small>Em relação à referência</small><b>{summary.discountPct === null ? '—' : summary.discountPct >= 0 ? `${percent(summary.discountPct)} abaixo` : `${percent(-summary.discountPct)} acima`}</b></div>
            <div className="summary-alerts">
              {summary.missingPrice > 0 && <span className="alert-missing">{summary.missingPrice} sem preço</span>}
              {summary.aboveReference > 0 && <span className="alert-over">{summary.aboveReference} acima da referência</span>}
              {summary.belowCost > 0 && <span className="alert-below">{summary.belowCost} abaixo do custo</span>}
              {summary.missingPrice + summary.aboveReference + summary.belowCost === 0 && summary.included > 0 && <span className="alert-ok">Sem pendências</span>}
            </div>
          </section>
        </>}
    </main>
  </div>
}

export default ProposalsPage
