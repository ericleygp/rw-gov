// Onde a disputa acontece e qual cadastro a empresa precisa ter ANTES do prazo.
// O PNCP só publica o edital; quem recebe proposta e lance é o sistema de origem
// (Compras.gov.br, portal de cotação do Banpará, BLL, BNC...). Sem cadastro nele, não dá para disputar.
//
// CADASTROS_EMPRESA: o que a R W Comercial já tem. Atualize aqui quando fizer um cadastro novo.
//   'tem'      = cadastro feito
//   'nao'      = confirmado que NÃO tem
//   'verificar'= não sabemos (padrão para plataformas que não estão nesta lista)
export const CADASTROS_EMPRESA = {
  comprasgov: 'tem',
  banpara: 'nao',
}

const PLATAFORMAS = [
  { id: 'comprasgov', nome: 'Compras.gov.br', hosts: ['compras.gov.br', 'comprasnet.gov.br', 'comprasgovernamentais.gov.br', 'estaleiro.serpro.gov.br'], cadastro: 'Login gov.br + cadastro no SICAF' },
  { id: 'banpara', nome: 'Portal de cotação do Banpará (ComprasPará)', hosts: ['banpara.b.br', 'compraspara.pa.gov.br'], cadastro: 'Cadastro de fornecedor no ComprasPará (CRC, SEPLAD) + acesso ao portal de cotação do Banpará. Passa por análise: faça com dias de antecedência' },
  { id: 'bll', nome: 'BLL Compras', hosts: ['bll.org.br'], cadastro: 'Cadastro de fornecedor na BLL' },
  { id: 'bnc', nome: 'BNC', hosts: ['bnc.org.br'], cadastro: 'Cadastro de fornecedor na BNC' },
  { id: 'licitanet', nome: 'Licitanet', hosts: ['licitanet.com.br'], cadastro: 'Cadastro de fornecedor na Licitanet' },
  { id: 'pcp', nome: 'Portal de Compras Públicas', hosts: ['portaldecompraspublicas.com.br'], cadastro: 'Cadastro de fornecedor no Portal de Compras Públicas' },
  { id: 'licitacoese', nome: 'Licitações-e (Banco do Brasil)', hosts: ['licitacoes-e.com.br'], cadastro: 'Cadastro de fornecedor no Licitações-e' },
]

function hostDe(link) {
  try { return new URL(String(link)).hostname.toLowerCase().replace(/^www\./, '') } catch { return null }
}

export function identificarPlataforma(opportunity = {}) {
  const host = hostDe(opportunity.linkSistema)
  if (!host) {
    return { id: 'desconhecida', nome: 'Plataforma não identificada', host: null, cadastro: 'Veja no aviso/edital onde a disputa acontece e se é preciso cadastro lá', status: 'verificar', identificada: false }
  }
  const achada = PLATAFORMAS.find((p) => p.hosts.some((h) => host === h || host.endsWith(`.${h}`)))
  if (!achada) {
    return { id: host, nome: host, host, cadastro: `Veja se é preciso cadastro em ${host}`, status: CADASTROS_EMPRESA[host] ?? 'verificar', identificada: false }
  }
  return { ...achada, host, status: CADASTROS_EMPRESA[achada.id] ?? 'verificar', identificada: true }
}

export function avisoCadastro(plataforma) {
  if (!plataforma) return null
  if (plataforma.status === 'tem') return null
  if (plataforma.status === 'nao') return `SEM CADASTRO em ${plataforma.nome}. ${plataforma.cadastro}.`
  return `Confirme se a empresa tem cadastro: ${plataforma.nome}. ${plataforma.cadastro}.`
}
