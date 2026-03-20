// src/pages/Financeiro.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { financeiroAPI, clientesAPI } from '../lib/supabase'
import { Modal, Input, Select, Textarea, Btn, Campo, Badge, fmt, toast, Confirmar, EmptyState } from '../components/UI'

const CATEGORIAS_ENTRADA = ['Venda', 'Serviço', 'Comissão', 'Mensalidade', 'Consultoria', 'Outro']
const CATEGORIAS_SAIDA   = ['Fornecedor', 'Salário', 'Aluguel', 'Marketing', 'Software', 'Imposto', 'Material', 'Outro']
const FORMAS_PAG = ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'boleto', 'transferencia']
const STATUS_FIN = ['pendente', 'pago', 'atrasado', 'cancelado']

export default function Financeiro() {
  const { user } = useAuth()
  const [lancamentos, setLancamentos] = useState([])
  const [loading, setLoading]         = useState(true)
  const [filtroTipo, setFiltroTipo]   = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [mesSel, setMesSel]           = useState(new Date().toISOString().slice(0, 7))
  const [modalNovo, setModalNovo]     = useState(null) // 'entrada' | 'saida'
  const [editItem, setEditItem]       = useState(null)
  const [confirmar, setConfirmar]     = useState(null)

  async function carregar() {
    setLoading(true)
    const { data } = await financeiroAPI.listar(user.id, {
      tipo:   filtroTipo   || undefined,
      status: filtroStatus || undefined,
      mes:    mesSel,
    })
    setLancamentos(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [filtroTipo, filtroStatus, mesSel])

  // Métricas do período
  const entradas  = lancamentos.filter(l => l.tipo === 'entrada' && l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0)
  const saidas    = lancamentos.filter(l => l.tipo === 'saida'   && l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0)
  const pendentes = lancamentos.filter(l => l.status === 'pendente').reduce((s, l) => s + Number(l.valor), 0)
  const resultado = entradas - saidas

  async function marcarPago(id) {
    const { error } = await financeiroAPI.marcarPago(id)
    if (error) { toast.error('Erro'); return }
    toast.success('Marcado como pago!')
    carregar()
  }

  async function handleDeletar(id) {
    const { error } = await financeiroAPI.deletar(id)
    if (error) { toast.error('Erro'); return }
    toast.success('Removido')
    setConfirmar(null)
    carregar()
  }

  // Mes anterior / próximo
  function navegarMes(delta) {
    const [ano, mes] = mesSel.split('-').map(Number)
    const d = new Date(ano, mes - 1 + delta)
    setMesSel(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const mesLabel = new Date(mesSel + '-01').toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financeiro</h1>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => navegarMes(-1)} className="text-slate-400 hover:text-slate-700 text-sm">←</button>
            <span className="text-slate-500 text-sm capitalize">{mesLabel}</span>
            <button onClick={() => navegarMes(1)} className="text-slate-400 hover:text-slate-700 text-sm">→</button>
          </div>
        </div>
        <div className="flex gap-2">
          <Btn onClick={() => setModalNovo('entrada')} className="bg-emerald-600 hover:bg-emerald-700">+ Entrada</Btn>
          <Btn onClick={() => setModalNovo('saida')} className="bg-rose-600 hover:bg-rose-700">+ Saída</Btn>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ResumoCard titulo="Entradas" valor={fmt.moeda(entradas)} cor="emerald" />
        <ResumoCard titulo="Saídas" valor={fmt.moeda(saidas)} cor="rose" />
        <ResumoCard titulo="Resultado" valor={fmt.moeda(resultado)} cor={resultado >= 0 ? 'emerald' : 'rose'} />
        <ResumoCard titulo="A receber/pagar" valor={fmt.moeda(pendentes)} cor="amber" sub="pendentes" />
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <Select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="max-w-32">
          <option value="">Todos</option>
          <option value="entrada">Entradas</option>
          <option value="saida">Saídas</option>
        </Select>
        <Select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="max-w-32">
          <option value="">Todos status</option>
          {STATUS_FIN.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </Select>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="text-center py-10 text-slate-400">Carregando...</div>
      ) : lancamentos.length === 0 ? (
        <EmptyState
          icone="◈"
          titulo="Nenhum lançamento"
          descricao="Registre entradas e saídas financeiras"
          acao={<Btn onClick={() => setModalNovo('entrada')}>+ Adicionar</Btn>}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Descrição</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Vencimento</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((l, i) => (
                <tr
                  key={l.id}
                  className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i === lancamentos.length - 1 ? 'border-0' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${l.tipo === 'entrada' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{l.descricao}</p>
                        {l.clientes && <p className="text-xs text-slate-400">◎ {l.clientes.nome}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 hidden md:table-cell">{l.categoria}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 hidden lg:table-cell">
                    {fmt.data(l.data_venc)}
                    {l.data_pag && <span className="text-xs text-emerald-600 block">Pago: {fmt.data(l.data_pag)}</span>}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-semibold ${l.tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {l.tipo === 'saida' ? '- ' : '+ '}{fmt.moeda(l.valor)}
                  </td>
                  <td className="px-4 py-3"><Badge status={l.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      {l.status === 'pendente' && (
                        <Btn size="sm" variant="ghost" onClick={() => marcarPago(l.id)} className="text-emerald-600 hover:bg-emerald-50">✓</Btn>
                      )}
                      <Btn size="sm" variant="ghost" onClick={() => setEditItem(l)}>✎</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => setConfirmar(l.id)}>×</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modais */}
      <ModalLancamento
        open={!!modalNovo || !!editItem}
        onClose={() => { setModalNovo(null); setEditItem(null) }}
        userId={user.id}
        tipoInicial={modalNovo}
        lancamentoInicial={editItem}
        onSalvo={() => { setModalNovo(null); setEditItem(null); carregar() }}
      />
      <Confirmar
        open={!!confirmar}
        onClose={() => setConfirmar(null)}
        onConfirm={() => handleDeletar(confirmar)}
        mensagem="Deseja remover este lançamento?"
      />
    </div>
  )
}

// ============================================================
// CARD DE RESUMO
// ============================================================
function ResumoCard({ titulo, valor, cor, sub }) {
  const bordas  = { emerald: 'border-l-emerald-400', rose: 'border-l-rose-400', amber: 'border-l-amber-400' }
  const textos  = { emerald: 'text-emerald-600', rose: 'text-rose-600', amber: 'text-amber-600' }

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-100 border-l-4 ${bordas[cor]}`}>
      <p className="text-xs text-slate-500 font-medium">{titulo}</p>
      <p className={`text-xl font-bold mt-1 ${textos[cor]}`}>{valor}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

// ============================================================
// MODAL LANÇAMENTO
// ============================================================
function ModalLancamento({ open, onClose, userId, tipoInicial, lancamentoInicial, onSalvo }) {
  const base = { tipo: tipoInicial || 'entrada', categoria: '', descricao: '', valor: '', status: 'pendente', data_venc: '', data_pag: '', forma_pag: '', cliente_id: '', observacoes: '' }
  const [form, setForm]       = useState(base)
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(lancamentoInicial ? {
        ...lancamentoInicial,
        valor:      lancamentoInicial.valor || '',
        data_venc:  lancamentoInicial.data_venc || '',
        data_pag:   lancamentoInicial.data_pag  || '',
        cliente_id: lancamentoInicial.cliente_id || '',
        forma_pag:  lancamentoInicial.forma_pag  || '',
      } : { ...base, tipo: tipoInicial || 'entrada' })
      clientesAPI.listar(userId).then(({ data }) => setClientes(data || []))
    }
  }, [open])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const categorias = form.tipo === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA

  async function handleSalvar(e) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      ...form,
      valor:      Number(form.valor),
      cliente_id: form.cliente_id || null,
      data_venc:  form.data_venc  || null,
      data_pag:   form.data_pag   || null,
      forma_pag:  form.forma_pag  || null,
    }
    const fn = lancamentoInicial
      ? financeiroAPI.atualizar(lancamentoInicial.id, payload)
      : financeiroAPI.criar({ ...payload, user_id: userId })
    const { error } = await fn
    setLoading(false)
    if (error) { toast.error('Erro: ' + error.message); return }
    toast.success(lancamentoInicial ? 'Atualizado!' : `${form.tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada!`)
    onSalvo()
  }

  const titulo = lancamentoInicial ? 'Editar Lançamento' :
    tipoInicial === 'entrada' ? '+ Nova Entrada' : '+ Nova Saída'

  return (
    <Modal open={open} onClose={onClose} title={titulo}>
      <form onSubmit={handleSalvar} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {!lancamentoInicial && (
            <Campo label="Tipo" className="col-span-2">
              <div className="flex gap-2">
                {['entrada', 'saida'].map(t => (
                  <button
                    key={t} type="button"
                    onClick={() => set('tipo', t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      form.tipo === t
                        ? t === 'entrada' ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-rose-50 border-rose-400 text-rose-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {t === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                  </button>
                ))}
              </div>
            </Campo>
          )}

          <Campo label="Descrição" required className="col-span-2">
            <Input value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Ex: Venda para cliente X" required />
          </Campo>

          <Campo label="Categoria" required>
            <Select value={form.categoria} onChange={e => set('categoria', e.target.value)} required>
              <option value="">Selecionar</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Campo>

          <Campo label="Valor (R$)" required>
            <Input type="number" step="0.01" min="0" value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0,00" required />
          </Campo>

          <Campo label="Vencimento">
            <Input type="date" value={form.data_venc} onChange={e => set('data_venc', e.target.value)} />
          </Campo>

          <Campo label="Status">
            <Select value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUS_FIN.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </Select>
          </Campo>

          {form.status === 'pago' && (
            <Campo label="Data do pagamento">
              <Input type="date" value={form.data_pag} onChange={e => set('data_pag', e.target.value)} />
            </Campo>
          )}

          <Campo label="Forma de pagamento">
            <Select value={form.forma_pag} onChange={e => set('forma_pag', e.target.value)}>
              <option value="">Selecionar</option>
              {FORMAS_PAG.map(f => <option key={f} value={f}>{f.replace('_', ' ').toUpperCase()}</option>)}
            </Select>
          </Campo>

          <Campo label="Cliente (opcional)" className="col-span-2">
            <Select value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
              <option value="">Sem cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </Campo>

          <Campo label="Observações" className="col-span-2">
            <Textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Notas adicionais..." />
          </Campo>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Btn type="button" variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn
            type="submit" loading={loading}
            className={form.tipo === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
          >
            Salvar
          </Btn>
        </div>
      </form>
    </Modal>
  )
}
