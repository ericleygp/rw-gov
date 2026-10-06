import { useEffect, useState } from 'react'
import AppShell from './app/AppShell.jsx'
import DashboardPage from './features/dashboard/DashboardPage.jsx'
import OpportunitiesPage from './features/opportunities/OpportunitiesPage.jsx'
import CatalogPage from './features/catalog/CatalogPage.jsx'
import CompanyProfilePage from './features/company/CompanyProfilePage.jsx'
import { readCurrentPage, writeCurrentPage } from './app/navigation.js'
import './App.css'

function App() {
  const [activePage, setActivePage] = useState(() => readCurrentPage())

  useEffect(() => {
    const syncPage = () => setActivePage(readCurrentPage())
    window.addEventListener('hashchange', syncPage)
    return () => window.removeEventListener('hashchange', syncPage)
  }, [])

  function navigate(page) {
    setActivePage(page)
    writeCurrentPage(page)
  }

  return (
    <AppShell activePage={activePage} onNavigate={navigate}>
      {activePage === 'Dashboard' ? <DashboardPage onNavigate={navigate} /> : activePage === 'Radar de Oportunidades' ? <OpportunitiesPage /> : activePage === 'Catálogo' ? <CatalogPage /> : activePage === 'Empresa' ? <CompanyProfilePage /> : null}
    </AppShell>
  )
}

export default App
