// Perfil de habilitação da empresa (níveis do SICAF feitos e validade das certidões).
// Fica em dados-locais/ (fora do GitHub) para o app e o script em lote usarem o mesmo arquivo.
import fs from 'node:fs'
import path from 'node:path'
import { PERFIL_PADRAO } from '../src/domain/edital/avaliacao.js'

const ARQUIVO = process.env.PERFIL_HABILITACAO || 'dados-locais/perfil-habilitacao.json'

export function lerPerfil() {
  try {
    const salvo = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'))
    return { ...PERFIL_PADRAO, ...salvo, niveis: { ...PERFIL_PADRAO.niveis, ...salvo.niveis }, validades: { ...PERFIL_PADRAO.validades, ...salvo.validades } }
  } catch { return structuredClone(PERFIL_PADRAO) }
}

const data = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? '')) ? v : '')

// Aceita só os campos conhecidos, para o arquivo não receber lixo.
export function gravarPerfil(entrada) {
  const perfil = {
    niveis: Object.fromEntries(Object.keys(PERFIL_PADRAO.niveis).map((n) => [n, Boolean(entrada?.niveis?.[n])])),
    atestados: Boolean(entrada?.atestados),
    conselho: Boolean(entrada?.conselho),
    validades: Object.fromEntries(Object.keys(PERFIL_PADRAO.validades).map((k) => [k, data(entrada?.validades?.[k])])),
  }
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true })
  fs.writeFileSync(ARQUIVO, JSON.stringify(perfil, null, 1))
  return perfil
}
