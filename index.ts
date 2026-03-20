// src/lib/supabase.js
// Cliente Supabase centralizado — troque as variáveis de ambiente

import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnon) {
  throw new Error('❌ Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnon)

// ============================================================
// AUTH HELPERS
// ============================================================

export const auth = {
  signUp: (email, password, name) =>
    supabase.auth.signUp({ email, password, options: { data: { name } } }),

  signIn: (email, password) =>
    supabase.auth.signInWithPassword({ email, password }),

  signOut: () => supabase.auth.signOut(),

  getUser: () => supabase.auth.getUser(),

  onAuthChange: (cb) => supabase.auth.onAuthStateChange(cb),
}

// ============================================================
// CLIENTES
// ============================================================

export const clientesAPI = {
  listar: (userId, filtros = {}) => {
    let q = supabase
      .from('clientes')
      .select('*')
      .eq('user_id', userId)
      .order('nome')

    if (filtros.status)  q = q.eq('status', filtros.status)
    if (filtros.busca)   q = q.ilike('nome', `%${filtros.busca}%`)
    return q
  },

  buscarPorId: (id) =>
    supabase.from('clientes').select('*, interacoes(*)').eq('id', id).single(),

  criar: (dados) => supabase.from('clientes').insert(dados).select().single(),

  atualizar: (id, dados) =>
    supabase.from('clientes').update(dados).eq('id', id).select().single(),

  deletar: (id) => supabase.from('clientes').delete().eq('id', id),
}

// ============================================================
// INTERAÇÕES
// ============================================================

export const interacoesAPI = {
  listarPorCliente: (clienteId) =>
    supabase
      .from('interacoes')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false }),

  criar: (dados) => supabase.from('interacoes').insert(dados).select().single(),
}

// ============================================================
// LEADS (PIPELINE)
// ============================================================

export const leadsAPI = {
  listar: (userId) =>
    supabase
      .from('leads')
      .select('*, clientes(id, nome, telefone)')
      .eq('user_id', userId)
      .order('posicao'),

  criar: (dados) => supabase.from('leads').insert(dados).select().single(),

  atualizar: (id, dados) =>
    supabase.from('leads').update(dados).eq('id', id).select().single(),

  moverEtapa: (id, etapa, posicao) =>
    supabase.from('leads').update({ etapa, posicao }).eq('id', id),

  deletar: (id) => supabase.from('leads').delete().eq('id', id),
}

// ============================================================
// TAREFAS
// ============================================================

export const tarefasAPI = {
  listar: (userId, filtros = {}) => {
    let q = supabase
      .from('tarefas')
      .select('*, clientes(id, nome)')
      .eq('user_id', userId)
      .order('data_inicio')

    if (filtros.status)   q = q.eq('status', filtros.status)
    if (filtros.data_ini) q = q.gte('data_inicio', filtros.data_ini)
    if (filtros.data_fim) q = q.lte('data_fim', filtros.data_fim)
    return q
  },

  criar: (dados) => supabase.from('tarefas').insert(dados).select().single(),

  atualizar: (id, dados) =>
    supabase.from('tarefas').update(dados).eq('id', id).select().single(),

  deletar: (id) => supabase.from('tarefas').delete().eq('id', id),
}

// ============================================================
// FINANCEIRO
// ============================================================

export const financeiroAPI = {
  listar: (userId, filtros = {}) => {
    let q = supabase
      .from('financeiro')
      .select('*, clientes(id, nome)')
      .eq('user_id', userId)
      .order('data_venc', { ascending: false })

    if (filtros.tipo)   q = q.eq('tipo', filtros.tipo)
    if (filtros.status) q = q.eq('status', filtros.status)
    if (filtros.mes) {
      const ini = `${filtros.mes}-01`
      const fim = `${filtros.mes}-31`
      q = q.gte('data_venc', ini).lte('data_venc', fim)
    }
    return q
  },

  resumoMensal: (userId, mes) =>
    supabase
      .from('vw_financeiro_mensal')
      .select('*')
      .eq('user_id', userId)
      .ilike('mes', `${mes}%`),

  criar: (dados) => supabase.from('financeiro').insert(dados).select().single(),

  atualizar: (id, dados) =>
    supabase.from('financeiro').update(dados).eq('id', id).select().single(),

  deletar: (id) => supabase.from('financeiro').delete().eq('id', id),

  marcarPago: (id) =>
    supabase.from('financeiro').update({
      status: 'pago',
      data_pag: new Date().toISOString().slice(0, 10)
    }).eq('id', id),
}

// ============================================================
// DASHBOARD — queries agregadas
// ============================================================

export const dashboardAPI = {
  async resumo(userId) {
    const mesAtual = new Date().toISOString().slice(0, 7) // "2025-03"

    const [clientes, leads, entradas, saidas, tarefasPend] = await Promise.all([
      supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'ativo'),
      supabase.from('leads').select('id, valor, etapa').eq('user_id', userId).not('etapa', 'in', '("fechado","perdido")'),
      supabase.from('financeiro').select('valor').eq('user_id', userId).eq('tipo', 'entrada').eq('status', 'pago').gte('data_pag', `${mesAtual}-01`),
      supabase.from('financeiro').select('valor').eq('user_id', userId).eq('tipo', 'saida').eq('status', 'pago').gte('data_pag', `${mesAtual}-01`),
      supabase.from('tarefas').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'pendente'),
    ])

    const totalEntradas = (entradas.data || []).reduce((s, r) => s + Number(r.valor), 0)
    const totalSaidas   = (saidas.data || []).reduce((s, r) => s + Number(r.valor), 0)
    const valorPipeline = (leads.data || []).reduce((s, r) => s + Number(r.valor), 0)

    return {
      totalClientes:  clientes.count ?? 0,
      totalLeads:     leads.data?.length ?? 0,
      valorPipeline,
      receitaMes:     totalEntradas,
      despesasMes:    totalSaidas,
      lucroMes:       totalEntradas - totalSaidas,
      tarefasPend:    tarefasPend.count ?? 0,
    }
  }
}

// ============================================================
// WEBHOOK HELPER (preparado para WhatsApp / Evolution API)
// ============================================================

export const webhookAPI = {
  // Endpoint: POST /api/webhook (sua função Edge no Supabase)
  registrar: (userId, origem, payload) =>
    supabase.from('webhooks_log').insert({ user_id: userId, origem, payload }),

  // Processar leads vindos do WhatsApp
  async processarWhatsapp(payload) {
    // Extrai telefone do payload do Evolution API
    const telefone = payload?.data?.key?.remoteJid?.replace('@s.whatsapp.net', '') || ''
    const mensagem = payload?.data?.message?.conversation || ''

    if (!telefone) return null

    // Verifica se cliente existe
    const { data: existente } = await supabase
      .from('clientes')
      .select('id, nome')
      .ilike('telefone', `%${telefone.slice(-8)}%`)
      .maybeSingle()

    return { telefone, mensagem, clienteExistente: existente }
  }
}
