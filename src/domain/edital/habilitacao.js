// Lê o texto do Edital / Termo de Referência e monta o checklist de habilitação, ligado aos níveis do SICAF.
// Leitura por palavras-chave: cada exigência traz o trecho original e a página para conferir. O edital sempre prevalece.
import { simplificar } from './observacoes.js'

export const NIVEIS = {
  II: 'Nível II · Habilitação Jurídica',
  III: 'Nível III · Regularidade Fiscal e Trabalhista Federal',
  IV: 'Nível IV · Regularidade Fiscal Estadual/Distrital e Municipal',
  V: 'Nível V · Qualificação Técnica',
  VI: 'Nível VI · Qualificação Econômico-Financeira',
  FORA: 'Fora do SICAF · declarações e outras exigências',
}

// Níveis que o SICAF cobre; "FORA" precisa ser providenciado à parte.
export const NIVEIS_SICAF = ['II', 'III', 'IV', 'V', 'VI']

const REGRAS = [
  { id: 'contrato_social', nivel: 'II', rotulo: 'Contrato social / ato constitutivo', achar: /(ato constitutivo|contrato social|estatuto social)/ },
  { id: 'documento_socios', nivel: 'II', rotulo: 'Documento de identificação dos sócios/administradores', achar: /(documento|cedula) de identidade|documento de identificacao|identificacao d[oa]s? (?:socios?|dirigentes?|representante)/ },
  { id: 'registro_comercial', nivel: 'II', rotulo: 'Registro comercial (empresa individual)', achar: /registro comercial/ },
  { id: 'cnpj', nivel: 'III', rotulo: 'Inscrição no CNPJ', achar: /(inscricao|comprovante de inscricao)[^.]{0,60}(cnpj|cadastro nacional da pessoa juridica)/ },
  { id: 'federal', nivel: 'III', rotulo: 'Certidão de tributos federais e Dívida Ativa da União (Receita/PGFN)', achar: /(tributos federais|divida ativa da uniao|receita federal|pgfn|procuradoria[- ]geral da fazenda nacional)/ },
  { id: 'fgts', nivel: 'III', rotulo: 'Regularidade do FGTS (CRF)', achar: /(fgts|fundo de garantia (?:por|do) tempo de servico)/ },
  { id: 'cndt', nivel: 'III', rotulo: 'Certidão negativa de débitos trabalhistas (CNDT)', achar: /(debitos trabalhistas|cndt|justica do trabalho)/ },
  { id: 'seguridade', nivel: 'III', rotulo: 'Regularidade com a Seguridade Social (INSS)', achar: /(seguridade social|contribuicoes previdenciarias|inss)/ },
  { id: 'inscricao_estadual_municipal', nivel: 'IV', rotulo: 'Inscrição no cadastro de contribuintes estadual/municipal', achar: /inscricao[^.]{0,60}cadastro de contribuintes|cadastro de contribuintes (?:estadual|municipal)/ },
  { id: 'estadual', nivel: 'IV', rotulo: 'Regularidade com a Fazenda Estadual', achar: /(fazenda estadual|tributos estaduais|icms|fazenda do estado|fazenda publica estadual)/ },
  { id: 'municipal', nivel: 'IV', rotulo: 'Regularidade com a Fazenda Municipal', achar: /(fazenda municipal|tributos municipais|iss\b|fazenda do municipio|fazenda publica municipal)/ },
  { id: 'atestado', nivel: 'V', rotulo: 'Atestado(s) de capacidade técnica', achar: /atestados? (?:de capacidade tecnic\w+|de aptidao|de fornecimento|fornecidos? por)|capacidade tecnic\w+[^.]{0,80}atestado|capacidade tecnico[- ]?(?:operacional|profissional)[^.]{0,200}atestados?|atestados?[^.]{0,200}capacidade tecnico[- ]?(?:operacional|profissional)|atestados?[^.]{0,100}(?:experiencia anterior|desempenho anterior|fornecimento (?:anterior|de bens|do objeto|de materiais))/ },
  { id: 'conselho', nivel: 'V', rotulo: 'Registro em conselho profissional', achar: /(registro|inscricao)[^.]{0,60}(conselho (?:regional|profissional|de classe)|crea|crq|crf\b)/ },
  { id: 'balanco', nivel: 'VI', rotulo: 'Balanço patrimonial e demonstrações contábeis (dois últimos exercícios)', achar: /(balanco patrimonial|demonstracoes contabeis|demonstracao do resultado)/ },
  { id: 'falencia', nivel: 'VI', rotulo: 'Certidão negativa de falência / recuperação judicial', achar: /(certidao negativa de falencia|falencia[^.]{0,80}certidao|recuperacao judicial[^.]{0,80}certidao|certidao[^.]{0,80}recuperacao judicial)/ },
  { id: 'indices', nivel: 'VI', rotulo: 'Índices contábeis / patrimônio líquido ou capital mínimo', achar: /(indices? de liquidez|liquidez (?:geral|corrente)|patrimonio liquido minimo|capital (?:social )?minimo|capital circulante)/ },
  { id: 'decl_me_epp', nivel: 'FORA', rotulo: 'Declaração de enquadramento como ME/EPP', achar: /declaracao[^.]{0,120}(microempresa|empresa de pequeno porte|me\/epp|me ou epp|me e epp)|(microempresa|empresa de pequeno porte)[^.]{0,80}declaracao/ },
  { id: 'decl_menor', nivel: 'FORA', rotulo: 'Declaração de não emprego de menores (art. 7º, XXXIII, CF)', achar: /(trabalho (?:noturno|insalubre|perigoso)[^.]{0,80}menores|menores de (?:18|dezoito)|inciso xxxiii)/ },
  { id: 'decl_impeditivo', nivel: 'FORA', rotulo: 'Declaração de inexistência de fato impeditivo', achar: /(fato impeditivo|inexistencia de fatos? impeditiv\w+|declaracao de idoneidade|nao ter sido declarad\w+ inidone\w+)/ },
  { id: 'decl_proposta', nivel: 'FORA', rotulo: 'Declaração de elaboração independente de proposta', achar: /elaboracao independente de proposta|proposta (?:foi )?elaborada de forma independente/ },
  { id: 'decl_pcd', nivel: 'FORA', rotulo: 'Declaração de cumprimento de reserva de cargos (PcD / reabilitados)', achar: /(reserva de cargos|art(?:igo)?\.? 93 da lei (?:n[ºo.]? ?)?8\.?213|pessoas? com deficiencia[^.]{0,80}reabilitad)/ },
  { id: 'amostra', nivel: 'FORA', rotulo: 'Amostra', achar: /amostras?\b/ },
  { id: 'visita', nivel: 'FORA', rotulo: 'Visita técnica / vistoria', achar: /(visita tecnica|vistoria)[^.]{0,120}(obrigatori|facultativ|declaracao|agend)|(obrigatori|facultativ)[^.]{0,80}(visita tecnica|vistoria)/ },
]

