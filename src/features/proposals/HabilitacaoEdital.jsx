import { useEffect, useMemo, useState } from 'react'
import { NIVEIS, NIVEIS_SICAF } from '../../domain/edital/habilitacao.js'
import { STATUS, checklistParaCsv, resumoChecklist, situacaoValidade } from '../../domain/edital/checklist.js'

const chaveDe = (link) => `rwgov.habilitacao.${link}`

function lerEstado(link) {
  try { return JSON.parse(localStorage.getItem(chaveDe(link)) ?? '{}') } catch { return {} }
}

function gravarEstado(link, estado) {
  try { localStorage.setItem(chaveDe(link), JSON.stringify(estado)); return true } catch { return false }
}

// Checklist de habilitação: o que o edital pede, em qual nível do SICAF cai e o que a empresa já tem.
function HabilitacaoEdital({ link, sessionAt }) {
  const [carga, setCarga] = useState({ status: 'carregando' })
  const [estado, setEstado] = useState(() => lerEstado(link))
  const [aberto, setAberto] = useState(null)
  const [falhaSalvar, setFalhaSalvar] = useState(false)

  useEffect(() => {
    let ativo = true
    fetch(`/api/editais/habilitacao?ref=${encodeURIComponent(link)}`)
      .then((r) => r.json())
      .then((dados) => { if (ativo) setCarga({ status: 'pronto', dados }) })
      .catch(() => { if (ativo) setCarga({ status: 'erro' }) })
    return () => { ativo = false }
  }, [link])

  const exigencias = useMemo(() => carga.dados?.exigencias ?? [], [carga])
  const resumo = useMemo(() => resumoChecklist(exigencias, estado, sessionAt), [exigencias, estado, sessionAt])

  function mudar(id, campos) {
    const proximo = { ...estado, [id]: { ...estado[id], ...campos } }
    setEstado(proximo)
    setFalhaSalvar(!gravarEstado(link, proximo))
  }

  function exportar() {
    const csv = checklistParaCsv(exigencias, estado, sessionAt, NIVEIS)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'habilitacao-edital.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (carga.status === 'carregando') return <section className="proposals-card edital-notes"><p className="edital-files-msg">Lendo os arquivos do edital…</p></section>
  if (carga.status === 'erro') return <section className="proposals-card edital-notes"><p className="edital-files-msg">Não foi possível ler o edital agora. Confira se o app está aberto pelo modo de desenvolvimento e se os arquivos foram baixados.</p></section>
  const { dados } = carga
  const niveis = [...NIVEIS_SICAF, 'FORA']

  return (
    <section className="proposals-card edital-notes habilitacao">
      <div className="hab-summary" aria-live="polite">
        <div><small>Exigências</small><b>{resumo.total}</b></div>
        <div><small>Tenho</small><b>{resumo.tenho}</b></div>
        <div><small>Faltam</small><b>{resumo.falta}</b></div>
        <div className={resumo.vencem > 0 ? 'hab-bad' : ''}><small>Vencem antes da sessão</small><b>{resumo.vencem}</b></div>
        <button type="button" className="proposals-primary" onClick={exportar} disabled={exigencias.length === 0}>Exportar CSV</button>
      </div>
      {dados.sicaf?.citado && (
        <div className="notes-alerts">
          <h3>O edital cita o SICAF</h3>
          <p className="hab-note">Os documentos dos níveis II a VI que estiverem em dia no SICAF costumam valer na habilitação. Confira o trecho e a data de vencimento de cada um.</p>
          <blockquote className="hab-quote">{dados.sicaf.trecho}</blockquote>
          <small>{dados.sicaf.fonte.tipo || dados.sicaf.fonte.arquivo} · página {dados.sicaf.fonte.pagina}</small>
        </div>
      )}
      {dados.semTexto?.length > 0 && (
        <div className="notes-alerts"><ul>{dados.semTexto.map((d) => <li key={d.arquivo} className="nota-atencao">"{d.tipo || d.arquivo}" é um PDF escaneado (só imagem): o app não consegue ler. Abra o arquivo e confira a habilitação.</li>)}</ul></div>
      )}
      {niveis.map((nivel) => {
        const itens = exigencias.filter((e) => e.nivel === nivel)
        if (itens.length === 0) return null
        return (
          <div key={nivel} className="notes-group">
            <h3>{NIVEIS[nivel]}</h3>
            {itens.map((e) => {
              const linha = estado[e.id] ?? {}
              const status = linha.status ?? 'falta'
              const validade = status === 'tenho' ? situacaoValidade(linha.validade, sessionAt) : null
              return (
                <div key={e.id} className="hab-row">
                  <div className="hab-main">
                    <b>{e.rotulo}</b>
                    <button type="button" className="text-action" onClick={() => setAberto(aberto === e.id ? null : e.id)}>{aberto === e.id ? 'Ocultar trecho' : 'Ver trecho'}</button>
                  </div>
                  <select value={status} onChange={(ev) => mudar(e.id, { status: ev.target.value })} aria-label={`Situação: ${e.rotulo}`}>
                    {Object.entries(STATUS).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
                  </select>
                  {status === 'tenho' && <label className="hab-date">Validade <input type="date" value={linha.validade ?? ''} onChange={(ev) => mudar(e.id, { validade: ev.target.value })} /></label>}
                  {validade === 'vence' && <span className="hab-flag hab-bad">vence antes da sessão</span>}
                  {validade === 'sem_data' && <span className="hab-flag">informe a validade</span>}
                  {aberto === e.id && (
                    <div className="notes-quote hab-wide">
                      <blockquote>{e.trecho}</blockquote>
                      <small>{e.fonte.tipo || e.fonte.arquivo} · página {e.fonte.pagina}</small>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
      {dados.baixado && exigencias.length === 0 && dados.semTexto?.length === 0 && <p className="edital-files-msg">Não encontrei exigências de habilitação nos textos. Abra o Edital pelos links acima e confira.</p>}
      {falhaSalvar && <p className="proposals-notice proposals-notice-error">Não foi possível salvar no navegador. Exporte o CSV para não perder o trabalho.</p>}
      <p className="notes-disclaimer">Leitura automática por palavras-chave: o edital sempre prevalece e este quadro não é assessoria jurídica. Confira cada trecho no documento original.</p>
    </section>
  )
}

export default HabilitacaoEdital
