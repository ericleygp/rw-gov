import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rwgov-test-'))
process.env.EDITAIS_DIR = tmp
const { extrairZips } = await import('./extrair-zip.mjs')

const tabela = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = tabela[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }

// ZIP mínimo, sem compressão, só para o teste.
function criarZip(entradas) {
  const locais = []
  const centrais = []
  let deslocamento = 0
  for (const [nome, conteudo] of entradas) {
    const n = Buffer.from(nome)
    const crc = crc32(conteudo)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(conteudo.length, 18); local.writeUInt32LE(conteudo.length, 22); local.writeUInt16LE(n.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(conteudo.length, 20); central.writeUInt32LE(conteudo.length, 24); central.writeUInt16LE(n.length, 28); central.writeUInt32LE(deslocamento, 42)
    locais.push(local, n, conteudo)
    centrais.push(central, n)
    deslocamento += 30 + n.length + conteudo.length
  }
  const dirCentral = Buffer.concat(centrais)
  const fim = Buffer.alloc(22)
  fim.writeUInt32LE(0x06054b50, 0); fim.writeUInt16LE(entradas.length, 8); fim.writeUInt16LE(entradas.length, 10)
  fim.writeUInt32LE(dirCentral.length, 12); fim.writeUInt32LE(deslocamento, 16)
  return Buffer.concat([...locais, dirCentral, fim])
}

function prepararEdital(id, entradas) {
  const pasta = path.join(tmp, id)
  fs.mkdirSync(pasta, { recursive: true })
  fs.writeFileSync(path.join(pasta, '01-Edital.zip'), criarZip(entradas))
  fs.writeFileSync(path.join(pasta, 'manifest.json'), JSON.stringify({ arquivos: [{ seq: 1, tipo: 'Edital', arquivo: '01-Edital.zip', status: 200 }] }))
  const [cnpj, ano, seq] = id.split('-')
  return { cnpj, ano, seq, pasta }
}

test('abre o ZIP e registra os PDFs no manifest, sem repetir na segunda vez', async () => {
  const ref = prepararEdital('11111111000111-2026-1', [['Edital Final.pdf', Buffer.from('%PDF-1.4 a')], ['anexos/Termo.pdf', Buffer.from('%PDF-1.4 b')], ['leia.txt', Buffer.from('oi')]])
  const r = await extrairZips(ref)
  assert.deepEqual({ extraidos: r.extraidos, semPdf: r.semPdf }, { extraidos: 2, semPdf: false })
  const manifesto = JSON.parse(fs.readFileSync(path.join(ref.pasta, 'manifest.json'), 'utf8'))
  const pdfs = manifesto.arquivos.filter((a) => a.origem === '01-Edital.zip')
  assert.equal(pdfs.length, 2)
  for (const a of pdfs) assert.ok(fs.existsSync(path.join(ref.pasta, a.arquivo)))
  const outra = await extrairZips(ref)
  assert.equal(outra.extraidos, 2)
  assert.equal(JSON.parse(fs.readFileSync(path.join(ref.pasta, 'manifest.json'), 'utf8')).arquivos.length, 3)
})

test('ZIP sem PDF dentro é sinalizado', async () => {
  const ref = prepararEdital('22222222000122-2026-2', [['edital.docx', Buffer.from('x')]])
  const r = await extrairZips(ref)
  assert.equal(r.extraidos, 0)
  assert.equal(r.semPdf, true)
})

test('sem manifest, não faz nada', async () => {
  const r = await extrairZips({ cnpj: '99999999000199', ano: '2026', seq: '9' })
  assert.deepEqual(r, { extraidos: 0, zips: 0, semPdf: false })
})
