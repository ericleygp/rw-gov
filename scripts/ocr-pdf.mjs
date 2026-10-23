// OCR de PDF escaneado (só imagem): desenha cada página e lê o texto com o Tesseract (português).
// Roda 100% no seu computador, sem enviar nada para a internet. Os dados de idioma ficam em ocr\por.traineddata.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PASTA_IDIOMA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'ocr')
export const OCR_MAX_PAGINAS = Number(process.env.OCR_MAX_PAGINAS ?? 80)
const ESCALA = Number(process.env.OCR_ESCALA ?? 2.8) // 72 dpi x 2,8 ≈ 200 dpi

export const ocrDisponivel = () => process.env.OCR_OFF !== '1' && fs.existsSync(path.join(PASTA_IDIOMA, 'por.traineddata'))

// Devolve [{ pagina, texto, ocr: true }] só das páginas pedidas (todas, se `somente` for null). Páginas além do limite voltam vazias.
export async function ocrPdf(caminho, aoProgredir = () => {}, somente = null) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const { createWorker } = await import('tesseract.js')
  const tarefa = getDocument({ data: new Uint8Array(fs.readFileSync(caminho)), useSystemFonts: true, verbosity: 0 })
  const doc = await tarefa.promise
  const worker = await createWorker('por', 1, { langPath: PASTA_IDIOMA, gzip: false, cacheMethod: 'none', logger: () => {} })
  const paginas = []
  try {
    const alvo = [...Array(doc.numPages).keys()].map((i) => i + 1).filter((n) => !somente || somente.has(n))
    for (const n of alvo) {
      if (n > OCR_MAX_PAGINAS) { paginas.push({ pagina: n, texto: '', ocr: true }); continue }
      aoProgredir(paginas.length + 1, Math.min(alvo.length, OCR_MAX_PAGINAS))
      const pagina = await doc.getPage(n)
      const viewport = pagina.getViewport({ scale: ESCALA })
      const { canvas, context } = doc.canvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height))
      await pagina.render({ canvasContext: context, viewport, canvas }).promise
      const { data } = await worker.recognize(canvas.toBuffer('image/png'))
      paginas.push({ pagina: n, texto: String(data.text ?? '').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim(), ocr: true })
    }
  } finally {
    await worker.terminate()
    try { await tarefa.destroy() } catch { /* sem efeito */ }
  }
  return paginas
}
