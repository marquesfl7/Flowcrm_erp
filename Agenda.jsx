// src/pages/LoginPage.jsx
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Input, Btn, Campo } from '../components/UI'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [modo, setModo]       = useState('login') // 'login' | 'cadastro'
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState('')
  const [form, setForm]       = useState({ email: '', password: '', name: '' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const { error } = modo === 'login'
        ? await signIn(form.email, form.password)
        : await signUp(form.email, form.password, form.name)

      if (error) setErro(error.message === 'Invalid login credentials'
        ? 'Email ou senha incorretos'
        : error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">F</div>
          <h1 className="text-2xl font-bold text-white">FlowCRM</h1>
          <p className="text-slate-400 text-sm mt-1">CRM + ERP para pequenas empresas</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="font-semibold text-slate-800 mb-6 text-lg">
            {modo === 'login' ? 'Entrar na sua conta' : 'Criar conta grátis'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {modo === 'cadastro' && (
              <Campo label="Seu nome" required>
                <Input
                  type="text"
                  placeholder="João Silva"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  required
                />
              </Campo>
            )}

            <Campo label="Email" required>
              <Input
                type="email"
                placeholder="joao@empresa.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
              />
            </Campo>

            <Campo label="Senha" required>
              <Input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                minLength={6}
                required
              />
            </Campo>

            {erro && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}

            <Btn type="submit" loading={loading} className="w-full justify-center">
              {modo === 'login' ? 'Entrar' : 'Criar conta'}
            </Btn>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            {modo === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
            <button
              onClick={() => { setModo(m => m === 'login' ? 'cadastro' : 'login'); setErro('') }}
              className="text-indigo-600 font-medium hover:underline"
            >
              {modo === 'login' ? 'Cadastre-se' : 'Entrar'}
            </button>
          </p>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          Dados seguros com Supabase Auth ✓
        </p>
      </div>
    </div>
  )
}
