// src/App.jsx
import { useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage    from './pages/LoginPage'
import Dashboard    from './pages/Dashboard'
import Clientes     from './pages/Clientes'
import Pipeline     from './pages/Pipeline'
import Agenda       from './pages/Agenda'
import Financeiro   from './pages/Financeiro'
import Sidebar      from './components/Sidebar'

function AppInner() {
  const { user, loading } = useAuth()
  const [pagina, setPagina] = useState('dashboard')

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Carregando...</p>
      </div>
    </div>
  )

  if (!user) return <LoginPage />

  const paginas = {
    dashboard:  <Dashboard />,
    clientes:   <Clientes />,
    pipeline:   <Pipeline />,
    agenda:     <Agenda />,
    financeiro: <Financeiro />,
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar pagina={pagina} onChange={setPagina} />
      <main className="flex-1 overflow-y-auto">
        {paginas[pagina]}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
