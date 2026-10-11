// Lê o texto do Edital / Termo de Referência e destaca o que pesa na decisão de participar.
// Regras simples e transparentes: cada observação traz o trecho original e a página, para você conferir.

const EXTENSO = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quinze: 15, vinte: 20, trinta: 30, sessenta: 60, noventa: 90 }

// Mantém o tamanho do texto (para os índices baterem com o original): tira acentos e põe em minúsculas.
export function simplificar(texto) {
  return String(texto ?? '').replace(/[\u00c0-\u017f]/g, (c) => c.normalize('NFD')[0]).toLowerCase()
}

function numeroDe(texto) {
  const digitos = /(\d{1,3})/.exec(texto)
  if (digitos) return Number(digitos[1])
  const palavra = /\b(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quinze|vinte|trinta|sessenta|noventa)\b/.exec(texto)
  return palavra ? EXTENSO[palavra[1]] : null
}

const NUM = String.raw`(?:\d{1,3}|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quinze|vinte|trinta|sessenta|noventa)`
const PRAZO = String.raw`(${NUM})(?:\s*\([a-z\s]+\))?\s*(dias\s*uteis|dias\s*corridos|dias|meses|mes|horas|anos?)`
const unidade = (u) => u.replace(/\s+/g, ' ').replace('uteis', 'úteis').replace(/^mes$/, 'mês')

function ordemDocumento(tipo = '') {
  const t = simplificar(tipo)
  if (t.includes('termo de referencia')) return 0
  if (t.includes('edital')) return 1
  if (t.includes('minuta') || t.includes('contrato') || t.includes('ata')) return 2
  return 3
}

