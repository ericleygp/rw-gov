// Cruza as exigências lidas no edital com o perfil de habilitação da empresa e dá um veredito.
// O veredito é apoio à decisão: o edital sempre prevalece.
import { NIVEIS } from './habilitacao.js'
import { situacaoValidade } from './checklist.js'

export const PERFIL_PADRAO = {
  niveis: { II: true, III: true, IV: true, V: true, VI: false },
  atestados: false,
  conselho: false,
  validades: { federal: '', fgts: '', cndt: '', estadual: '', municipal: '' },
}

export const ROTULO_VALIDADE = {
  federal: 'Receita/PGFN (certidão conjunta)', fgts: 'FGTS (CRF)', cndt: 'Débitos trabalhistas (CNDT)',
  estadual: 'Fazenda estadual', municipal: 'Fazenda municipal',
}

// Para cada exigência: o que no perfil a cobre.
const COBERTURA = {
  contrato_social: { nivel: 'II' }, documento_socios: { nivel: 'II' }, registro_comercial: { nivel: 'II' },
  cnpj: { nivel: 'III' }, federal: { nivel: 'III', validade: 'federal' }, seguridade: { nivel: 'III', validade: 'federal' },
  fgts: { nivel: 'III', validade: 'fgts' }, cndt: { nivel: 'III', validade: 'cndt' },
  inscricao_estadual_municipal: { nivel: 'IV' }, estadual: { nivel: 'IV', validade: 'estadual' }, municipal: { nivel: 'IV', validade: 'municipal' },
  atestado: { nivel: 'V', campo: 'atestados', falta: 'Nenhum atestado de capacidade técnica cadastrado' },
  conselho: { nivel: 'V', campo: 'conselho', falta: 'Sem registro em conselho profissional' },
  balanco: { nivel: 'VI' }, falencia: { nivel: 'VI' }, indices: { nivel: 'VI' },
}

const FORA = {
  decl_me_epp: 'declaracao', decl_menor: 'declaracao', decl_impeditivo: 'declaracao', decl_proposta: 'declaracao', decl_pcd: 'declaracao',
  amostra: 'conferir', visita: 'conferir',
}

const MOTIVO_FORA = {
  declaracao: 'Declaração feita pela empresa no sistema do pregão',
  conferir: 'Confira no edital: prazo, local e se é exigida de todos',
}

export function nomesDosItens(itens, max = 3) {
  const nomes = (itens ?? []).map((d) => String(d).trim().slice(0, 40)).filter(Boolean)
  if (nomes.length === 0) return ''
  return nomes.length > max ? `${nomes.slice(0, max).join(', ')} e mais ${nomes.length - max}` : nomes.join(', ')
}

export const textoGrupos = (grupos) => (grupos?.length ? ` (vale para ${grupos.length > 1 ? 'os Grupos' : 'o Grupo'} ${grupos.join(', ')}; os demais grupos não exigem)` : '')

const SO_VENCEDOR = 'Só é pedido de quem for classificado em 1º lugar: providencie se estiver bem colocado'

function avaliarUma(e, perfil, sessaoEm, itens) {
  const base = { id: e.id, nivel: e.nivel, rotulo: e.rotulo, trecho: e.trecho, fonte: e.fonte, momento: e.momento ?? 'indefinido', escopo: e.escopo ?? 'empresa', grupos: e.grupos ?? [] }
  if (e.nivel === 'FORA') {
    const status = FORA[e.id] ?? 'conferir'
    const motivo = status === 'conferir' && base.momento === 'arrematante' ? 'Só é pedida ao 1º colocado: confira prazo e local no edital' : MOTIVO_FORA[status]
    return { ...base, status, motivo }
  }
  const pendente = (motivo) => (base.momento === 'arrematante' ? { ...base, status: 'depois', motivo: `${motivo}. ${SO_VENCEDOR}` } : { ...base, status: 'falta', motivo })
  const doItem = (base.escopo === 'por_item' && itens?.length ? ` (exigido por item: ${nomesDosItens(itens)})` : '') + textoGrupos(base.grupos)
  const c = COBERTURA[e.id] ?? { nivel: e.nivel }
  if (!perfil.niveis?.[c.nivel]) return pendente(`${NIVEIS[c.nivel]} ainda não está feito no SICAF`)
  if (c.campo && !perfil[c.campo]) return pendente(`${c.falta}${doItem}`)
  if (c.validade) {
    const validade = perfil.validades?.[c.validade] ?? ''
    const s = situacaoValidade(validade, sessaoEm)
    if (s === 'sem_data') return { ...base, status: 'sem_data', motivo: `Informe a validade: ${ROTULO_VALIDADE[c.validade]}` }
    if (s === 'vence') return { ...base, status: 'vence', validade, motivo: `Vence em ${formatarData(validade)}, antes da sessão` }
    return { ...base, status: 'tenho', validade, motivo: `Válida até ${formatarData(validade)}` }
  }
  return { ...base, status: 'tenho', motivo: `${NIVEIS[c.nivel]} feito` }
}

