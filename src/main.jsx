import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { loadRealData } from './data/realData.js'

// Os dados reais (se existirem) precisam estar carregados antes de as páginas serem importadas.
async function start() {
  await loadRealData()
  const { default: App } = await import('./App.jsx')
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

start()
