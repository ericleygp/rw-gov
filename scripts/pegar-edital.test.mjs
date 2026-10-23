import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rwgov-pegar-'))
process.env.EDITAIS_DIR = path.join(tmp, 'locais')
process.env.PUBLICOS_DIR = path.join(tmp, 'publicos')
const { parseNumeroAno, lerArgumentos, acharCompra, refDaCompra, publicar } = await import('./pegar-edital.mjs')

test('número/ano em formatos comuns', () => {
  assert.deepEqual(parseNumeroAno('17/2026'), { numero: 17, ano: 2026 })
  assert.deepEqual(parseNumeroAno('00017-2026'), { numero: 17, ano: 2026 })
  assert.equal(parseNumeroAno('abc'), null)
})

test('argumentos: UASG + número/ano, link do PNCP e erro', () => {
  assert.deepEqual(lerArgumentos(['925848', '17/2026']), { git: true, uf: 'PA', modalidade: '6', uasg: '925848', numero: 17, ano: 2026 })
  const link = lerArgumentos(['https://pncp.gov.br/app/editais/05059936000101/2026/38', '--sem-git'])
  assert.deepEqual(link.ref, { cnpj: '05059936000101', ano: '2026', seq: '38' })
  assert.equal(link.git, false)
  assert.equal(lerArgumentos([]).erro, true)
})

test('acha a compra pela UASG e número/ano, não só pelo número', () => {
  const compras = [
    { unidadeOrgao: { codigoUnidade: '111111' }, numeroCompra: '17', anoCompra: 2026, orgaoEntidade: { cnpj: '1' }, sequencialCompra: 1 },
    { unidadeOrgao: { codigoUnidade: 925848 }, numeroCompra: '00017', anoCompra: 2025, orgaoEntidade: { cnpj: '2' }, sequencialCompra: 2 },
    { unidadeOrgao: { codigoUnidade: 925848 }, numeroCompra: '17', anoCompra: 2026, orgaoEntidade: { cnpj: '05272000000100' }, sequencialCompra: 9 },
  ]
  const c = acharCompra(compras, { uasg: '925848', numero: 17, ano: 2026 })
  assert.deepEqual(refDaCompra(c), { cnpj: '05272000000100', ano: '2026', seq: '9' })
  assert.equal(acharCompra(compras, { uasg: '925848', numero: 18, ano: 2026 }), null)
})

test('publicar copia só PDF e JSON e pula arquivo grande', () => {
  const ref = { cnpj: '1', ano: '2026', seq: '9' }
  const origem = path.join(process.env.EDITAIS_DIR, '1-2026-9')
  fs.mkdirSync(origem, { recursive: true })
  fs.writeFileSync(path.join(origem, '01-Edital.pdf'), 'x')
  fs.writeFileSync(path.join(origem, 'manifest.json'), '{}')
  fs.writeFileSync(path.join(origem, 'lixo.zip'), 'z')
  const r = publicar(ref, process.env.EDITAIS_DIR)
  assert.equal(r.arquivos, 2)
  assert.ok(fs.existsSync(path.join(process.env.PUBLICOS_DIR, '1-2026-9', '01-Edital.pdf')))
  assert.ok(!fs.existsSync(path.join(process.env.PUBLICOS_DIR, '1-2026-9', 'lixo.zip')))
})
