import { useEffect, useState } from 'react'

const GRUPOS = ['Disputa', 'Contratação', 'Entrega', 'Exigências', 'Pagamento']

// Resumo do edital para decidir se vale participar: o que o Edital e o Termo de Referência dizem, com o trecho original.
function EditalNotes({ link }) {
  const [estado, setEstado] = useState({ status: 'carregando' })
  const [aberto, setAberto] = useState(null)

  useEffect(() => {
    let ativo = true
    fetch(`/api/editais/observacoes?ref=${encodeURIComponent(link)}`)
      .then((r) => r.json())
      .then((dados) => { if (ativo) setEstado({ status: 'pronto', dados }) })
      .catch(() => { if (ativo) setEstado({ status: 'erro' }) })
    return () => { ativo = false }
  }, [link])

  if (estado.status === 'carregando') return <section className="proposals-card edital-notes"><p className="edital-files-msg">Lendo os arquivos do edital…</p></section>
  if (estado.status === 'erro') return <section className="proposals-card edital-notes"><p className="edital-files-msg">Não foi possível ler o edital agora. Confira se o app está aberto pelo modo de desenvolvimento e se os arquivos foram baixados.</p></section>
  const { dados } = estado
  return (
    <section className="proposals-card edital-notes">
      {dados.alertas.length > 0 && (
        <div className="notes-alerts">
          <h3>Pontos de atenção</h3>
          <ul>{dados.alertas.map((a) => <li key={a.texto} className={`nota-${a.nivel}`}>{a.texto}</li>)}</ul>
        </div>
      )}
      {GRUPOS.map((grupo) => {
        const campos = dados.campos.filter((c) => c.grupo === grupo)
        if (campos.length === 0) return null
        return (
          <div key={grupo} className="notes-group">
            <h3>{grupo}</h3>
            <dl>
              {campos.map((c) => (
                <div key={c.id} className="notes-row">
                  <dt>{c.rotulo}</dt>
                  <dd>
                    <b>{c.valor}</b>
                    <button type="button" className="text-action" onClick={() => setAberto(aberto === c.id ? null : c.id)}>{aberto === c.id ? 'Ocultar trecho' : 'Ver trecho'}</button>
                    {aberto === c.id && (
                      <div className="notes-quote">
                        <blockquote>{c.trecho}</blockquote>
                        <small>{c.fonte.tipo || c.fonte.arquivo} · página {c.fonte.pagina}</small>
                        {c.extras?.map((e) => <div key={e.valor + e.fonte.pagina}><blockquote>{e.trecho}</blockquote><small>{e.valor} · {e.fonte.tipo || e.fonte.arquivo} · página {e.fonte.pagina}</small></div>)}
                      </div>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )
      })}
      {dados.baixado && dados.campos.length === 0 && dados.semTexto.length === 0 && <p className="edital-files-msg">Não encontrei os pontos principais nos textos. Abra o Edital e o Termo de Referência pelos links acima.</p>}
      <p className="notes-disclaimer">Leitura automática: confira sempre o trecho original no documento. Dados que não aparecem aqui não foram encontrados ou estão em PDF escaneado.</p>
    </section>
  )
}

export default EditalNotes