const SICAF_ACEITA = /(documentos?|habilitacao|regularidade|cadastr\w+|comprov\w+)[^.]{0,120}(constantes?|cadastrad\w+|contid\w+|disponibiliz\w+|consult\w+|verific\w+)[^.]{0,60}sicaf|sicaf[^.]{0,120}(substitu\w+|dispens\w+|habilitacao|regularidade|comprov\w+)/
const IGNORAR_SICAF = /no ambito dos orgaos e entidades integrantes/

function ordemDocumento(tipo = '') {
  const t = simplificar(tipo)
  if (t.includes('edital')) return 0
  if (t.includes('termo de referencia')) return 1
  if (t.includes('minuta') || t.includes('contrato') || t.includes('ata')) return 3
  return 2
}

function trechoDe(original, indice) {
  const ini = Math.max(0, indice - 80)
  const fim = Math.min(original.length, indice + 900)
  let trecho = original.slice(ini, fim).replace(/\s+/g, ' ').trim()
  if (ini > 0) trecho = `…${trecho}`
  if (fim < original.length) trecho = `${trecho}…`
  return trecho
}

// Quando o edital pede o documento: junto da proposta ou só de quem for classificado em 1º lugar.
const SO_ARREMATANTE = /(arrematante|primeiro colocado|primeira colocada|classificad[oa] em primeiro|melhor classificad|vencedor|declarad[oa] vencedor|convocad[oa]s? para (?:apresentar|enviar|encaminhar)|apos (?:a )?(?:fase de lances|aceitacao|negociacao|convocacao))/
const COM_PROPOSTA = /(junto (?:com )?a proposta|juntamente com a proposta|com a proposta|no cadastramento da proposta|no envio da proposta|ate a (?:data|hora) (?:e horario )?(?:da|de) abertura)/
// O documento vale para o item que a empresa disputa ou para a empresa toda.
const POR_ITEM = /(item de interesse|por item|cada item|item licitado|item ofertado|itens? cotados?|itens? que pretende|itens? (?:pelo|pelos) qua\w+ (?:concorr|disput))/

