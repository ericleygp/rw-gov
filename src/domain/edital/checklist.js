// Validade de documentos em relação à sessão do pregão.
const inicioDoDia = (valor) => {
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? null : d
}

// validade: 'AAAA-MM-DD' (campo de data). Vence antes da sessão => 'vence'.
export function situacaoValidade(validade, sessaoEm) {
  if (!validade) return 'sem_data'
  const v = inicioDoDia(`${validade}T23:59:59`)
  const s = inicioDoDia(sessaoEm)
  if (!v || !s) return 'sem_data'
  return v.getTime() < s.getTime() ? 'vence' : 'ok'
}
