import { useRef, useState } from 'react'
import { clearImportedCatalog, getImportedCatalogInfo, listProducts, saveImportedCatalog } from './repositories/productRepository.js'
import { csvRowToProduct, MAX_CSV_BYTES, validateCatalogCsv } from './csvImport.js'
import { formatCurrency, formatStock } from '../../utils/formatCatalogValue.js'
import './CatalogPage.css'

function CatalogPage() {
  const [, setRevision] = useState(0)
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const inputRef = useRef(null)
  const products = listProducts()
  const imported = getImportedCatalogInfo()
  const filtered = products.filter((product) => `${product.name} ${product.category} ${product.subcategory}`.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR')))

  async function readFile(file) {
    setError('')
    setPreview(null)
    if (!file) return
    if (file.size > MAX_CSV_BYTES) {
      setError('O arquivo excede o limite de 2 MB. Exporte um CSV menor e tente novamente.')
      return
    }
    try {
      setPreview({ fileName: file.name, result: validateCatalogCsv(await file.text()) })
    } catch {
      setError('Não foi possível ler o arquivo. Verifique se é um CSV UTF-8 válido.')
    }
  }

  function confirmImport() {
    if (!preview?.result.valid.length) return
    const importedAt = new Date().toLocaleDateString('pt-BR')
    const mapped = preview.result.valid.map((row, index) => csvRowToProduct(row, index + 1, preview.fileName, importedAt))
    try {
      saveImportedCatalog(mapped, preview.fileName, importedAt)
      setPreview(null)
      setRevision((value) => value + 1)
      setError('')
    } catch (cause) { setError(cause.message) }
  }

  function clearCatalog(action) {
    if (!window.confirm(action === 'restore'
      ? 'Restaurar a amostra demonstrativa? O catálogo importado será removido.'
      : 'Limpar o catálogo importado? O Catálogo voltará à amostra demonstrativa.')) return
    try {
      clearImportedCatalog()
      setRevision((value) => value + 1)
      setError('')
    } catch (cause) { setError(cause.message) }
  }

  const validCount = preview?.result.valid.length || 0
  const errorCount = preview?.result.errors.length || 0
  return <main className="catalog-page">
    <section className="catalog-heading"><div><span className="eyebrow">PRODUTOS DA EMPRESA</span><h1>Catálogo</h1><p>Importe seu catálogo em CSV e revise os dados antes de aplicá-los.</p></div><span className="catalog-record-count">{products.length} produtos</span></section>
    <aside className="catalog-local-note">Dados armazenados apenas neste navegador/computador.</aside>
    <div className="catalog-import-actions"><input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => { readFile(event.target.files?.[0]); event.target.value = '' }} /><button type="button" onClick={() => inputRef.current?.click()}>Importar catálogo (CSV)</button><a href="/templates/catalogo-modelo.csv" download>Baixar modelo CSV</a>{imported && <><button type="button" className="subtle" onClick={() => clearCatalog('restore')}>Restaurar amostra demonstrativa</button><button type="button" className="subtle" onClick={() => clearCatalog('clear')}>Limpar catálogo importado</button></>}</div>
    {error && <p className="catalog-import-error" role="alert">{error}</p>}
    {preview && <section className="catalog-preview panel"><h2>Prévia da importação — {preview.fileName}</h2><p>{preview.result.total} linhas · {validCount} válidas · {errorCount} com erro · {preview.result.warnings.length} avisos</p><div className="catalog-preview-scroll"><table><thead><tr><th>Linha</th><th>Nome</th><th>Categoria</th><th>Unidade</th><th>Estoque</th><th>Custo</th><th>Preço</th><th>Validação</th></tr></thead><tbody>{preview.result.valid.map((row) => <tr key={row.line}><td>{row.line}</td><td>{row.data.nome}</td><td>{row.data.categoria}</td><td>{row.data.unidade_venda || 'Não informado'}</td><td>{formatStock(row.numbers.stock)}</td><td>{formatCurrency(row.numbers.cost)}</td><td>{formatCurrency(row.numbers.salePrice)}</td><td>{row.duplicate ? 'Aviso: duplicidade de nome + unidade' : 'Válida'}</td></tr>)}{preview.result.errors.map((row) => <tr className="invalid-row" key={row.line}><td>{row.line}</td><td>{row.data?.nome || 'Não informado'}</td><td>{row.data?.categoria || 'Não informado'}</td><td colSpan="4">—</td><td>Erro: {row.message}</td></tr>)}</tbody></table></div><div className="catalog-preview-actions"><button type="button" className="subtle" onClick={() => setPreview(null)}>Cancelar</button><button type="button" disabled={!validCount} onClick={confirmImport}>Confirmar importação ({validCount})</button></div></section>}
    <section className="panel catalog-panel"><div className="catalog-panel-header"><div><h2>Produtos</h2><p>{imported ? `Planilha: ${imported.fileName} · informação de ${imported.importedAt}` : 'Amostra demonstrativa de referência'}</p></div></div><div className="catalog-filters"><label className="catalog-search"><span>⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produto ou categoria" /></label></div><div className="catalog-table-wrap"><table className="catalog-table"><thead><tr><th>PRODUTO</th><th>CATEGORIA</th><th>SUBCATEGORIA</th><th>UNIDADE</th><th>ESTOQUE</th><th>CUSTO</th><th>PREÇO DE VENDA</th><th>ORIGEM / CONFIANÇA</th></tr></thead><tbody>{filtered.map((product) => <tr key={product.id} onClick={() => setSelected(product)}><td>{product.name}<small>{product.status}</small></td><td>{product.category}</td><td>{product.subcategory}</td><td>{product.unitOfSale}</td>{[['stock', product.stock], ['cost', product.cost], ['salePrice', product.salePrice]].map(([field, value]) => <td key={field}>{field === 'stock' ? formatStock(value) : formatCurrency(value)}<small>{product.informationDate !== 'Não informado' ? `Informação de ${product.informationDate}` : ''}</small></td>)}<td>{product.informationSource}<small>{product.confidenceLevel}</small></td></tr>)}</tbody></table>{!filtered.length && <p className="catalog-empty">Nenhum produto encontrado.</p>}</div><footer className="catalog-table-footer">Exibindo {filtered.length} de {products.length} produtos</footer></section>
    {selected && <div className="catalog-detail-backdrop" onClick={() => setSelected(null)}><section className="catalog-detail" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setSelected(null)}>Fechar</button><h2>{selected.name}</h2><p>{selected.category} · {selected.subcategory}</p><dl>{Object.entries(selected.specifications || {}).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><p>Origem: {selected.informationSource}</p><p>Data da informação: {selected.informationDate}</p><p>Status: {selected.status}</p></section></div>}
  </main>
}
export default CatalogPage
