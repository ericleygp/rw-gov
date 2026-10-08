import { useEffect, useState } from 'react'
import { isRealData } from '../data/realData.js'
import { getCompanyProfile } from '../features/company/repositories/companyProfileRepository.js'
import { CATALOG_SOURCE_CHANGE_EVENT, getImportedCatalogInfo } from '../features/catalog/repositories/productRepository.js'

const companyProfile = getCompanyProfile()
const navigation = [
  { label: 'Dashboard', icon: '▦' },
  { label: 'Radar de Oportunidades', icon: '⌕' },
  { label: 'Catálogo', icon: '▣' },
  { label: 'Empresa', icon: '◉' },
]

function AppShell({ activePage, onNavigate, children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [hasImportedCatalog, setHasImportedCatalog] = useState(() => Boolean(getImportedCatalogInfo()))

  useEffect(() => {
    const updateSource = () => setHasImportedCatalog(Boolean(getImportedCatalogInfo()))
    window.addEventListener(CATALOG_SOURCE_CHANGE_EVENT, updateSource)
    return () => window.removeEventListener(CATALOG_SOURCE_CHANGE_EVENT, updateSource)
  }, [])

  const realData = isRealData()
  const environmentLabel = hasImportedCatalog ? 'Catálogo importado pelo proprietário' : (realData ? 'Dados reais do PNCP' : 'Ambiente demonstrativo')
  const topEnvironmentLabel = hasImportedCatalog ? environmentLabel : (realData ? 'DADOS REAIS DO PNCP' : 'AMBIENTE DEMONSTRATIVO')

  function navigate(label) {
    onNavigate(label)
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar${menuOpen ? ' sidebar-open' : ''}`}>
        <a className="brand" href="#/dashboard" onClick={(event) => { event.preventDefault(); navigate('Dashboard') }}><span className="brand-mark">RW</span><span className="brand-copy"><strong>R W <i>Gov</i></strong><small>INTELIGÊNCIA COMERCIAL</small></span></a>
        <div className="workspace-switcher"><span className="workspace-avatar">RW</span><span><strong>{companyProfile.name}</strong><small>Protótipo local</small></span><b>⌄</b></div>
        <span className="nav-caption">MENU PRINCIPAL</span>
        <nav className="main-nav" aria-label="Navegação principal">{navigation.map((item) => <button key={item.label} type="button" className={`nav-link${activePage === item.label ? ' active' : ''}`} onClick={() => navigate(item.label)} aria-current={activePage === item.label ? 'page' : undefined}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span></button>)}</nav>
        <div className="sidebar-bottom"><div className="sidebar-demo-card"><span>{environmentLabel}</span><small>{realData ? 'Oportunidades e itens vêm do PNCP; o match com o catálogo é automático e não confirmado.' : 'Oportunidades e itens do Radar continuam demonstrativos.'}</small></div></div>
      </aside>
      <div className="main-area">
        <header className="topbar"><button className="mobile-menu" type="button" aria-label="Abrir navegação" onClick={() => setMenuOpen(!menuOpen)}>☰</button><div className="breadcrumb"><span>{companyProfile.name}</span><b>/</b><strong>{activePage}</strong></div><div className="topbar-actions"><span className={`demo-chip${hasImportedCatalog ? ' imported-chip' : ''}`}><i />{topEnvironmentLabel}</span><button className="notification-button" type="button" aria-label="Notificações">♧<i /></button><span className="topbar-avatar">RW</span></div></header>
        {menuOpen && <button className="mobile-scrim" aria-label="Fechar navegação" type="button" onClick={() => setMenuOpen(false)} />}
        <main className="page-content">{children}</main>
        <footer className="app-footer"><span>R W Gov <b>·</b> Inteligência para vender ao setor público</span><span>Protótipo local <b>·</b> {hasImportedCatalog ? environmentLabel : (realData ? 'Dados do PNCP' : 'Dados demonstrativos')}</span></footer>
      </div>
    </div>
  )
}

export default AppShell
