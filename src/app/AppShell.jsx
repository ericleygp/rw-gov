import { useState } from 'react'
import { getCompanyProfile } from '../features/company/repositories/companyProfileRepository.js'

const companyProfile = getCompanyProfile()

const navigation = [
  { label: 'Dashboard', icon: '▦' },
  { label: 'Radar de Oportunidades', icon: '⌕' },
  { label: 'Catálogo', icon: '▣' },
  { label: 'Empresa', icon: '◉' },
]

function AppShell({ activePage, onNavigate, children }) {
  const [menuOpen, setMenuOpen] = useState(false)

  function navigate(label) {
    onNavigate(label)
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar${menuOpen ? ' sidebar-open' : ''}`}>
        <a className="brand" href="#inicio" onClick={(event) => { event.preventDefault(); navigate('Dashboard') }}><span className="brand-mark">RW</span><span className="brand-copy"><strong>R W <i>Gov</i></strong><small>INTELIGÊNCIA COMERCIAL</small></span></a>
        <div className="workspace-switcher"><span className="workspace-avatar">RW</span><span><strong>{companyProfile.name}</strong><small>Protótipo local</small></span><b>⌄</b></div>
        <span className="nav-caption">MENU PRINCIPAL</span>
        <nav className="main-nav" aria-label="Navegação principal">{navigation.map((item) => <button key={item.label} type="button" className={`nav-link${activePage === item.label ? ' active' : ''}`} onClick={() => navigate(item.label)} aria-current={activePage === item.label ? 'page' : undefined}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>{item.badge && <small>{item.badge}</small>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="sidebar-demo-card"><span>Protótipo local</span><small>Dados demonstrativos</small></div></div>
      </aside>
      <div className="main-area">
        <header className="topbar"><button className="mobile-menu" type="button" aria-label="Abrir navegação" onClick={() => setMenuOpen(!menuOpen)}>☰</button><div className="breadcrumb"><span>{companyProfile.name}</span><b>/</b><strong>{activePage}</strong></div><div className="topbar-actions"><span className="demo-chip"><i /> AMBIENTE DEMONSTRATIVO</span><button className="notification-button" type="button" aria-label="Notificações">♧<i /></button><span className="topbar-avatar">RW</span></div></header>
        {menuOpen && <button className="mobile-scrim" aria-label="Fechar navegação" type="button" onClick={() => setMenuOpen(false)} />}
        <main className="page-content">{children}</main>
        <footer className="app-footer"><span>R W Gov <b>·</b> Inteligência para vender ao setor público</span><span>Protótipo local <b>·</b> Dados demonstrativos</span></footer>
      </div>
    </div>
  )
}

export default AppShell
