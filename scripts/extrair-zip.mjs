// Abre os ZIPs baixados de um edital e registra os PDFs de dentro no manifest.json,
// para que a leitura, a avaliação de habilitação e o app os enxerguem como os demais arquivos.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { lerManifesto, pastaDoEdital, slug } from './baixar-arquivos.mjs'

const executar = promisify(execFile)

// Tenta, em ordem, as ferramentas que costumam existir: tar (Windows 10+/macOS), PowerShell (Windows) e unzip (Linux).
export async function descompactar(zip, destino) {
  const tentativas = [
    ['tar', ['-xf', zip, '-C', destino]],
    ...(process.platform === 'win32' ? [['powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zip.replaceAll("'", "''")}' -DestinationPath '${destino.replaceAll("'", "''")}' -Force`]]] : []),
    ['unzip', ['-o', '-q', zip, '-d', destino]],
  ]
  let ultimoErro
  for (const [comando, args] of tentativas) {
    try { await executar(comando, args, { timeout: 120000 }); return true } catch (e) { ultimoErro = e }
  }
  throw new Error(`não consegui abrir o ZIP (${ultimoErro?.message ?? 'sem ferramenta'})`)
}

function listarPdfs(raiz) {
  const achados = []
  const base = path.resolve(raiz)
  const visitar = (pasta) => {
    for (const entrada of fs.readdirSync(pasta, { withFileTypes: true })) {
      const caminho = path.resolve(pasta, entrada.name)
      if (!caminho.startsWith(base + path.sep)) continue
      if (entrada.isDirectory()) visitar(caminho)
      else if (entrada.isFile() && /\.pdf$/i.test(entrada.name)) achados.push(caminho)
    }
  }
  visitar(base)
  return achados.sort()
}

// Retorna { extraidos, zips, semPdf }: semPdf = há ZIP(s) aberto(s) e nenhum PDF dentro.
export async function extrairZips(ref) {
  const pasta = pastaDoEdital(ref)
  const manifesto = lerManifesto(ref)
  if (!manifesto) return { extraidos: 0, zips: 0, semPdf: false }
  const zips = manifesto.arquivos.filter((a) => a.arquivo && /\.zip$/i.test(a.arquivo) && fs.existsSync(path.join(pasta, a.arquivo)))
  let extraidos = 0
  for (const zip of zips) {
    const jaExtraidos = manifesto.arquivos.filter((a) => a.origem === zip.arquivo && a.arquivo && fs.existsSync(path.join(pasta, a.arquivo))).length
    if (jaExtraidos > 0) { extraidos += jaExtraidos; continue }
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rwgov-zip-'))
    try {
      await descompactar(path.join(pasta, zip.arquivo), temp)
      for (const pdf of listarPdfs(temp)) {
        const nome = `${String(zip.seq).padStart(2, '0')}-${slug(path.basename(zip.arquivo, '.zip'))}-${slug(path.basename(pdf, path.extname(pdf)))}.pdf`
        fs.copyFileSync(pdf, path.join(pasta, nome))
        manifesto.arquivos.push({ seq: zip.seq, titulo: path.basename(pdf), tipo: zip.tipo, arquivo: nome, bytes: fs.statSync(pdf).size, status: 200, origem: zip.arquivo })
        extraidos += 1
      }
    } catch (e) {
      console.log(`  ${path.basename(pasta)}: ${e.message}`)
    } finally {
      fs.rmSync(temp, { recursive: true, force: true })
    }
  }
  if (extraidos > 0) fs.writeFileSync(path.join(pasta, 'manifest.json'), JSON.stringify(manifesto, null, 1))
  return { extraidos, zips: zips.length, semPdf: zips.length > 0 && extraidos === 0 }
}
