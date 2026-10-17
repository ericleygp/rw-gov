import test from 'node:test'
import assert from 'node:assert/strict'
import { identificacaoNoSistema, nomeArquivoProposta, rotuloCompra } from './compra.js'

const ufpa = { modality: 'Dispensa', numeroCompra: '955', anoCompra: 2026, uasg: '153063', linkSistema: 'https://exemplo/compra' }

test('rotulo da dispensa usa o numero do sistema, nao o do processo', () => {
  assert.equal(rotuloCompra(ufpa), 'Dispensa Eletrônica nº 955/2026')
})

test('outras modalidades mantem o nome do PNCP', () => {
  assert.equal(rotuloCompra({ modality: 'Pregão - Eletrônico', numeroCompra: '90014', anoCompra: 2026 }), 'Pregão - Eletrônico nº 90014/2026')
})

test('sem numero da compra nao inventa rotulo', () => {
  assert.equal(rotuloCompra({ modality: 'Dispensa' }), null)
  assert.equal(identificacaoNoSistema({}), null)
})

test('identificacao junta numero, UASG e link', () => {
  const id = identificacaoNoSistema(ufpa)
  assert.equal(id.texto, 'Dispensa Eletrônica nº 955/2026 · UASG 153063')
  assert.equal(id.link, 'https://exemplo/compra')
})

test('so UASG ainda e mostrada', () => {
  assert.equal(identificacaoNoSistema({ uasg: '153063' }).texto, 'UASG 153063')
})

test('nome do arquivo da proposta traz compra e UASG', () => {
  assert.equal(nomeArquivoProposta(ufpa, 'pncp-x'), 'proposta-compra-955-2026-uasg-153063.csv')
  assert.equal(nomeArquivoProposta({}, 'pncp-x'), 'proposta-pncp-x.csv')
})
