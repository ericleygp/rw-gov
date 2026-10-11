import { useEffect, useState } from 'react'

const kb = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round((bytes || 0) / 1024))} KB`)

// Baixa sozinho (via PNCP) o Edital, o Termo de Referência e os demais anexos da compra e mostra os arquivos.
function EditalFiles({ link }) {
  const [state, setState] = useState({ status: 'carregando', arquivos: [] })
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    if (!link) return undefined
    let ativo = true
    const ref = encodeURIComponent(link)
    async function carregar() {
      try {
        setState({ status: 'carregando', arquivos: [] })
        let dados = await (await fetch(`/api/editais/arquivos?ref=${ref}`)).json()
        if (!dados.baixado || tentativa > 0) {
          setState({ status: 'baixando', arquivos: dados.arquivos ?? [] })
          const resposta = await fetch(`/api/editais/baixar?ref=${ref}`, { method: 'POST' })
          dados = await resposta.json()
          if (dados.ok === false && !(dados.arquivos?.length)) throw new Error('lista indisponível')
        }
        if (ativo) setState({ status: 'pronto', arquivos: dados.arquivos ?? [], falhas: dados.falhas ?? 0 })
      } catch {
        if (ativo) setState({ status: 'erro', arquivos: [] })
      }
    }
    carregar()
    return () => { ativo = false }
  }, [link, tentativa])

  if (!link) return null
  return (
    <div className="edital-files" aria-live="polite">
      <div className="edital-files-head"><strong>Arquivos do edital</strong><button type="button" className="text-action" onClick={() => setTentativa((n) => n + 1)} disabled={state.status === 'baixando' || state.status === 'carregando'}>Baixar de novo</button></div>
      {(state.status === 'carregando' || state.status === 'baixando') && <p className="edital-files-msg">{state.status === 'baixando' ? 'Baixando os arquivos do PNCP…' : 'Verificando…'}</p>}
      {state.status === 'erro' && <p className="edital-files-msg">Não foi possível baixar agora (PNCP indisponível ou app aberto sem o modo de desenvolvimento). Use "Abrir edital no PNCP" ou tente de novo.</p>}
      {state.status === 'pronto' && state.arquivos.length === 0 && <p className="edital-files-msg">O PNCP não tem arquivos publicados para esta compra.</p>}
      {state.arquivos.length > 0 && <ul>{state.arquivos.map((a) => <li key={a.nome}><a href={a.url} target="_blank" rel="noreferrer">{a.tipo || a.titulo || a.nome}</a> <span>{kb(a.bytes)}</span></li>)}</ul>}
      {state.status === 'pronto' && state.falhas > 0 && <p className="edital-files-msg">{state.falhas} arquivo(s) não baixaram. Use "Baixar de novo".</p>}
    </div>
  )
}

export default EditalFiles
