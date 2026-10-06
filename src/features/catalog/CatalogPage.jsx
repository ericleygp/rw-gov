import { useMemo, useState } from 'react'
import { listProducts } from './repositories/productRepository.js'
import './CatalogPage.css'

const products = listProducts()
const categories = [...new Set(products.map((product) => product.category))]
const subcategories = [...new Set(products.map((product) => product.subcategory))]

function CatalogPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas as categorias')
  const [subcategory, setSubcategory] = useState('Todas as subcategorias')
  const [selectedProduct, setSelectedProduct] = useState(null)

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
    return products.filter((product) => {
      const searchable = [product.name, product.category, product.subcategory].join(' ').toLocaleLowerCase('pt-BR')
      return (!normalizedQuery || searchable.includes(normalizedQuery))
        && (category === 'Todas as categorias' || product.category === category)
        && (subcategory === 'Todas as subcategorias' || product.subcategory === subcategory)
    })
  }, [query, category, subcategory])

  const missingStock = products.filter((product) => product.stock === 'Não informado').length
  const missingPrice = products.filter((product) => product.salePrice === 'Não informado').length

  return <div className="catalog-page">
    <div className="catalog-demo-banner"><span>i</span><div><strong>Demonstração — catálogo de referência</strong><small>Itens e categorias seguem a lista fornecida. O catálogo público indicado não pôde ser verificado; nada aqui confirma disponibilidade, preço ou cadastro comercial.</small></div></div>
    <section className="catalog-heading"><div><span className="eyebrow">PRODUTOS DA EMPRESA</span><h1>Catálogo</h1><p>Consulte a amostra de produtos e a situação das informações disponíveis.</p></div><span className="catalog-record-count">{products.length} itens de referência</span></section>

    <section className="catalog-summary" aria-label="Resumo da qualidade dos dados"><div><span className="summary-icon purple">▤</span><span><small>Produtos na amostra</small><strong>{products.length}</strong></span></div><div><span className="summary-icon amber">◷</span><span><small>Sem estoque informado</small><strong>{missingStock} <em>itens</em></strong></span></div><div><span className="summary-icon blue">R$</span><span><small>Sem preço informado</small><strong>{missingPrice} <em>itens</em></strong></span></div><div className="catalog-reference-summary"><span className="summary-icon green">✓</span><span><small>Nível dos registros</small><strong>Referência / demonstração</strong></span></div></section>

    <section className="panel catalog-panel">
      <div className="catalog-panel-header"><div><h2>Produtos</h2><p>{filteredProducts.length} de {products.length} itens · origem: Lista informada pelo proprietário — a validar</p></div><span className="reference-pill">REFERÊNCIA / DEMONSTRAÇÃO</span></div>
      <div className="catalog-filters"><label className="catalog-search"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produto ou categoria" aria-label="Pesquisar produtos" /></label><label className="catalog-filter"><span>Categoria</span><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filtrar categoria"><option>Todas as categorias</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="catalog-filter"><span>Subcategoria</span><select value={subcategory} onChange={(event) => setSubcategory(event.target.value)} aria-label="Filtrar subcategoria"><option>Todas as subcategorias</option>{subcategories.map((item) => <option key={item}>{item}</option>)}</select></label><span className="filter-data-note">Valores comerciais não informados</span></div>
      <div className="catalog-table-wrap"><table className="catalog-table"><thead><tr><th>PRODUTO</th><th>CATEGORIA</th><th>SUBCATEGORIA</th><th>UNIDADE</th><th>ESTOQUE</th><th>PREÇO DE VENDA</th><th>ORIGEM / CONFIANÇA</th><th><span className="sr-only">Detalhes</span></th></tr></thead><tbody>
        {filteredProducts.map((product) => <tr key={product.id} tabIndex="0" onClick={() => setSelectedProduct(product)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedProduct(product) }} aria-label={`Ver detalhes de ${product.name}`}><td><div className="catalog-product-cell"><span className="product-list-icon">▧</span><span><strong>{product.name}</strong><small>{product.status}</small></span></div></td><td><span className="catalog-category">{product.category}</span></td><td>{product.subcategory}</td><td className="unknown-value">{product.unitOfSale}</td><td><span className="unknown-badge">Não informado</span></td><td><span className="unknown-badge">Não informado</span></td><td><span className="confidence-badge">{product.confidenceLevel}</span><small className="source-caption">{product.informationSource}</small></td><td><button className="catalog-row-open" type="button" aria-label={`Abrir detalhes de ${product.name}`} onClick={(event) => { event.stopPropagation(); setSelectedProduct(product) }}>›</button></td></tr>)}
        {filteredProducts.length === 0 && <tr><td colSpan="8" className="catalog-empty"><strong>Nenhum produto encontrado</strong><small>Tente outro termo ou altere os filtros.</small><button type="button" onClick={() => { setQuery(''); setCategory('Todas as categorias'); setSubcategory('Todas as subcategorias') }}>Limpar filtros</button></td></tr>}
      </tbody></table></div>
      <div className="catalog-table-footer"><span>Exibindo {filteredProducts.length} produtos</span><span>Dados não confirmados pela empresa</span></div>
    </section>

    {selectedProduct && <ProductDetail product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
  </div>
}

function ProductDetail({ product, onClose }) {
  return <div className="catalog-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="catalog-detail" role="dialog" aria-modal="true" aria-labelledby="product-detail-title"><div className="catalog-detail-top"><span className="reference-pill">Demonstração — catálogo de referência</span><button type="button" onClick={onClose} aria-label="Fechar detalhes">×</button></div><span className="eyebrow">{product.category}</span><h2 id="product-detail-title">{product.name}</h2><span className="confidence-badge">Nível de informação: {product.confidenceLevel}</span><div className="product-detail-grid"><ProductField label="Subcategoria" value={product.subcategory} /><ProductField label="Descrição" value={product.description} /><ProductField label="Unidade de venda" value={product.unitOfSale} /><ProductField label="Especificações" value={product.specifications} /><ProductField label="Marcas" value={product.brands} /><ProductField label="Estoque" value={product.stock} /><ProductField label="Custo" value={product.cost} /><ProductField label="Preço de venda" value={product.salePrice} /><ProductField label="Fornecedores" value={product.suppliers} /><ProductField label="Status do registro" value={product.status} /></div><div className="product-source-box"><strong>Origem da informação</strong><p>{product.informationSource}</p><p>Data da informação: {product.informationDate}</p><p>Os dados não foram confirmados pela R W Comercial.</p></div><div className="product-match-note"><strong>Relacionamento futuro</strong><p>O modelo está preparado conceitualmente para OpportunityItem → Match → Product. Nenhuma lógica de correspondência está implementada.</p></div></section></div>
}

function ProductField({ label, value }) {
  return <div><small>{label}</small><strong>{value}</strong></div>
}

export default CatalogPage