export function classificarContexto(simples, indice) {
  const janela = simples.slice(Math.max(0, indice - 200), indice + 900)
  const arrematante = SO_ARREMATANTE.test(janela)
  const proposta = COM_PROPOSTA.test(janela)
  return { momento: arrematante && !proposta ? 'arrematante' : proposta ? 'proposta' : 'indefinido', escopo: POR_ITEM.test(janela) ? 'por_item' : 'empresa' }
}

// "Grupos 01, 02 ou 05" / "Grupos 1 a 3" logo depois do trecho: devolve [1, 2, 5] / [1, 2, 3].
export function extrairGrupos(simples, indice) {
  // Só vale o que está na mesma cláusula: o texto para na próxima numeração (ex.: "9.21").
  const janela = simples.slice(indice, indice + 700)
  const corte = janela.slice(20).search(/\s\d{1,2}\.\d{1,3}(?:\.\d+)*\s/)
  const m = /grupos? (\d{1,2}(?:\s*(?:,|;|e|ou|a|ao|ate)\s*\d{1,2})*)/.exec(corte >= 0 ? janela.slice(0, corte + 20) : janela)
  if (!m) return []
  const pecas = m[1].split(/\s*(,|;|e|ou|a|ao|ate)\s*/).filter(Boolean)
  const numeros = new Set()
  for (let i = 0; i < pecas.length; i += 2) {
    const atual = Number(pecas[i])
    const separador = pecas[i - 1]
    if (['a', 'ao', 'ate'].includes(separador) && i >= 2) {
      for (let n = Number(pecas[i - 2]); n <= atual && n - Number(pecas[i - 2]) < 30; n += 1) numeros.add(n)
    }
    numeros.add(atual)
  }
  return [...numeros].sort((a, b) => a - b)
}

function procurar(docs, padrao, ignorar) {
  for (const doc of docs) {
    for (const pagina of doc.paginas ?? []) {
      const original = pagina.texto ?? ''
      const simples = simplificar(original)
      const m = padrao.exec(simples)
      if (!m || (ignorar && ignorar.test(m[0]))) continue
      return { trecho: trechoDe(original, m.index), fonte: { arquivo: doc.arquivo, tipo: doc.tipo, pagina: pagina.pagina }, ...classificarContexto(simples, m.index), grupos: extrairGrupos(simples, m.index) }
    }
  }
  return null
}

export function extrairHabilitacao(documentos) {
  const docs = [...(documentos ?? [])].sort((a, b) => ordemDocumento(a.tipo) - ordemDocumento(b.tipo))
  const semTexto = docs.filter((d) => !d.paginas?.some((p) => (p.texto ?? '').trim().length > 40)).map((d) => ({ arquivo: d.arquivo, tipo: d.tipo }))
  const exigencias = []
  for (const regra of REGRAS) {
    const achado = procurar(docs, regra.achar)
    if (achado) exigencias.push({ id: regra.id, nivel: regra.nivel, rotulo: regra.rotulo, ...achado })
  }
  const sicaf = procurar(docs, SICAF_ACEITA, IGNORAR_SICAF)
  return {
    exigencias,
    sicaf: sicaf ? { citado: true, ...sicaf } : { citado: false },
    semTexto,
    documentos: docs.map((d) => ({ arquivo: d.arquivo, tipo: d.tipo, paginas: d.paginas?.length ?? 0 })),
  }
}
