// src/pages/Pipeline.jsx
// Kanban com drag and drop nativo (HTML5 DnD API — sem biblioteca externa)

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { leadsAPI, clientesAPI } from '../lib/supabase'
import { Modal, Input, Select, Textarea, Btn, Campo, Badge, fmt, toast, Confirmar } from '../components/UI'

const ETAPAS = [
  { id: 'novo',        label: 'Novo',        cor: 'bg-slate-200 text-slate-600',    header: 'bg-slate-50' },
  { id: 'contato',     label: 'Contato',     cor: 'bg-blue-200 text-blue-700',      header: 'bg-blue-50' },
  { id: 'proposta',    label: 'Proposta',    cor: 'bg-amber-200 text-amber-700',    header: 'bg-amber-50' },
  { id: 'negociacao',  label: 'Negociação',  cor: 'bg-purple-200 text-purple-700',  header: 'bg-purple-50' },
  { id: 'fechado',     label: 'Fechado ✓',   cor: 'bg-emerald-200 text-emerald-700', header: 'bg-emerald-50' },
  { id: 'perdido',     label: 'Perdido',     cor: 'bg-red-200 text-red-600',        header: 'bg-red-50' },
]

export default function Pipeline() {
  const { user } = useAuth()
  const [leads, setLeads]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [modalNovo, setModalNovo] = useState(false)
  const [editLead, setEditLead]   = useState(null)
  const [confirmar, setConfirmar] = useState(null)
  const dragId   = useRef(null)
  const dragOver = useRef(null)

  async function carregar() {
    const { data } = await leadsAPI.listar(user.id)
    setLeads(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  // Agrupa leads por etapa
  const porEtapa = ETAPAS.reduce((acc, e) => {
    acc[e.id] = leads.filter(l => l.etapa === e.id).sort((a, b) => a.posicao - b.posicao)
    return acc
  }, {})

  // ============================================================
  // DRAG AND DROP — HTML5 nativo
  // ============================================================
  function handleDragStart(e, leadId) {
    dragId.current = leadId
    e.dataTransfer.effectAllowed = 'move'
  }

  async function handleDrop(e, etapaDestino) {
    e.preventDefault()
    if (!dragId.current || !etapaDestino) return

    const id = dragId.current
    const lead = leads.find(l => l.id === id)
    if (!lead || lead.etapa === etapaDestino) return

    // Atualiza otimisticamente
    setLeads(prev => prev.map(l => l.id === id ? { ...l, etapa: etapaDestino } : l))

    const { error } = await leadsAPI.moverEtapa(id, etapaDestino, 0)
    if (error) {
      toast.error('Erro ao mover lead')
      carregar() // Reverte
    } else {
      toast.success(`Lead movido para ${ETAPAS.find(e => e.id === etapaDestino)?.label}`)
    }
    dragId.current = null
  }

  function handleDragOver(e, etapaId) {
    e.preventDefault()
    dragOver.current = etapaId
    e.dataTransfer.dropEffect = 'move'
  }

  async function handleDeletar(id) {
    const { error } = await leadsAPI.deletar(id)
    if (error) { toast.error('Erro'); return }
    toast.success('Lead removido')
    setConfirmar(null)
    carregar()
  }

  const totalPipeline = leads
    .filter(l => !['fechado', 'perdido'].includes(l.etapa))
    .reduce((s, l) => s + Number(l.valor), 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pipeline de Vendas</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {leads.filter(l => !['fechado','perdido'].includes(l.etapa)).length} leads abertos · {fmt.moeda(totalPipeline)} em potencial
          </p>
        </div>
        <Btn onClick={() => setModalNovo(true)}>+ Novo Lead</Btn>
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">Carregando...</div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 p-5 h-full min-w-max">
            {ETAPAS.map(etapa => (
              <KanbanColuna
                key={etapa.id}
                etapa={etapa}
                leads={porEtapa[etapa.id]}
                onDrop={(e) => handleDrop(e, etapa.id)}
                onDragOver={(e) => handleDragOver(e, etapa.id)}
                onDragLeave={() => { dragOver.current = null }}
                onDragStart={handleDragStart}
                onEditar={setEditLead}
                onDeletar={setConfirmar}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modais */}
      <ModalLead
        open={modalNovo || !!editLead}
        onClose={() => { setModalNovo(false); setEditLead(null) }}
        userId={user.id}
        leadInicial={editLead}
        onSalvo={() => { setModalNovo(false); setEditLead(null); carregar() }}
      />
      <Confirmar
        open={!!confirmar}
        onClose={() => setConfirmar(null)}
        onConfirm={() => handleDeletar(confirmar)}
        mensagem="Deseja remover este lead?"
      />
    </div>
  )
}

// ============================================================
// COLUNA KANBAN
// ============================================================
function KanbanColuna({ etapa, leads, onDrop, onDragOver, onDragLeave, onDragStart, onEditar, onDeletar }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const total = leads.reduce((s, l) => s + Number(l.valor), 0)

  return (
    <div
      className={`flex flex-col w-64 shrink-0 rounded-2xl transition-all ${isDragOver ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}
      onDrop={(e) => { setIsDragOver(false); onDrop(e) }}
      onDragOver={(e) => { setIsDragOver(true); onDragOver(e) }}
      onDragLeave={() => { setIsDragOver(false); onDragLeave() }}
    >
      {/* Header */}
      <div className={`${etapa.header} rounded-t-2xl px-3 py-3 border border-b-0 border-slate-200`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${etapa.cor}`}>{etapa.label}</span>
            <span className="text-xs font-semibold text-slate-500">{leads.length}</span>
          </div>
        </div>
        {total > 0 && (
          <p className="text-xs text-slate-500 mt-1 font-medium">{fmt.moeda(total)}</p>
        )}
      </div>

      {/* Cards */}
      <div className={`flex-1 bg-slate-100/60 border border-t-0 border-slate-200 rounded-b-2xl p-2 space-y-2 min-h-48 ${isDragOver ? 'bg-indigo-50/40' : ''}`}>
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onDragStart={onDragStart}
            onEditar={onEditar}
            onDeletar={onDeletar}
          />
        ))}
        {leads.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-xs">
            {isDragOver ? 'Soltar aqui' : 'Arraste um lead'}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// CARD DE LEAD
// ============================================================
function LeadCard({ lead, onDragStart, onEditar, onDeletar }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-all select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-800 leading-snug flex-1">{lead.titulo}</p>
        {hovered && (
          <div className="flex gap-0.5 shrink-0">
            <button onClick={() => onEditar(lead)} className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 text-xs transition-colors">✎</button>
            <button onClick={() => onDeletar(lead.id)} className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs transition-colors">×</button>
          </div>
        )}
      </div>

      {lead.clientes && (
        <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
          <span>◎</span> {lead.clientes.nome}
        </p>
      )}

      <div className="flex items-center justify-between mt-2.5">
        {lead.valor > 0 ? (
          <span className="text-xs font-semibold text-emerald-600">{fmt.moeda(lead.valor)}</span>
        ) : <span />}

        <div className="flex items-center gap-1.5">
          {lead.prazo && (
            <span className={`text-xs ${new Date(lead.prazo) < new Date() ? 'text-red-400' : 'text-slate-400'}`}>
              {fmt.data(lead.prazo)}
            </span>
          )}
          {lead.probabilidade != null && (
            <span className="text-xs text-slate-400">{lead.probabilidade}%</span>
          )}
        </div>
      </div>

      {/* Barra de probabilidade */}
      {lead.probabilidade > 0 && (
        <div className="mt-2 bg-slate-100 rounded-full h-1">
          <div
            className="h-full bg-indigo-400 rounded-full transition-all"
            style={{ width: `${lead.probabilidade}%` }}
          />
        </div>
      )}
    </div>
  )
}

// ============================================================
// MODAL LEAD
// ============================================================
function ModalLead({ open, onClose, userId, leadInicial, onSalvo }) {
  const base = { titulo: '', descricao: '', valor: '', etapa: 'novo', probabilidade: 50, prazo: '', cliente_id: '' }
  const [form, setForm]       = useState(base)
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(leadInicial ? {
        ...leadInicial,
        valor: leadInicial.valor || '',
        prazo: leadInicial.prazo || '',
        cliente_id: leadInicial.cliente_id || '',
      } : base)
      clientesAPI.listar(userId).then(({ data }) => setClientes(data || []))
    }
  }, [open])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSalvar(e) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      ...form,
      valor: Number(form.valor) || 0,
      cliente_id: form.cliente_id || null,
      prazo: form.prazo || null,
    }
    const fn = leadInicial
      ? leadsAPI.atualizar(leadInicial.id, payload)
      : leadsAPI.criar({ ...payload, user_id: userId })
    const { error } = await fn
    setLoading(false)
    if (error) { toast.error('Erro ao salvar'); return }
    toast.success(leadInicial ? 'Lead atualizado!' : 'Lead criado!')
    onSalvo()
  }

  return (
    <Modal open={open} onClose={onClose} title={leadInicial ? 'Editar Lead' : 'Novo Lead'}>
      <form onSubmit={handleSalvar} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Título do lead" required className="col-span-2">
            <Input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex: Contrato de Seguro Auto" required />
          </Campo>
          <Campo label="Cliente">
            <Select value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
              <option value="">Sem cliente vinculado</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </Campo>
          <Campo label="Etapa">
            <Select value={form.etapa} onChange={e => set('etapa', e.target.value)}>
              {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
            </Select>
          </Campo>
          <Campo label="Valor (R$)">
            <Input type="number" step="0.01" value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0,00" />
          </Campo>
          <Campo label={`Probabilidade: ${form.probabilidade}%`}>
            <input
              type="range" min="0" max="100" value={form.probabilidade}
              onChange={e => set('probabilidade', Number(e.target.value))}
              className="w-full h-2 accent-indigo-600"
            />
          </Campo>
          <Campo label="Prazo">
            <Input type="date" value={form.prazo} onChange={e => set('prazo', e.target.value)} />
          </Campo>
          <Campo label="Descrição" className="col-span-2">
            <Textarea value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Detalhes do negócio..." />
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