export function formatarData(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

export function avaliarHabilitacao(exigencias, perfil, sessaoEm, itensDisputa = []) {
  const p = { ...PERFIL_PADRAO, ...perfil, niveis: { ...PERFIL_PADRAO.niveis, ...perfil?.niveis }, validades: { ...PERFIL_PADRAO.validades, ...perfil?.validades } }
  const itens = (exigencias ?? []).map((e) => avaliarUma(e, p, sessaoEm, itensDisputa))
  const conta = (...s) => itens.filter((i) => s.includes(i.status)).length
  const faltam = conta('falta')
  const atencao = conta('vence', 'sem_data', 'conferir', 'depois')
  const veredito = itens.length === 0 ? 'sem_dados' : faltam > 0 ? 'pendente' : atencao > 0 ? 'atencao' : 'pronto'
  return { veredito, itens, contagem: { total: itens.length, tenho: conta('tenho'), falta: faltam, vence: conta('vence'), semData: conta('sem_data'), conferir: conta('conferir'), depois: conta('depois'), declaracao: conta('declaracao') } }
}

export const VEREDITO = {
  pronto: 'Pronto: o cadastro cobre o que o edital pede',
  atencao: 'Atenção: há pontos para conferir antes da sessão',
  pendente: 'Pendente: o edital pede algo que a empresa ainda não tem',
  sem_dados: 'Sem dados: não consegui ler exigências no edital',
}

const ROTULO_STATUS = { tenho: 'Em dia', vence: 'Vence antes da sessão', sem_data: 'Informar validade', falta: 'Falta', depois: 'Só se vencer', declaracao: 'Declaração', conferir: 'Conferir' }
export const rotuloStatus = (s) => ROTULO_STATUS[s] ?? s

export function resumoParaCopiar(avaliacao, { orgao, sessaoEm } = {}) {
  const linhas = [`Habilitação — ${orgao ?? 'edital'}${sessaoEm ? ` (sessão ${formatarData(String(sessaoEm).slice(0, 10))})` : ''}`, VEREDITO[avaliacao.veredito]]
  for (const [titulo, status] of [['Faltam', ['falta']], ['Só se vencer a disputa', ['depois']], ['Vencem antes da sessão', ['vence']], ['Informar validade', ['sem_data']], ['Conferir no edital', ['conferir']]]) {
    const lista = avaliacao.itens.filter((i) => status.includes(i.status))
    if (lista.length) linhas.push(`${titulo}: ${lista.map((i) => `${i.rotulo}${i.grupos?.length ? ` (Grupos ${i.grupos.join(', ')})` : ''}`).join('; ')}`)
  }
  return linhas.join('\n')
}

const celula = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

export function avaliacaoParaCsv(avaliacao) {
  const cab = ['Nível', 'Exigência', 'Situação', 'Detalhe', 'Fonte']
  const linhas = avaliacao.itens.map((i) => [NIVEIS[i.nivel] ?? i.nivel, i.rotulo, rotuloStatus(i.status), i.motivo, `${i.fonte.tipo || i.fonte.arquivo}, página ${i.fonte.pagina}`].map(celula).join(';'))
  return `\ufeff${[cab.map(celula).join(';'), ...linhas].join('\r\n')}`
}
