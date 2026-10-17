// Identificação da compra no sistema onde a disputa acontece (Compras.gov.br).
// O mesmo edital tem vários números (PNCP, aviso, ato, TR, processo). O que o fornecedor
// digita na busca do Compras.gov.br é o número da compra + a UASG do órgão.

export function rotuloCompra({ modality, numeroCompra, anoCompra } = {}) {
  if (!numeroCompra || !anoCompra) return null
  const tipo = /^dispensa$/i.test(String(modality ?? '').trim()) ? 'Dispensa Eletrônica' : String(modality ?? 'Compra').trim()
  return `${tipo} nº ${numeroCompra}/${anoCompra}`
}

export function identificacaoNoSistema(opportunity = {}) {
  const rotulo = rotuloCompra(opportunity)
  const uasg = opportunity.uasg ? String(opportunity.uasg) : null
  if (!rotulo && !uasg) return null
  return {
    rotulo,
    uasg,
    texto: [rotulo, uasg ? `UASG ${uasg}` : null].filter(Boolean).join(' · '),
    link: opportunity.linkSistema ?? null,
  }
}

// Nome do arquivo de exportação: deixa claro qual compra é no sistema, não só o código do PNCP.
export function nomeArquivoProposta(opportunity = {}, opportunityId = '') {
  const { numeroCompra, anoCompra, uasg } = opportunity
  if (numeroCompra && anoCompra) return `proposta-compra-${numeroCompra}-${anoCompra}${uasg ? `-uasg-${uasg}` : ''}.csv`
  return `proposta-${opportunityId}.csv`
}