// Cada regra devolve { valor, indice } a partir do texto simplificado de UMA página, ou null.
const REGRAS = [
  {
    id: 'julgamento', grupo: 'Disputa', rotulo: 'Critério de julgamento',
    achar(t) {
      const m = /menor preco[^.]{0,60}?(por item|por lote|por grupo|global|unitario)/.exec(t) || /(por item|por lote|por grupo|global)[^.]{0,40}menor preco/.exec(t)
      if (m) { const tipo = (m[1] || m[2]); return { valor: `Menor preço ${tipo === 'unitario' ? 'por item' : tipo}`, indice: m.index } }
      const s = /julgamento[^.]{0,60}menor preco/.exec(t)
      return s ? { valor: 'Menor preço', indice: s.index } : null
    },
  },
  {
    id: 'modo_disputa', grupo: 'Disputa', rotulo: 'Modo de disputa',
    achar(t) {
      const m = /modo de disputa[^.]{0,40}?(aberto e fechado|fechado e aberto|aberto|fechado)/.exec(t)
      return m ? { valor: m[1].replace(/^./, (c) => c.toUpperCase()), indice: m.index } : null
    },
  },
  {
    id: 'registro_precos', grupo: 'Contratação', rotulo: 'Registro de Preços',
    achar(t) {
      const n = (t.match(/ata de registro de precos/g) || []).length
      const idx = t.search(/ata de registro de precos|sistema de registro de precos/)
      if (/sem (?:a )?ado\w+ (?:do|de) sistema de registro de precos|nao (?:se )?(?:aplica|adot\w+)[^.]{0,40}registro de precos/.test(t)) return { valor: 'Não: compra com quantidade definida', indice: t.search(/registro de precos/) }
      return n >= 2 ? { valor: 'Sim: o órgão só compra se e quando precisar', indice: idx } : null
    },
  },
  {
    id: 'prazo_entrega', grupo: 'Entrega', rotulo: 'Prazo de entrega',
    achar(t) {
      const padroes = [
        new RegExp(String.raw`prazo[^.;]{0,40}entrega[^.;]{0,120}?${PRAZO}`),
        new RegExp(String.raw`entrega[^.;]{0,80}?(?:no prazo|em ate|ate)\s*(?:de\s*)?${PRAZO}`),
        new RegExp(String.raw`(?:entregar|entregues?|fornec\w+)[^.;]{0,100}?(?:no prazo de|em ate|ate)\s*${PRAZO}`),
      ]
      for (const p of padroes) {
        const m = p.exec(t)
        if (m) { const n = numeroDe(m[1]); if (n) return { valor: `${n} ${unidade(m[2])}`, indice: m.index, numero: n, unidade: m[2] } }
      }
      return null
    },
  },
  {
    id: 'forma_entrega', grupo: 'Entrega', rotulo: 'Forma de entrega',
    achar(t) {
      const parcelada = /(entrega[s]? parcelada|entregas? parcelad|forma parcelada|parceladamente|conforme (a )?(necessidade|demanda|solicitacao)|sob demanda)/.exec(t)
      if (parcelada) return { valor: 'Parcelada, conforme a necessidade do órgão', indice: parcelada.index }
      const unica = /(entrega unica|de uma (so|unica) vez|em parcela unica)/.exec(t)
      return unica ? { valor: 'Entrega única', indice: unica.index } : null
    },
  },
  {
    id: 'local_entrega', grupo: 'Entrega', rotulo: 'Local de entrega',
    achar(t) {
      const m = /(local(?:is)? de entrega|enderecos? (?:de entrega|indicados?|especificados?)|entregues? (?:no|na|nos|nas) (?:endereco|local|almoxarifado|sede))[^.]{0,160}/.exec(t)
      return m ? { valor: 'Veja o trecho abaixo', indice: m.index } : null
    },
  },
  {
    id: 'frete', grupo: 'Entrega', rotulo: 'Frete e descarregamento',
    achar(t) {
      const m = /(frete|transporte|descarreg\w+|desembarque|seguro)[^.]{0,140}(por conta|a cargo|de responsabilidade|correr[ao]o)[^.]{0,60}(contratada|fornecedor|licitante|vencedor)/.exec(t)
        || /(contratada|fornecedor|licitante)[^.]{0,80}(arcara|custeara|responsavel)[^.]{0,80}(frete|transporte|descarreg\w+)/.exec(t)
        || /(todos os custos|inclusos?)[^.]{0,120}(frete|transporte)/.exec(t)
      return m ? { valor: 'Por conta do fornecedor (entra no seu preço)', indice: m.index } : null
    },
  },
  {
    id: 'pedido_minimo', grupo: 'Entrega', rotulo: 'Pedido mínimo',
    achar(t) {
      const m = /(pedido minimo|quantidade minima (?:de|por) (?:pedido|entrega)|valor minimo (?:de|por) (?:pedido|entrega)|lote minimo)[^.]{0,120}/.exec(t)
      return m ? { valor: 'Há exigência (veja o trecho)', indice: m.index } : null
    },
  },
  {
    id: 'amostra', grupo: 'Exigências', rotulo: 'Amostra',
    achar(t) {
      const nao = /(nao sera exigida|dispensad[ao]s?|nao ha exigencia de)[^.]{0,40}amostra|amostra[^.]{0,60}(nao sera exigida|dispensad)/.exec(t)
      if (nao) return { valor: 'Não exigida', indice: nao.index }
      const m = /amostras?[^.]{0,200}/.exec(t)
      if (!m) return null
      const pode = /(podera|poderao|sera facultad|a criterio)[^.]{0,80}amostra|amostra[^.]{0,80}(podera|a criterio)/.test(m[0] + t.slice(Math.max(0, m.index - 100), m.index))
      return { valor: pode ? 'Pode ser pedida ao 1º colocado' : 'Mencionada (veja o trecho)', indice: m.index }
    },
  },
  {
    id: 'atestado', grupo: 'Exigências', rotulo: 'Atestado de capacidade técnica',
    achar(t) {
      const m = /atestados? (?:de capacidade tecnica|de aptidao|fornecidos? por pessoas? juridicas?)/.exec(t) || /capacidade tecnica[^.]{0,80}atestado/.exec(t)
      return m ? { valor: 'Exigido: tenha atestados de fornecimento em mãos', indice: m.index } : null
    },
  },
  {
    id: 'sicaf', grupo: 'Exigências', rotulo: 'SICAF',
    achar(t) {
      const m = /(?:cadastr\w+|habilit\w+|regularidade|consult\w+|comprov\w+|inscri\w+|documentos?)[^.]{0,80}sicaf[^.]{0,100}|sicaf[^.]{0,80}(?:habilit\w+|regularidade|cadastro em dia|vigente)/.exec(t)
      if (!m || /no ambito dos orgaos e entidades integrantes/.test(m[0])) return null
      return { valor: 'Citado: confira se o seu cadastro está em dia', indice: m.index }
    },
  },
  {
    id: 'garantia', grupo: 'Exigências', rotulo: 'Garantia de proposta / contratual',
    achar(t) {
      const nao = /(nao sera exigida|dispensad[ao]|nao ha exigencia)[^.]{0,60}garantia|garantia[^.]{0,60}(nao sera exigida|dispensad)/.exec(t)
      if (nao) return { valor: 'Não exigida', indice: nao.index }
      const pct = /garantia (de proposta|contratual|de execucao|da contratacao)[^.]{0,60}?(\d{1,2}(?:,\d{1,2})?)\s*%/.exec(t)
      if (pct) return { valor: `Exigida (${pct[1] === 'de proposta' ? 'proposta' : 'contratual'}): ${pct[2]}% do valor`, indice: pct.index }
      const m = /garantia (?:de proposta|contratual|de execucao|da contratacao)[^.]{0,120}/.exec(t)
      return m ? { valor: 'Mencionada (veja o trecho)', indice: m.index } : null
    },
  },
  {
    id: 'me_epp', grupo: 'Exigências', rotulo: 'Vantagem para ME/EPP',
    achar(t) {
      const m = /(exclusiv\w+|cota reservada|cota de 25)[^.]{0,100}(microempresa|empresa de pequeno porte|me\/epp|me e epp|epp)/.exec(t)
        || /(microempresa|empresa de pequeno porte|me\/epp)[^.]{0,100}(exclusiv\w+|cota reservada|empate ficto|preferencia)/.exec(t)
      return m ? { valor: 'Há tratamento favorecido (veja o trecho)', indice: m.index } : null
    },
  },
  {
    id: 'pagamento', grupo: 'Pagamento', rotulo: 'Prazo de pagamento',
    achar(t) {
      const m = new RegExp(String.raw`pagamento[^.;]{0,160}?(?:em ate|no prazo de|ate)\s*${PRAZO}`).exec(t)
      if (m) { const n = numeroDe(m[1]); if (n) return { valor: `${n} ${unidade(m[2])}`, indice: m.index } }
      return null
    },
  },
  {
    id: 'multa', grupo: 'Pagamento', rotulo: 'Multas', todas: true,
    achar(t) {
      const achados = []
      for (const m of t.matchAll(/(?:multa[^.]{0,200}?|moratoria|compensatoria)\s*(?:de\s*)?(\d{1,3}(?:,\d{1,2})?)\s*%[^.]{0,140}/g)) {
        const ao_dia = /por dia|ao dia|diari/.test(m[0])
        const comp = /compensatoria|inexecucao/.test(m[0])
        achados.push({ valor: `${m[1]}%${ao_dia ? (/garantia/.test(m[0]) ? ' ao dia (atraso na garantia)' : ' ao dia (atraso)') : comp ? ' do contrato (inexecução)' : ''}`, indice: m.index })
      }
      return achados.length ? achados : null
    },
  },
  {
    id: 'vigencia', grupo: 'Contratação', rotulo: 'Vigência',
    achar(t) {
      const m = new RegExp(String.raw`vigencia[^.;]{0,100}?${PRAZO}`).exec(t)
      if (m && !/prorrog/.test(m[0])) { const n = numeroDe(m[1]); if (n) return { valor: `${n} ${unidade(m[2])}`, indice: m.index } }
      return null
    },
  },
  {
    id: 'validade_proposta', grupo: 'Disputa', rotulo: 'Validade da proposta',
    achar(t) {
      const m = new RegExp(String.raw`validade da proposta[^.;]{0,80}?${PRAZO}`).exec(t)
      if (m) { const n = numeroDe(m[1]); if (n) return { valor: `${n} ${unidade(m[2])}`, indice: m.index } }
      return null
    },
  },
  {
    id: 'impugnacao', grupo: 'Disputa', rotulo: 'Esclarecimentos e impugnação',
    achar(t) {
      const m = new RegExp(String.raw`(?:impugn\w+|esclarecimentos?)[^.;]{0,160}?(?:ate|em ate)\s*${PRAZO}[^.;]{0,60}(?:abertura|sessao|data)`).exec(t)
      if (m) { const n = numeroDe(m[1]); if (n) return { valor: `Até ${n} ${unidade(m[2])} antes da abertura`, indice: m.index } }
      return null
    },
  },
]

