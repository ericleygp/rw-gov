// Lê o texto dos PDFs baixados (página por página). PDF escaneado (só imagem) volta sem texto.
import fs from 'node:fs'
import path from 'node:path'

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
    } catch { /* refaz */ }
    if (!paginas) {
      try { paginas = await extrairTextoPdf(pdf); fs.writeFileSync(cache, JSON.stringify(paginas)) } catch (e) { paginas = []; console.log(`  não consegui ler ${a.arquivo}: ${e.message}`) }
    }
    saida.push({ arquivo: a.arquivo, tipo: a.tipo || a.titulo || '', paginas })
  }
  return saida
}
