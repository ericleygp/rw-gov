import { useEffect, useMemo, useState } from 'react'
import { NIVEIS, NIVEIS_SICAF } from '../../domain/edital/habilitacao.js'
import { PERFIL_PADRAO, ROTULO_VALIDADE, VEREDITO, avaliacaoParaCsv, avaliarHabilitacao, resumoParaCopiar, rotuloStatus } from '../../domain/edital/avaliacao.js'

// Avaliação automática: o edital é lido, cruzado com o perfil da empresa e o app dá o veredito.
function HabilitacaoEdital({ link, sessionAt, agency, itensDisputa }) {
  const [carga, setCarga] = useState({ status: 'carregando' })
  const [perfil, setPerfil] = useState(PERFIL_PADRAO)
  const [perfilAberto, setPerfilAberto] = useState(false)
  const [aberto, setAberto] = useState(null)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    let ativo = true
    Promise.all([
      fetch(`/api/editais/habilitacao?ref=${encodeURIComponent(link)}`).then((r) => r.json()),
      fetch('/api/editais/perfil').then((r) => r.json()),
    ])
      .then(([dados, p]) => { if (ativo) { setCarga({ status: 'pronto', dados }); setPerfil(p) } })
      .catch(() => { if (ativo) setCarga({ status: 'erro' }) })
    return () => { ativo = false }
  }, [link])

  const exigencias = useMemo(() => carga.dados?.exigencias ?? [], [carga])
  const avaliacao = useMemo(() => avaliarHabilitacao(exigencias, perfil, sessionAt, itensDisputa), [exigencias, perfil, sessionAt, itensDisputa])

  async function salvarPerfil(proximo) {
    setPerfil(proximo)
    try {
      const r = await fetch('/api/editais/perfil', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(proximo) })
      if (!r.ok) throw new Error('falhou')
      setAviso('')
    } catch { setAviso('Não consegui salvar o perfil no computador. O app precisa estar aberto pelo modo de desenvolvimento.') }
  }

  const mudarNivel = (n, valor) => salvarPerfil({ ...perfil, niveis: { ...perfil.niveis, [n]: valor } })
  const mudarValidade = (k, valor) => salvarPerfil({ ...perfil, validades: { ...perfil.validades, [k]: valor } })

  function exportar() {
    const url = URL.createObjectURL(new Blob([avaliacaoParaCsv(avaliacao)], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'habilitacao-edital.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function copiar() {
    try { await navigator.clipboard.writeText(resumoParaCopiar(avaliacao, { orgao: agency, sessaoEm: sessionAt })); setAviso('Resumo copiado.') } catch { setAviso('Não consegui copiar. Use o botão Exportar CSV.') }
  }

  if (carga.status === 'carregando') return <section className="proposals-card edital-notes"><p className="edital-files-msg">Lendo os arquivos do edital…</p></section>
  if (carga.status === 'erro') return <section className="proposals-card edital-notes"><p className="edital-files-msg">Não foi possível ler o edital agora. Confira se o app está aberto pelo modo de desenvolvimento e se os arquivos foram baixados.</p></section>
  const { dados } = carga
  const c = avaliacao.contagem

  return (
    <section className="proposals-card edital-notes habilitacao">
      <div className={`hab-verdict hab-${avaliacao.veredito}`} role="status">
        <b>{VEREDITO[avaliacao.veredito]}</b>
        <span>{c.tenho} em dia · {c.falta} faltam · {c.depois} só se vencer · {c.vence} vencem antes da sessão · {c.semData} sem validade · {c.conferir} para conferir · {c.declaracao} declarações</span>
        <div className="hab-actions">
          <button type="button" onClick={copiar} disabled={c.total === 0}>Copiar resumo</button>
          <button type="button" onClick={exportar} disabled={c.total === 0}>Exportar CSV</button>
          <button type="button" onClick={() => setPerfilAberto(!perfilAberto)}>{perfilAberto ? 'Fechar perfil da empresa' : 'Perfil da empresa'}</button>
        </div>
      </div>
      {aviso && <p className="proposals-notice">{aviso}</p>}
      {perfilAberto && (
        <div className="hab-profile">
          <h3>Níveis do SICAF concluídos</h3>
          <div className="hab-levels">
            {Object.keys(perfil.niveis).map((n) => <label key={n}><input type="checkbox" checked={perfil.niveis[n]} onChange={(ev) => mudarNivel(n, ev.target.checked)} /> Nível {n}</label>)}
          </div>
          <div className="hab-levels">
            <label><input type="checkbox" checked={perfil.atestados} onChange={(ev) => salvarPerfil({ ...perfil, atestados: ev.target.checked })} /> Tenho atestados de capacidade técnica</label>
            <label><input type="checkbox" checked={perfil.conselho} onChange={(ev) => salvarPerfil({ ...perfil, conselho: ev.target.checked })} /> Tenho registro em conselho profissional</label>
          </div>
          <h3>Validade das certidões</h3>
          <div className="hab-dates">
            {Object.keys(ROTULO_VALIDADE).map((k) => <label key={k}>{ROTULO_VALIDADE[k]} <input type="date" value={perfil.validades[k] ?? ''} onChange={(ev) => mudarValidade(k, ev.target.value)} /></label>)}
          </div>
          <small>Salvo só no seu computador (pasta dados-locais), fora do GitHub.</small>
        </div>
      )}
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
      {[...NIVEIS_SICAF, 'FORA'].map((nivel) => {
        const itens = avaliacao.itens.filter((i) => i.nivel === nivel)
        if (itens.length === 0) return null
        return (
          <div key={nivel} className="notes-group">
            <h3>{NIVEIS[nivel]}</h3>
            {itens.map((i) => (
              <div key={i.id} className="hab-row">
                <div className="hab-main">
                  <b>{i.rotulo}</b>
                  <button type="button" className="text-action" onClick={() => setAberto(aberto === i.id ? null : i.id)}>{aberto === i.id ? 'Ocultar trecho' : 'Ver trecho'}</button>
                  <small className="hab-reason">{i.motivo}</small>
                </div>
                <span className={`hab-badge hab-s-${i.status}`}>{rotuloStatus(i.status)}</span>
                {aberto === i.id && (
                  <div className="notes-quote hab-wide">
                    <blockquote>{i.trecho}</blockquote>
                    <small>{i.fonte.tipo || i.fonte.arquivo} · página {i.fonte.pagina}</small>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      })}
      {dados.baixado && exigencias.length === 0 && dados.semTexto?.length === 0 && <p className="edital-files-msg">Não encontrei exigências de habilitação nos textos. Abra o Edital pelos links acima e confira.</p>}
      <p className="notes-disclaimer">Leitura automática por palavras-chave: o edital sempre prevalece e este quadro não é assessoria jurídica. Confira cada trecho no documento original.</p>
    </section>
  )
}

export default HabilitacaoEdital
