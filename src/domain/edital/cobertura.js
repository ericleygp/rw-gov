// Diz, para cada edital, se o app conseguiu ler o que precisa para avaliar a habilitação.
// Quando não conseguiu, informa o motivo e o que fazer.
export const COBERTURA = {
  ok: { rotulo: 'Lido', motivo: 'Arquivos baixados e lidos.', acao: '' },
  sem_referencia: { rotulo: 'Sem número do PNCP', motivo: 'Não achei o número do PNCP (CNPJ/ano/sequencial) no link desta oportunidade.', acao: 'Abrir a compra no PNCP e conferir o link.' },
  nao_baixado: { rotulo: 'Não baixado', motivo: 'Os arquivos deste edital ainda não foram baixados.', acao: 'Será tentado na próxima atualização.' },
  falha_lista: { rotulo: 'PNCP não respondeu', motivo: 'O PNCP não devolveu a lista de arquivos desta compra.', acao: 'Tentar de novo mais tarde ou baixar pelo site do PNCP.' },
  sem_arquivos_pncp: { rotulo: 'Sem arquivos no PNCP', motivo: 'O PNCP não lista nenhum arquivo para esta compra.', acao: 'Buscar o edital no site do órgão ou no portal da licitação.' },
  falha_download: { rotulo: 'Download falhou', motivo: 'O PNCP lista arquivos, mas nenhum foi baixado.', acao: 'Tentar de novo ou baixar manualmente pelo PNCP.' },
  zip_sem_pdf: { rotulo: 'ZIP sem PDF', motivo: 'Abri o ZIP, mas não há PDF dentro (talvez Word, planilha ou imagem).', acao: 'Abrir o ZIP e ler o edital manualmente.' },
  sem_pdf: { rotulo: 'Sem PDF', motivo: 'Os arquivos baixados não são PDF (por exemplo, ZIP).', acao: 'Abrir o arquivo e copiar os PDFs para a pasta do edital.' },
  escaneado: { rotulo: 'PDF escaneado', motivo: 'Os PDFs são imagem, sem texto para o app ler.', acao: 'Ler o edital manualmente (o app ainda não faz OCR).' },
  sem_palavras_chave: { rotulo: 'Sem exigências detectadas', motivo: 'O texto foi lido, mas não encontrei exigências de habilitação.', acao: 'Conferir o edital manualmente; pode ser outro formato de texto.' },
}

const temTexto = (doc) => doc.paginas?.some((p) => String(p.texto ?? '').trim().length > 40)

export function classificarCobertura({ ref, manifesto, textos = [], exigencias = [], falhaLista = false, zipSemPdf = false }) {
  const resultado = (status, extra = {}) => ({ status, ...COBERTURA[status], faltamArquivos: 0, ...extra })
  if (!ref) return resultado('sem_referencia')
  if (!manifesto) return resultado(falhaLista ? 'falha_lista' : 'nao_baixado')
  const arquivos = Array.isArray(manifesto.arquivos) ? manifesto.arquivos : []
  if (arquivos.length === 0) return resultado('sem_arquivos_pncp')
  const baixados = arquivos.filter((a) => a.arquivo)
  const faltamArquivos = arquivos.length - baixados.length
  if (baixados.length === 0) return resultado('falha_download', { faltamArquivos })
  if (!baixados.some((a) => /\.pdf$/i.test(a.arquivo))) return resultado(zipSemPdf ? 'zip_sem_pdf' : 'sem_pdf', { faltamArquivos })
  if (!textos.some(temTexto)) return resultado('escaneado', { faltamArquivos })
  if (exigencias.length === 0) return resultado('sem_palavras_chave', { faltamArquivos })
  return resultado('ok', { faltamArquivos })
}