function trechoDe(original, simples, indice) {
  const ini = Math.max(0, indice - 60)
  const fim = Math.min(original.length, indice + 260)
  let trecho = original.slice(ini, fim).replace(/\s+/g, ' ').trim()
  if (ini > 0) trecho = `…${trecho}`
  if (fim < original.length) trecho = `${trecho}…`
  return trecho
}

export function extrairObservacoes(documentos) {
  const docs = [...(documentos ?? [])].sort((a, b) => ordemDocumento(a.tipo) - ordemDocumento(b.tipo))
  const semTexto = docs.filter((d) => !d.paginas?.some((p) => (p.texto ?? '').trim().length > 40)).map((d) => ({ arquivo: d.arquivo, tipo: d.tipo }))
  const campos = []
  for (const regra of REGRAS) {
    const achados = []
    parar: for (const doc of docs) {
      for (const pagina of doc.paginas ?? []) {
        const original = pagina.texto ?? ''
        const simples = simplificar(original)
        const r = regra.achar(simples)
        if (!r) continue
        for (const item of Array.isArray(r) ? r : [r]) {
          if (!regra.todas) { achados.push({ ...item, doc, pagina: pagina.pagina, trecho: trechoDe(original, simples, item.indice) }); break parar }
          if (!achados.some((a) => a.valor === item.valor)) achados.push({ ...item, doc, pagina: pagina.pagina, trecho: trechoDe(original, simples, item.indice) })
          if (achados.length >= 6) break parar
        }
      }
    }
    if (achados.length === 0) continue
    if (regra.id === 'multa') {
      const peso = (a) => (/ao dia \(atraso\)/.test(a.valor) ? 0 : /inexecu/.test(a.valor) ? 1 : 2)
      achados.sort((a, b) => peso(a) - peso(b))
    }
    const [achado, ...outros] = achados
    campos.push({
      id: regra.id, grupo: regra.grupo, rotulo: regra.rotulo, valor: regra.todas && outros.length ? achados.slice(0, 3).map((a) => a.valor).join(' · ') : achado.valor,
      trecho: achado.trecho, fonte: { arquivo: achado.doc.arquivo, tipo: achado.doc.tipo, pagina: achado.pagina }, numero: achado.numero, unidade: achado.unidade,
      extras: outros.map((a) => ({ valor: a.valor, trecho: a.trecho, fonte: { arquivo: a.doc.arquivo, tipo: a.doc.tipo, pagina: a.pagina } })),
    })
  }
  return { campos, alertas: montarAlertas(campos, semTexto, docs), semTexto, documentos: docs.map((d) => ({ arquivo: d.arquivo, tipo: d.tipo, paginas: d.paginas?.length ?? 0 })) }
}

