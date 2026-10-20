import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Lock, Mail, ArrowRight, AlertCircle, Loader2, KeyRound, Building2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!email || !password) {
      setErrorMsg('Por favor, preencha o e-mail e a senha.')
      return
    }

    setLoading(true)
    try {
      await pb.collection('users').authWithPassword(email.trim(), password)
      toast({
        title: 'Login efetuado com sucesso',
        description: 'Bem-vindo ao CRM Boutique de Revestimentos.',
      })
      navigate(from, { replace: true })
    } catch (err: unknown) {
      console.error('Falha no login:', err)
      setErrorMsg('Credenciais inválidas. Verifique seu e-mail e senha.')
      toast({
        title: 'Falha no login',
        description: 'Credenciais inválidas. Use uma das contas demonstrativas abaixo.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fillCredentials = (fillEmail: string, fillPass: string) => {
    setEmail(fillEmail)
    setPassword(fillPass)
    setErrorMsg('')
  }

  return (
    <div className="min-h-screen bg-[#F7FAF5] py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-[24px] p-8 sm:p-10 border border-[#A8C3A0]/40 shadow-xl shadow-[#2F6B4F]/5 animate-fade-in">
        {/* Monograma & Título */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2F6B4F] to-[#1D2B25] flex items-center justify-center text-white mx-auto shadow-md border-2 border-[#A8C3A0]/50 mb-4">
            <span className="font-serif italic text-2xl font-bold text-[#F7FAF5]">B</span>
          </div>
          <span className="text-[11px] uppercase font-bold tracking-[0.25em] text-[#2F6B4F] flex items-center justify-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            CRM Interno de Atendimento
          </span>
          <h1 className="font-serif italic font-semibold text-2xl sm:text-3xl text-[#1D2B25] mt-1">
            Boutique de Revestimentos
          </h1>
          <p className="mt-1 text-xs text-[#5E6E64]">
            Rede de 7 Lojas • Acesso exclusivo para consultores e equipe comercial
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
              E-mail de Acesso
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#5E6E64] absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@boutique.com"
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm text-[#1D2B25] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#5E6E64] absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm text-[#1D2B25] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-sm font-semibold shadow-md shadow-[#2F6B4F]/25 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Acessar CRM</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Bloco de Credenciais de Demonstração (Conforme Requisito do Usuário) */}
        <div className="mt-8 pt-6 border-t border-[#EAF2E8] space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2F6B4F]">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Credenciais Oficiais de Demonstração:</span>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => fillCredentials('demo@boutique.com', 'demo1234')}
              className="w-full text-left p-3 rounded-xl bg-[#F7FAF5] hover:bg-[#EAF2E8] border border-[#A8C3A0]/30 transition-colors flex items-center justify-between text-xs"
            >
              <div>
                <p className="font-semibold text-[#1D2B25]">Consultor Comercial (Demo)</p>
                <p className="font-mono text-[#5E6E64] text-[11px]">demo@boutique.com / demo1234</p>
              </div>
              <span className="text-[11px] font-semibold text-[#2F6B4F] bg-white px-2.5 py-1 rounded-md border border-[#A8C3A0]/30 shadow-xs">
                Preencher
              </span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('rafaelteizen@gmail.com', 'Skip@Pass')}
              className="w-full text-left p-3 rounded-xl bg-[#F7FAF5] hover:bg-[#EAF2E8] border border-[#A8C3A0]/30 transition-colors flex items-center justify-between text-xs"
            >
              <div>
                <p className="font-semibold text-[#1D2B25]">Administrador Geral</p>
                <p className="font-mono text-[#5E6E64] text-[11px]">
                  rafaelteizen@gmail.com / Skip@Pass
                </p>
              </div>
              <span className="text-[11px] font-semibold text-[#2F6B4F] bg-white px-2.5 py-1 rounded-md border border-[#A8C3A0]/30 shadow-xs">
                Preencher
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
