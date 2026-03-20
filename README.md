// src/components/Sidebar.jsx
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',   icon: '⬡' },
  { id: 'clientes',   label: 'Clientes',     icon: '◎' },
  { id: 'pipeline',   label: 'Pipeline',     icon: '⟁' },
  { id: 'agenda',     label: 'Agenda',       icon: '◷' },
  { id: 'financeiro', label: 'Financeiro',   icon: '◈' },
]

export default function Sidebar({ pagina, onChange }) {
  const { profile, signOut } = useAuth()

  return (
    <aside className="w-56 bg-slate-900 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">F</div>
          <span className="text-white font-semibold text-sm tracking-tight">FlowCRM</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left
              ${pagina === item.id
                ? 'bg-indigo-600 text-white font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-700/50">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {profile?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{profile?.name || 'Usuário'}</p>
            <p className="text-slate-500 text-xs truncate">{profile?.company || 'Minha empresa'}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full text-left px-3 py-2 text-slate-500 hover:text-white text-xs transition-colors mt-1"
        >
          Sair
        </button>
      </div>
    </aside>
  )
}
