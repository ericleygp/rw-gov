// Separa as oportunidades em "possíveis agora" (o cadastro atual cobre o edital) e
// "oportunidades" (o edital pede algo que a empresa ainda não tem).
export const GRUPOS = {
  possivel: 'Possíveis agora',
  oportunidade: 'Oportunidades (falta habilitação)',
  sem_avaliacao: 'Sem avaliação',
}

export function classificarParticipacao(avaliado, plataforma = null) {
  const base = classificarBase(avaliado)
  if (!plataforma || plataforma.status === 'tem') return base
  const aviso = plataforma.status === 'nao'
    ? `Cadastro em ${plataforma.nome}`
    : `Confirmar cadastro em ${plataforma.nome}`
  if (plataforma.status === 'nao') {
    return { grupo: 'oportunidade', rotulo: 'Oportunidade', faltam: [aviso, ...(base.faltam ?? [])], conferir: base.conferir }
  }
  return { ...base, conferir: [aviso, ...(base.conferir ?? [])] }
}

function classificarBase(avaliado) {
  if (!avaliado) return { grupo: 'sem_avaliacao', rotulo: 'Sem avaliação', faltam: [] }
  if (avaliado.veredito === 'pendente') return { grupo: 'oportunidade', rotulo: 'Oportunidade', faltam: avaliado.faltam ?? [] }
  if (avaliado.veredito === 'pronto') return { grupo: 'possivel', rotulo: 'Possível', faltam: [], conferir: avaliado.conferir ?? [] }
  if (avaliado.veredito === 'atencao') return { grupo: 'possivel', rotulo: 'Possível, com atenção', faltam: [], conferir: [...(avaliado.vencem ?? []), ...(avaliado.conferir ?? [])] }
  return { grupo: 'sem_avaliacao', rotulo: 'Sem avaliação', faltam: [] }
}
