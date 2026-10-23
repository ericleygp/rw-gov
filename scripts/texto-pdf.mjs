// Lê o texto dos PDFs baixados (página por página). Se o PDF for escaneado (só imagem), lê por OCR (scripts/ocr-pdf.mjs).
import fs from 'node:fs'
import path from 'node:path'
import { ocrDisponivel, ocrPdf } from './ocr-pdf.mjs'

export async function extrairTextoPdf(caminho) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const dados = new Uint8Array(fs.readFileSync(caminho))
  const tarefa = getDocument({ data: dados, useSystemFonts: true, verbosity: 0 })
  const doc = await tarefa.promise
  const paginas = []
  for (let n = 1; n <= doc.numPages; n += 1) {
    const pagina = await doc.getPage(n)
    const conteudo = await pagina.getTextContent()
    let texto = ''
    for (const item of conteudo.items) {
      texto += item.str
      texto += item.hasEOL ? '\n' : ' '
    }
    paginas.push({ pagina: n, texto: texto.replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').trim() })
  }
  try { await tarefa.destroy() } catch { /* sem efeito */ }
  return paginas
}

const vazia = (p) => (p.texto ?? '').trim().length < 20
export const precisaDeOcr = (paginas) => paginas.length > 0 && paginas.filter(vazia).length / paginas.length >= 0.5

// Páginas sem texto (PDF escaneado) são lidas por OCR; as que já tinham texto ficam como estão.
async function comOcr(pdf, paginas, nome) {
  const alvo = new Set(paginas.filter(vazia).map((p) => p.pagina))
  console.log(`  ${nome}: PDF escaneado, lendo ${alvo.size} página(s) por OCR (leva cerca de 3 segundos por página)...`)
  const lidas = await ocrPdf(pdf, (n, t) => process.stdout.write(`    OCR ${n}/${t}\r`), alvo)
  console.log()
  const porPagina = new Map(lidas.map((p) => [p.pagina, p]))
  return paginas.map((p) => porPagina.get(p.pagina) ?? p)
}

// Cache de um PDF sem texto e sem tentativa de OCR (feito antes do OCR existir) é refeito.
const cacheServe = (paginas) => !(precisaDeOcr(paginas) && !paginas.some((p) => p.ocr) && ocrDisponivel())

// Lê (e guarda em cache ao lado do PDF) o texto de todos os PDFs de um edital já baixado.
export async function textosDoEdital(pasta, arquivos) {
  const saida = []
  for (const a of arquivos) {
    if (!a.arquivo || !/\.pdf$/i.test(a.arquivo)) continue
    const pdf = path.join(pasta, a.arquivo)
    const cache = `${pdf}.texto.json`
    let paginas
    try {
      if (fs.existsSync(cache) && fs.statSync(cache).mtimeMs >= fs.statSync(pdf).mtimeMs) paginas = JSON.parse(fs.readFileSync(cache, 'utf8'))
      if (paginas && !cacheServe(paginas)) paginas = null
    } catch { /* refaz */ }
    if (!paginas) {
      try {
        paginas = await extrairTextoPdf(pdf)
        if (precisaDeOcr(paginas) && ocrDisponivel()) {
          try { paginas = await comOcr(pdf, paginas, a.arquivo) } catch (e) { console.log(`  OCR falhou em ${a.arquivo}: ${e.message}`) }
        }
        fs.writeFileSync(cache, JSON.stringify(paginas))
      } catch (e) { paginas = []; console.log(`  não consegui ler ${a.arquivo}: ${e.message}`) }
    }
    saida.push({ arquivo: a.arquivo, tipo: a.tipo || a.titulo || '', paginas })
  }
  return saida
}
