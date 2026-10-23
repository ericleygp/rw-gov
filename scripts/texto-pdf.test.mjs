import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { precisaDeOcr, textosDoEdital } from './texto-pdf.mjs'
import { ocrDisponivel } from './ocr-pdf.mjs'

test('precisa de OCR quando metade ou mais das páginas está sem texto', () => {
  assert.equal(precisaDeOcr([{ pagina: 1, texto: '' }, { pagina: 2, texto: '' }]), true)
  assert.equal(precisaDeOcr([{ pagina: 1, texto: 'Texto normal de um edital com bastante conteúdo.' }, { pagina: 2, texto: '' }]), true)
  assert.equal(precisaDeOcr([{ pagina: 1, texto: 'Texto normal de um edital com bastante conteúdo.' }, { pagina: 2, texto: 'Outra página com texto suficiente.' }]), false)
  assert.equal(precisaDeOcr([]), false)
})

test('PDF escaneado é lido por OCR, marcado como OCR e guardado em cache', { skip: !ocrDisponivel(), timeout: 120000 }, async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'rwgov-ocr-'))
  fs.copyFileSync(new URL('./fixtures/escaneado.pdf', import.meta.url), path.join(pasta, 'escaneado.pdf'))
  const [doc] = await textosDoEdital(pasta, [{ arquivo: 'escaneado.pdf', tipo: 'Termo de Referência' }])
  const texto = doc.paginas.map((p) => p.texto).join('\n')
  assert.match(texto, /15 \(quinze\) dias corridos/)
  assert.match(texto, /multa de 10%/i)
  assert.match(texto, /R\$ 58,80/)
  assert.ok(doc.paginas.every((p) => p.ocr === true))
  const cache = JSON.parse(fs.readFileSync(path.join(pasta, 'escaneado.pdf.texto.json'), 'utf8'))
  assert.equal(cache.length, 2)
  const [de_novo] = await textosDoEdital(pasta, [{ arquivo: 'escaneado.pdf' }])
  assert.deepEqual(de_novo.paginas, doc.paginas)
})

test('OCR desligado (OCR_OFF=1) mantém o comportamento antigo: PDF escaneado volta sem texto', async () => {
  const antes = process.env.OCR_OFF
  process.env.OCR_OFF = '1'
  try {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'rwgov-semocr-'))
    fs.copyFileSync(new URL('./fixtures/escaneado.pdf', import.meta.url), path.join(pasta, 'escaneado.pdf'))
    const [doc] = await textosDoEdital(pasta, [{ arquivo: 'escaneado.pdf' }])
    assert.ok(doc.paginas.every((p) => p.texto === '' && !p.ocr))
  } finally {
    if (antes === undefined) delete process.env.OCR_OFF
    else process.env.OCR_OFF = antes
  }
})
