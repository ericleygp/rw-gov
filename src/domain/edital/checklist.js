// Estado do checklist de habilitação (o que a empresa já tem e a validade de cada documento).
export const STATUS = { falta: 'Falta', tenho: 'Tenho', nao_se_aplica: 'Não se aplica' }

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

export function resumoChecklist(exigencias, estado, sessaoEm) {
  const r = { total: exigencias.length, tenho: 0, falta: 0, naoSeAplica: 0, vencem: 0, semData: 0 }
  for (const e of exigencias) {
    const linha = estado?.[e.id] ?? {}
    const status = linha.status ?? 'falta'
    if (status === 'nao_se_aplica') { r.naoSeAplica += 1; continue }
    if (status === 'falta') { r.falta += 1; continue }
    r.tenho += 1
    const s = situacaoValidade(linha.validade, sessaoEm)
    if (s === 'vence') r.vencem += 1
    if (s === 'sem_data') r.semData += 1
  }
  return r
}

const celula = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

export function checklistParaCsv(exigencias, estado, sessaoEm, niveis) {
  const cab = ['Nível', 'Exigência', 'Status', 'Validade', 'Situação da validade', 'Fonte']
  const nomes = { vence: 'Vence antes da sessão', ok: 'Em dia', sem_data: '' }
  const linhas = exigencias.map((e) => {
    const l = estado?.[e.id] ?? {}
    const status = STATUS[l.status ?? 'falta']
    const sit = l.status === 'tenho' ? nomes[situacaoValidade(l.validade, sessaoEm)] : ''
    return [niveis[e.nivel] ?? e.nivel, e.rotulo, status, l.validade ?? '', sit, `${e.fonte.tipo || e.fonte.arquivo}, página ${e.fonte.pagina}`].map(celula).join(';')
  })
  return `\ufeff${[cab.map(celula).join(';'), ...linhas].join('\r\n')}`
}
