export const MAX_CSV_BYTES = 2 * 1024 * 1024
export const CSV_COLUMNS = ['nome', 'categoria', 'subcategoria', 'descricao', 'unidade_venda', 'marca', 'gramatura', 'dimensoes', 'cor', 'material', 'qtd_por_embalagem', 'outras_especificacoes', 'estoque', 'custo', 'preco_venda', 'fornecedor', 'codigo_interno']
const unknown = 'Não informado'

export function parseCsvRows(input) {
  const text = String(input).replace(/^\uFEFF/, '')
  const delimiter = (() => {
    const first = text.split(/\r?\n/, 1)[0]
    let quoted = false
    let semicolons = 0
    let commas = 0
    for (let i = 0; i < first.length; i += 1) {
      if (first[i] === '"' && first[i + 1] === '"' && quoted) i += 1
      else if (first[i] === '"') quoted = !quoted
      else if (!quoted && first[i] === ';') semicolons += 1
      else if (!quoted && first[i] === ',') commas += 1
    }
    return semicolons >= commas ? ';' : ','
  })()
  const rows = []
  let row = []
  let value = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === '"' && quoted && text[i + 1] === '"') { value += '"'; i += 1 }
    else if (char === '"') quoted = !quoted
    else if (!quoted && char === delimiter) { row.push(value); value = '' }
    else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(value); rows.push(row); row = []; value = ''
    } else value += char
  }
  if (value || row.length) { row.push(value); rows.push(row) }
  return { delimiter, rows }
}

export function parseBrazilianNumber(value) {
  const input = String(value ?? '').trim()
  if (!input) return { value: unknown }
  const normalized = input.includes(',') ? input.replace(/\./g, '').replace(',', '.') : input
  if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(normalized) || !Number.isFinite(Number(normalized))) return { error: `número inválido: “${input}”` }
  return { value: Number(normalized) }
}

export function validateCatalogCsv(input) {
  const { rows } = parseCsvRows(input)
  if (!rows.length) return { total: 0, valid: [], errors: [], warnings: [] }
  const headers = rows[0].map((header) => header.trim().toLocaleLowerCase('pt-BR'))
  const missingHeaders = ['nome', 'categoria'].filter((field) => !headers.includes(field))
  if (missingHeaders.length) return { total: Math.max(0, rows.length - 1), valid: [], errors: [{ line: 1, message: `cabeçalho sem coluna obrigatória: ${missingHeaders.join(', ')}` }], warnings: [] }
  const entries = rows.slice(1).map((cells, index) => ({ line: index + 2, cells, data: Object.fromEntries(headers.map((header, i) => [header, cells[i]?.trim() || ''])) })).filter(({ cells }) => cells.some(Boolean) || cells.length > 1)
  const nameUnitCount = new Map()
  entries.forEach(({ data }) => {
    const key = `${data.nome?.trim().toLocaleLowerCase('pt-BR')}|${data.unidade_venda?.trim()?.toLocaleLowerCase('pt-BR') || ''}`
    nameUnitCount.set(key, (nameUnitCount.get(key) || 0) + 1)
  })
  const valid = []
  const errors = []
  const warnings = []
  for (const { line, data } of entries) {
    const rowErrors = []
    if (!data.nome) rowErrors.push('nome obrigatório')
    if (!data.categoria) rowErrors.push('categoria obrigatória')
    const numbers = {}
    for (const [column, field] of [['estoque', 'stock'], ['custo', 'cost'], ['preco_venda', 'salePrice']]) {
      if (!data[column]) numbers[field] = unknown
      else {
        const result = parseBrazilianNumber(data[column])
        if (result.error) rowErrors.push(`${column}: ${result.error}`)
        else if (result.value < 0) rowErrors.push(`${column}: deve ser maior ou igual a zero`)
        else numbers[field] = result.value
      }
    }
    if (rowErrors.length) errors.push({ line, message: rowErrors.join('; '), data })
    else {
      const duplicate = nameUnitCount.get(`${data.nome.trim().toLocaleLowerCase('pt-BR')}|${data.unidade_venda?.trim()?.toLocaleLowerCase('pt-BR') || ''}`) > 1
      if (duplicate) warnings.push({ line, message: 'nome + unidade de venda duplicados; confira antes de importar' })
      valid.push({ line, data, numbers, duplicate })
    }
  }
  return { total: entries.length, valid, errors, warnings }
}

export function csvRowToProduct(row, index, fileName, date) {
  const { data: d, numbers } = row
  const field = (name) => d[name]?.trim() || unknown
  const known = (name) => Boolean(d[name]?.trim())
  const specifications = {
    gramatura: field('gramatura'), dimensoes: field('dimensoes'), cor: field('cor'), material: field('material'),
    quantidadePorEmbalagem: field('qtd_por_embalagem'), outras: field('outras_especificacoes'),
  }
  return {
    id: `import-${date}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    name: field('nome'), category: field('categoria'), subcategory: field('subcategoria'), description: field('descricao'),
    unitOfSale: field('unidade_venda'), specifications, brands: field('marca'), stock: numbers.stock, cost: numbers.cost,
    salePrice: numbers.salePrice, suppliers: field('fornecedor'), internalCode: field('codigo_interno'),
    informationSource: `Planilha importada pelo proprietário — ${fileName}`, informationDate: date,
    confidenceLevel: 'Confirmado nos campos preenchidos', confirmedFields: Object.fromEntries([
      ['name', 'nome'], ['category', 'categoria'], ['subcategory', 'subcategoria'], ['description', 'descricao'], ['unitOfSale', 'unidade_venda'], ['brands', 'marca'],
      ['stock', 'estoque'], ['cost', 'custo'], ['salePrice', 'preco_venda'], ['suppliers', 'fornecedor'], ['internalCode', 'codigo_interno'],
      ['gramatura', 'gramatura'], ['dimensoes', 'dimensoes'], ['cor', 'cor'], ['material', 'material'], ['quantidadePorEmbalagem', 'qtd_por_embalagem'], ['outras', 'outras_especificacoes'],
    ].map(([key, column]) => [key, known(column)])),
    fieldConfidence: Object.fromEntries([
      ['name', 'nome'], ['category', 'categoria'], ['subcategory', 'subcategoria'], ['description', 'descricao'], ['unitOfSale', 'unidade_venda'], ['brands', 'marca'],
      ['stock', 'estoque'], ['cost', 'custo'], ['salePrice', 'preco_venda'], ['suppliers', 'fornecedor'], ['internalCode', 'codigo_interno'],
      ['gramatura', 'gramatura'], ['dimensoes', 'dimensoes'], ['cor', 'cor'], ['material', 'material'], ['quantidadePorEmbalagem', 'qtd_por_embalagem'], ['outras', 'outras_especificacoes'],
    ].map(([key, column]) => [key, known(column) ? 'Confirmado' : unknown])),
    status: 'Cadastrado pelo proprietário',
  }
}
