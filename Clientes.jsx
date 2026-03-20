// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { dashboardAPI, tarefasAPI } from '../lib/supabase'
import { MetricCard, fmt, Skeleton } from '../components/UI'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [dados, setDados]   = useState(null)
  const [tarefas, setTarefas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      const [resumo, { data: trf }] = await Promise.all([
        dashboardAPI.resumo(user.id),
        tarefasAPI.listar(user.id, { status: 'pendente' })
      ])
      setDados(resumo)
      setTarefas((trf || []).slice(0, 5))
      setLoading(false)
    }
    carregar()
  }, [user.id])

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const mesAtual = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-800">
          {saudacao}, {profile?.name?.split(' ')[0] || 'usuário'}! 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">Resumo de {mesAtual}</p>
      </div>

      {/* Grid de métricas */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <MetricCard
            icone="◎" titulo="Clientes ativos" cor="indigo"
            valor={dados.totalClientes}
            sub="cadastros ativos"
          />
          <MetricCard
            icone="⟁" titulo="Leads no funil" cor="amber"
            valor={dados.totalLeads}
            sub={fmt.moeda(dados.valorPipeline) + ' em aberto'}
          />
          <MetricCard
            icone="↑" titulo="Receita do mês" cor="emerald"
            valor={fmt.moeda(dados.receitaMes)}
            sub="entradas confirmadas"
          />
          <MetricCard
            icone="=" titulo="Resultado" cor={dados.lucroMes >= 0 ? 'emerald' : 'rose'}
            valor={fmt.moeda(dados.lucroMes)}
            sub="receita - despesas"
          />
        </div>
      )}

      {/* Segunda linha */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Funil visual rápido */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-semibold text-slate-700 mb-4">Funil de Vendas</h2>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 rounded-lg" />)}</div>
          ) : (
            <FunilVisual userId={user.id} />
          )}
        </div>

        {/* Tarefas pendentes */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700">Tarefas Pendentes</h2>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {dados?.tarefasPend || 0}
            </span>
          </div>
          {tarefas.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">Nenhuma tarefa pendente 🎉</p>
          ) : (
            <div className="space-y-2">
              {tarefas.map(t => (
                <div key={t.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    t.prioridade === 'urgente' ? 'bg-red-500' :
                    t.prioridade === 'alta' ? 'bg-amber-500' : 'bg-slate-300'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{t.titulo}</p>
                    {t.data_inicio && (
                      <p className="text-xs text-slate-400">{fmt.dataHora(t.data_inicio)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Mini funil visual
function FunilVisual({ userId }) {
  const [etapas, setEtapas] = useState([])

  useEffect(() => {
    async function carregar() {
      const { supabase } = await import('../lib/supabase')
      const { data } = await supabase
        .from('leads')
        .select('etapa, valor')
        .eq('user_id', userId)
        .not('etapa', 'in', '("perdido")')

      if (!data) return

      const mapa = { novo: 0, contato: 0, proposta: 0, negociacao: 0, fechado: 0 }
      const valores = { novo: 0, contato: 0, proposta: 0, negociacao: 0, fechado: 0 }
      data.forEach(l => {
        if (mapa[l.etapa] !== undefined) {
          mapa[l.etapa]++
          valores[l.etapa] += Number(l.valor) || 0
        }
      })

      const labels = { novo: 'Novo', contato: 'Contato', proposta: 'Proposta', negociacao: 'Negociação', fechado: 'Fechado' }
      const cores  = { novo: 'bg-slate-200', contato: 'bg-blue-200', proposta: 'bg-amber-200', negociacao: 'bg-purple-200', fechado: 'bg-emerald-200' }

      setEtapas(Object.keys(mapa).map(k => ({
        id: k, label: labels[k], count: mapa[k], valor: valores[k], cor: cores[k]
      })))
    }
    carregar()
  }, [userId])

  const maxCount = Math.max(...etapas.map(e => e.count), 1)

  return (
    <div className="space-y-2">
      {etapas.map(e => (
        <div key={e.id} className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-20 shrink-0">{e.label}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
            <div
              className={`h-full ${e.cor} rounded-full transition-all duration-500`}
              style={{ width: `${Math.max((e.count / maxCount) * 100, e.count > 0 ? 8 : 0)}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-600 w-6 text-right">{e.count}</span>
        </div>
      ))}
    </div>
  )
}
