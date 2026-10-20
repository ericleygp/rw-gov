import test from 'node:test'
import assert from 'node:assert/strict'
import { identificarPlataforma, avisoCadastro } from './plataforma.js'

test('link do Compras.gov.br: empresa tem cadastro, sem aviso', () => {
  for (const link of ['https://compras.gov.br/x', 'https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras/acompanhamento-compra?compra=1']) {
    const p = identificarPlataforma({ linkSistema: link })
    assert.equal(p.id, 'comprasgov')
    assert.equal(p.status, 'tem')
    assert.equal(avisoCadastro(p), null)
  }
})

test('portal de cotação do Banpará: sem cadastro, aviso forte', () => {
  const p = identificarPlataforma({ linkSistema: 'https://cotacao.banpara.b.br/default.aspx' })
  assert.equal(p.id, 'banpara')
  assert.equal(p.status, 'nao')
  assert.match(avisoCadastro(p), /^SEM CADASTRO/)
})

test('sem link: não afirma Compras.gov.br, manda conferir', () => {
  const p = identificarPlataforma({ uasg: '36' })
  assert.equal(p.identificada, false)
  assert.equal(p.status, 'verificar')
  assert.match(avisoCadastro(p), /Confirme/)
})

test('plataforma conhecida sem cadastro registrado fica como verificar', () => {
  const p = identificarPlataforma({ linkSistema: 'https://bll.org.br/x' })
  assert.equal(p.id, 'bll')
  assert.equal(p.status, 'verificar')
})