function montarAlertas(campos, semTexto, docs) {
  const tem = (id) => campos.find((c) => c.id === id)
  const alertas = []
  if (docs.length === 0) alertas.push({ nivel: 'info', texto: 'Ainda não há arquivos do edital baixados.' })
  for (const d of semTexto) alertas.push({ nivel: 'atencao', texto: `"${d.tipo || d.arquivo}" é um PDF escaneado (só imagem): o app não consegue ler. Abra o arquivo e confira entrega, prazos e multas.` })
  const frete = tem('frete'); if (frete) alertas.push({ nivel: 'atencao', texto: 'Frete e descarregamento por sua conta: coloque no preço de cada item.' })
  const multa = tem('multa'); if (multa) alertas.push({ nivel: 'atencao', texto: `Multas no edital: ${multa.valor}. Atraso na entrega custa caro, então só prometa o prazo que você cumpre.` })
  const prazo = tem('prazo_entrega')
  if (prazo) {
    const curto = prazo.numero != null && /dia|hora/.test(prazo.unidade ?? '') && (prazo.numero <= 5 || /hora/.test(prazo.unidade))
    alertas.push({ nivel: curto ? 'atencao' : 'info', texto: `Prazo de entrega: ${prazo.valor}${curto ? ' (curto: tenha estoque pronto)' : ''}.` })
  }
  const forma = tem('forma_entrega')
  if (forma && /Parcelada/.test(forma.valor) && !tem('pedido_minimo')) alertas.push({ nivel: 'atencao', texto: 'Entrega parcelada e sem pedido mínimo citado: pedidos pequenos repetidos aumentam o seu frete.' })
  const julg = tem('julgamento'); if (julg && /lote|grupo|global/i.test(julg.valor)) alertas.push({ nivel: 'atencao', texto: `${julg.valor}: você precisa cotar todos os itens do ${/global/i.test(julg.valor) ? 'edital' : 'grupo'} para disputar.` })
  const amostra = tem('amostra'); if (amostra && amostra.valor !== 'Não exigida') alertas.push({ nivel: 'atencao', texto: `Amostra: ${amostra.valor.toLowerCase()}.` })
  if (tem('atestado')) alertas.push({ nivel: 'atencao', texto: 'Pede atestado de capacidade técnica: separe atestados de fornecimento antes da sessão.' })
  if (tem('registro_precos')) alertas.push({ nivel: 'info', texto: 'Registro de Preços: ganhar o item não garante compra, só entra na ata.' })
  return alertas
}
