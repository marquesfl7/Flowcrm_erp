// src/pages/Clientes.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { clientesAPI, interacoesAPI } from '../lib/supabase'
import { Modal, Input, Select, Textarea, Btn, Campo, Badge, EmptyState, fmt, Confirmar, toast } from '../components/UI'

const ORIGENS = ['manual', 'indicacao', 'whatsapp', 'site', 'instagram']
const STATUS  = ['ativo', 'inativo', 'prospecto']
const TIPOS_INTERACAO = ['nota', 'ligacao', 'email', 'whatsapp', 'reuniao', 'proposta']

export default function Clientes() {
  const { user } = useAuth()
  const [clientes, setClientes]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [busca, setBusca]           = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [modalNovo, setModalNovo]   = useState(false)
  const [clienteSel, setClienteSel] = useState(null)
  const [confirmar, setConfirmar]   = useState(null)

  async function carregar() {
    setLoading(true)
    const { data } = await clientesAPI.listar(user.id, {
      busca: busca || undefined,
      status: filtroStatus || undefined
    })
    setClientes(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [busca, filtroStatus])

  async function handleDeletar(id) {
    const { error } = await clientesAPI.deletar(id)
    if (error) { toast.error('Erro ao deletar'); return }
    toast.success('Cliente removido')
    setConfirmar(null)
    carregar()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
          <p className="text-slate-500 text-sm mt-0.5">{clientes.length} encontrados</p>
        </div>
        <Btn onClick={() => setModalNovo(true)}>+ Novo Cliente</Btn>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5">
        <Input
          placeholder="Buscar por nome..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="max-w-40">
          <option value="">Todos</option>
          {STATUS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </Select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-10 text-slate-400">Carregando...</div>
      ) : clientes.length === 0 ? (
        <EmptyState
          icone="◎"
          titulo="Nenhum cliente ainda"
          descricao="Cadastre seu primeiro cliente para começar"
          acao={<Btn onClick={() => setModalNovo(true)}>+ Cadastrar Cliente</Btn>}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Telefone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {clientes.map((c, i) => (
                <tr
                  key={c.id}
                  className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i === clientes.length - 1 ? 'border-0' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm shrink-0">
                        {c.nome[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{c.nome}</p>
                        <p className="text-xs text-slate-400">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">{fmt.telefone(c.telefone)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 hidden lg:table-cell">{c.empresa || '-'}</td>
                  <td className="px-4 py-3"><Badge status={c.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Btn size="sm" variant="ghost" onClick={() => setClienteSel(c)}>Ver</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => setConfirmar(c.id)}>✕</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Novo */}
      <ModalCliente
        open={modalNovo}
        onClose={() => setModalNovo(false)}
        userId={user.id}
        onSalvo={() => { setModalNovo(false); carregar() }}
      />

      {/* Drawer Cliente */}
      {clienteSel && (
        <DrawerCliente
          cliente={clienteSel}
          userId={user.id}
          onClose={() => setClienteSel(null)}
          onAtualizado={carregar}
        />
      )}

      <Confirmar
        open={!!confirmar}
        onClose={() => setConfirmar(null)}
        onConfirm={() => handleDeletar(confirmar)}
        mensagem="Deseja remover este cliente? Esta ação não pode ser desfeita."
      />
    </div>
  )
}

// ============================================================
// MODAL NOVO/EDITAR CLIENTE
// ============================================================
function ModalCliente({ open, onClose, userId, onSalvo, clienteInicial }) {
  const base = { nome: '', email: '', telefone: '', empresa: '', cpf_cnpj: '', origem: 'manual', status: 'ativo', observacoes: '' }
  const [form, setForm]       = useState(clienteInicial || base)
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (open) setForm(clienteInicial || base) }, [open])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSalvar(e) {
    e.preventDefault()
    setLoading(true)
    const fn = clienteInicial
      ? clientesAPI.atualizar(clienteInicial.id, form)
      : clientesAPI.criar({ ...form, user_id: userId })
    const { error } = await fn
    setLoading(false)
    if (error) { toast.error('Erro ao salvar: ' + error.message); return }
    toast.success(clienteInicial ? 'Cliente atualizado!' : 'Cliente cadastrado!')
    onSalvo()
  }

  return (
    <Modal open={open} onClose={onClose} title={clienteInicial ? 'Editar Cliente' : 'Novo Cliente'}>
      <form onSubmit={handleSalvar} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Nome completo" required className="col-span-2">
            <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Maria da Silva" required />
          </Campo>
          <Campo label="Email">
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="maria@email.com" />
          </Campo>
          <Campo label="Telefone / WhatsApp">
            <Input value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(11) 99999-9999" />
          </Campo>
          <Campo label="Empresa">
            <Input value={form.empresa} onChange={e => set('empresa', e.target.value)} placeholder="Nome da empresa" />
          </Campo>
          <Campo label="CPF / CNPJ">
            <Input value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)} placeholder="000.000.000-00" />
          </Campo>
          <Campo label="Origem">
            <Select value={form.origem} onChange={e => set('origem', e.target.value)}>
              {ORIGENS.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
            </Select>
          </Campo>
          <Campo label="Status">
            <Select value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </Select>
          </Campo>
          <Campo label="Observações" className="col-span-2">
            <Textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Anotações importantes..." />
          </Campo>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Btn type="button" variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" loading={loading}>Salvar</Btn>
        </div>
      </form>
    </Modal>
  )
}

// ============================================================
// DRAWER DETALHES DO CLIENTE
// ============================================================
function DrawerCliente({ cliente, userId, onClose, onAtualizado }) {
  const [interacoes, setInteracoes] = useState([])
  const [novaInter, setNovaInter]   = useState({ tipo: 'nota', descricao: '' })
  const [editando, setEditando]     = useState(false)
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    interacoesAPI.listarPorCliente(cliente.id).then(({ data }) => setInteracoes(data || []))
  }, [cliente.id])

  async function addInteracao(e) {
    e.preventDefault()
    if (!novaInter.descricao.trim()) return
    setSaving(true)
    const { error } = await interacoesAPI.criar({
      ...novaInter, cliente_id: cliente.id, user_id: userId
    })
    setSaving(false)
    if (error) { toast.error('Erro'); return }
    toast.success('Interação registrada')
    setNovaInter({ tipo: 'nota', descricao: '' })
    interacoesAPI.listarPorCliente(cliente.id).then(({ data }) => setInteracoes(data || []))
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
              {cliente.nome[0].toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">{cliente.nome}</h3>
              <Badge status={cliente.status} />
            </div>
          </div>
          <div className="flex gap-2">
            <Btn size="sm" variant="secondary" onClick={() => setEditando(true)}>Editar</Btn>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Dados */}
          <div className="p-5 border-b border-slate-100 grid grid-cols-2 gap-3">
            <Info label="Telefone" valor={fmt.telefone(cliente.telefone)} />
            <Info label="Email" valor={cliente.email} />
            <Info label="Empresa" valor={cliente.empresa} />
            <Info label="Origem" valor={cliente.origem} />
            {cliente.observacoes && (
              <div className="col-span-2">
                <Info label="Observações" valor={cliente.observacoes} />
              </div>
            )}
          </div>

          {/* Histórico */}
          <div className="p-5">
            <h4 className="font-semibold text-slate-700 text-sm mb-3">Histórico de interações</h4>

            {/* Nova interação */}
            <form onSubmit={addInteracao} className="bg-slate-50 rounded-xl p-3 mb-4">
              <div className="flex gap-2 mb-2">
                <Select value={novaInter.tipo} onChange={e => setNovaInter(n => ({ ...n, tipo: e.target.value }))} className="text-xs py-1.5">
                  {TIPOS_INTERACAO.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </Select>
              </div>
              <Textarea
                placeholder="Descreva o que aconteceu..."
                value={novaInter.descricao}
                onChange={e => setNovaInter(n => ({ ...n, descricao: e.target.value }))}
              />
              <Btn type="submit" size="sm" loading={saving} className="mt-2">Registrar</Btn>
            </form>

            {/* Lista */}
            <div className="space-y-3">
              {interacoes.map(inter => (
                <div key={inter.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 text-xs shrink-0">
                    {ICONES_INTER[inter.tipo] || '●'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-600 capitalize">{inter.tipo}</span>
                      <span className="text-xs text-slate-400">{fmt.dataHora(inter.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-700 mt-0.5">{inter.descricao}</p>
                  </div>
                </div>
              ))}
              {interacoes.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Nenhuma interação ainda</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {editando && (
        <ModalCliente
          open={editando}
          onClose={() => setEditando(false)}
          userId={userId}
          clienteInicial={cliente}
          onSalvo={() => { setEditando(false); onAtualizado(); onClose() }}
        />
      )}
    </>
  )
}

const ICONES_INTER = { nota: '📝', ligacao: '📞', email: '✉️', whatsapp: '💬', reuniao: '🤝', proposta: '📄' }

function Info({ label, valor }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-slate-700 font-medium">{valor || '-'}</p>
    </div>
  )
}
