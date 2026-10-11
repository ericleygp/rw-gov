import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { parseEditalRef, slug, extensaoDe } from './baixar-arquivos.mjs'

const executar = promisify(execFile)
const rodarNode = async (args, env) => { try { const r = await executar(process.execPath, args, { env, encoding: 'utf8', timeout: 30000 }); return { status: 0, stdout: r.stdout } } catch (e) { return { status: e.code ?? 1, stdout: e.stdout ?? '' } } }

test('parseEditalRef lê o link do PNCP e o número de controle', () => {
  assert.deepEqual(parseEditalRef('https://pncp.gov.br/app/editais/05059936000101/2026/38'), { cnpj: '05059936000101', ano: '2026', seq: '38' })
  assert.deepEqual(parseEditalRef('05059936000101/2026/038'), { cnpj: '05059936000101', ano: '2026', seq: '38' })
  assert.equal(parseEditalRef('texto sem edital'), null)
})

test('slug e extensão', () => {
  assert.equal(slug('Termo de Referência (assinado)'), 'Termo-de-Referencia-assinado')
  assert.equal(extensaoDe({ contentDisposition: 'attachment; filename="edital.PDF"' }), '.pdf')
  assert.equal(extensaoDe({ bytes: Buffer.from('%PDF-1.7') }), '.pdf')
  assert.equal(extensaoDe({ bytes: Buffer.from([0x50, 0x4b, 3, 4]) }), '.zip')
  assert.equal(extensaoDe({ contentType: 'application/octet-stream' }), '.bin')
})

test('baixa os arquivos de um edital simulado, sem repetir na segunda vez', async () => {
  const pedidos = []
  const servidor = http.createServer((req, res) => {
    pedidos.push(req.url)
    if (req.url.endsWith('/arquivos')) {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify([
        { sequencialDocumento: 1, tipoDocumentoNome: 'Edital', titulo: 'Edital PE 16', statusAtivo: true },
        { sequencialDocumento: 2, tipoDocumentoNome: 'Termo de Referência', titulo: 'TR', statusAtivo: true },
        { sequencialDocumento: 3, tipoDocumentoNome: 'Outro', titulo: 'Removido', statusAtivo: false },
        { sequencialDocumento: 4, tipoDocumentoNome: 'ETP', titulo: 'ETP', statusAtivo: true },
      ]))
    } else if (req.url.endsWith('/arquivos/1')) { res.end('%PDF-1.7 edital') }
    else if (req.url.endsWith('/arquivos/2')) { res.setHeader('content-disposition', 'attachment; filename="tr.pdf"'); res.end('conteudo tr') }
    else { res.statusCode = 404; res.end() }
  })
  await new Promise((r) => servidor.listen(0, r))
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rwgov-'))
  const env = { ...process.env, PNCP_BASE: `http://127.0.0.1:${servidor.address().port}/api`, EDITAIS_DIR: dir, PNCP_PAUSA_MS: '1' }
  const script = path.join(import.meta.dirname, 'baixar-arquivos.mjs')
  const rodar = () => rodarNode([script, '05059936000101/2026/38'], env)
  const r1 = await rodar()
  const pasta = path.join(dir, '05059936000101-2026-38')
  assert.match(r1.stdout, /2 arquivo\(s\) novo\(s\)/)
  assert.deepEqual(fs.readdirSync(pasta).sort(), ['01-Edital.pdf', '02-Termo-de-Referencia.pdf', 'manifest.json'])
  const manifest = JSON.parse(fs.readFileSync(path.join(pasta, 'manifest.json'), 'utf8'))
  assert.equal(manifest.bruto.length, 4)
  assert.equal(manifest.arquivos.find((a) => a.seq === 4).arquivo, null)
  const antes = pedidos.filter((u) => /arquivos\/\d/.test(u)).length
  const r2 = await rodar()
  assert.match(r2.stdout, /0 arquivo\(s\) novo\(s\)/)
  assert.equal(pedidos.filter((u) => /arquivos\/\d/.test(u)).length, antes + 1) // só tenta de novo o que falhou (seq 4)
  servidor.close()
  fs.rmSync(dir, { recursive: true, force: true })
})

test('edital sem lista de arquivos não derruba o script', async () => {
  const servidor = http.createServer((req, res) => { res.statusCode = 404; res.end() })
  await new Promise((r) => servidor.listen(0, r))
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rwgov-'))
  const env = { ...process.env, PNCP_BASE: `http://127.0.0.1:${servidor.address().port}/api`, EDITAIS_DIR: dir, PNCP_PAUSA_MS: '1' }
  const r = await rodarNode([path.join(import.meta.dirname, 'baixar-arquivos.mjs'), '05059936000101/2026/99'], env)
  assert.equal(r.status, 0)
  assert.match(r.stdout, /1 edital\(is\) sem lista/)
  servidor.close()
  fs.rmSync(dir, { recursive: true, force: true })
})
