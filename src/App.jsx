import { useState } from 'react'
import AppShell from './app/AppShell.jsx'
import DashboardPage from './features/dashboard/DashboardPage.jsx'
import OpportunitiesPage from './features/opportunities/OpportunitiesPage.jsx'
import CatalogPage from './features/catalog/CatalogPage.jsx'
import CompanyProfilePage from './features/company/CompanyProfilePage.jsx'
import './App.css'

function App() {
  const [activePage, setActivePage] = useState('Dashboard')

  return (
    <AppShell activePage={activePage} onNavigate={setActivePage}>
      {activePage === 'Dashboard' ? <DashboardPage onNavigate={setActivePage} /> : activePage === 'Radar de Oportunidades' ? <OpportunitiesPage /> : activePage === 'Catálogo' ? <CatalogPage /> : activePage === 'Empresa' ? <CompanyProfilePage /> : <section className="coming-soon"><span className="eyebrow">MÓDULO EM PREPARAÇÃO</span><h1>{activePage}</h1><p>Esta área será construída nas próximas etapas do R W Gov.</p></section>}
    </AppShell>
  )
}

export default App
