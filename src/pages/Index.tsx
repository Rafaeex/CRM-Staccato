import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Headphones,
  ClockAlert,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react'
import { listarAtendimentos, atualizarAtendimento } from '@/services/atendimentos'
import { listarClientes } from '@/services/clientes'
import { listarFollowUps, marcarFollowUpConcluido, gerarLinkWhatsApp } from '@/services/followUps'
import { listarReclamacoes, resolverReclamacao } from '@/services/reclamacoes'
import type { Atendimento, Cliente, FollowUp, Reclamacao } from '@/types/crm'
import { LOJAS } from '@/data/boutiqueData'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function DashboardPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [lojaFiltro, setLojaFiltro] = useState<string>('Todas as Lojas')

  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [reclamacoes, setReclamacoes] = useState<Reclamacao[]>([])

  // Modal para resolução rápida de reclamação a partir do Dashboard
  const [modalResolverAberto, setModalResolverAberto] = useState(false)
  const [recSelecionada, setRecSelecionada] = useState<Reclamacao | null>(null)
  const [desfechoTexto, setDesfechoTexto] = useState('')
  const [salvandoResolucao, setSalvandoResolucao] = useState(false)

  const hoje = new Date().toISOString().split('T')[0]

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [aList, cList, fList, rList] = await Promise.all([
        listarAtendimentos(),
        listarClientes(),
        listarFollowUps(),
        listarReclamacoes(),
      ])
      setAtendimentos(aList)
      setClientes(cList)
      setFollowUps(fList)
      setReclamacoes(rList)
    } catch (err) {
      console.error('Falha ao carregar dashboard:', err)
      toast({
        title: 'Erro ao carregar dados do CRM',
        description: 'Tente recarregar a página.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Filtragem unificada por loja
  const filtraPorLoja = (itemLoja: string) => {
    if (lojaFiltro === 'Todas as Lojas') return true
    return itemLoja.toLowerCase().includes(lojaFiltro.toLowerCase())
  }

  const atendimentosFiltrados = atendimentos.filter((a) => filtraPorLoja(a.loja))
  const clientesFiltrados = clientes.filter((c) => filtraPorLoja(c.loja_origem))
  const followUpsFiltrados = followUps.filter((f) => filtraPorLoja(f.loja))
  const reclamacoesFiltradas = reclamacoes.filter((r) => filtraPorLoja(r.loja))

  // 1. Cards de Indicadores
  const atendimentosHoje = atendimentosFiltrados.filter((a) => a.data_atendimento === hoje)

  const followUpsPendentes = followUpsFiltrados.filter((f) => f.status === 'Pendente')
  const followUpsVencidos = followUpsPendentes.filter((f) => f.data_prevista < hoje)
  const followUpsHoje = followUpsPendentes.filter((f) => f.data_prevista === hoje)

  const reclamacoesAbertas = reclamacoesFiltradas.filter((r) => r.status !== 'Resolvida')
  const reclamacoesVencidas = reclamacoesAbertas.filter((r) => r.prazo_resolucao < hoje)

  const clientesEmAtendimento = clientesFiltrados.filter(
    (c) => (c.status_atendimento || c.etapa_funil) === 'Em atendimento',
  )

  // 2. Índices de Qualidade do Atendimento
  // Taxa de resolução de reclamações (Resolvidas / Total)
  const totalReclamacoes = reclamacoesFiltradas.length
  const totalResolvidas = reclamacoesFiltradas.filter((r) => r.status === 'Resolvida').length
  const taxaResolucaoReclamacoes =
    totalReclamacoes > 0 ? Math.round((totalResolvidas / totalReclamacoes) * 100) : 100

  // Follow-ups concluídos no prazo (follow-ups concluídos onde data_conclusao <= data_prevista)
  const followUpsConcluidos = followUpsFiltrados.filter((f) => f.status === 'Concluído')
  const followUpsNoPrazo = followUpsConcluidos.filter(
    (f) => !f.data_conclusao || f.data_conclusao <= f.data_prevista,
  )
  const taxaFollowUpsNoPrazo =
    followUpsConcluidos.length > 0
      ? Math.round((followUpsNoPrazo.length / followUpsConcluidos.length) * 100)
      : 100

  // Tempo médio de resolução de reclamações em dias (calculado para resolvidas com data_resolucao e created)
  const diffDiasResolucao = reclamacoesFiltradas
    .filter((r) => r.status === 'Resolvida' && r.data_resolucao)
    .map((r) => {
      const dCriacao = new Date(r.created || r.prazo_resolucao)
      const dFim = new Date(r.data_resolucao!)
      const diffTime = Math.max(0, dFim.getTime() - dCriacao.getTime())
      return Math.round(diffTime / (1000 * 60 * 60 * 24))
    })

  const tempoMedioDias =
    diffDiasResolucao.length > 0
      ? (diffDiasResolucao.reduce((acc, curr) => acc + curr, 0) / diffDiasResolucao.length).toFixed(
          1,
        )
      : '1.5'

  // Marcar Follow-up como concluído no dashboard
  const handleConcluirFollowUp = async (id: string) => {
    try {
      await marcarFollowUpConcluido(id, 'Concluído no Dashboard')
      setFollowUps((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'Concluído', data_conclusao: hoje } : f)),
      )
      toast({
        title: 'Follow-up concluído',
        description: 'Contato registrado com sucesso.',
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Não foi possível concluir o follow-up.',
        variant: 'destructive',
      })
    }
  }

  // Marcar Atendimento como Concluído
  const handleConcluirAtendimento = async (id: string) => {
    try {
      const atualizado = await atualizarAtendimento(id, { status: 'Concluído' })
      setAtendimentos((prev) => prev.map((a) => (a.id === id ? atualizado : a)))
      toast({
        title: 'Atendimento Concluído',
        description: 'O atendimento foi marcado como concluído.',
      })
    } catch (err) {
      console.error(err)
    }
  }

  // Abrir modal de resolução rápida
  const handleAbrirResolucao = (rec: Reclamacao) => {
    setRecSelecionada(rec)
    setDesfechoTexto('')
    setModalResolverAberto(true)
  }

  const handleConfirmarResolucao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recSelecionada || !desfechoTexto.trim()) return

    setSalvandoResolucao(true)
    try {
      const atualizada = await resolverReclamacao(recSelecionada.id, desfechoTexto)
      setReclamacoes((prev) => prev.map((r) => (r.id === recSelecionada.id ? atualizada : r)))
      setModalResolverAberto(false)
      toast({
        title: 'Reclamação resolvida!',
        description: 'O desfecho foi gravado com sucesso.',
      })
    } catch (err) {
      console.error(err)
    } finally {
      setSalvandoResolucao(false)
    }
  }

  // Reclamações que precisam de atenção (abertas/em tratamento, priorizadas por vencimento e gravidade)
  const reclamacoesAtencao = [...reclamacoesAbertas].sort((a, b) => {
    const aVencida = a.prazo_resolucao < hoje
    const bVencida = b.prazo_resolucao < hoje
    if (aVencida && !bVencida) return -1
    if (!aVencida && bVencida) return 1

    const peso = { Alta: 3, Média: 2, Baixa: 1 }
    if (peso[a.gravidade] !== peso[b.gravidade]) {
      return peso[b.gravidade] - peso[a.gravidade]
    }
    return a.prazo_resolucao.localeCompare(b.prazo_resolucao)
  })

  return (
    <div className="space-y-6">
      {/* Topo do Dashboard */}
      <div className="bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2F6B4F] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Situação Geral de Atendimento & Clientes
          </span>
          <h1 className="font-serif italic font-semibold text-2xl sm:text-3xl text-[#1D2B25] mt-1">
            Painel de Atendimento das Boutiques
          </h1>
          <p className="text-xs sm:text-sm text-[#5E6E64] mt-0.5">
            Controle de qualidade, rotina de atendimentos, follow-ups no WhatsApp e tratamento de
            reclamações.
          </p>
        </div>

        {/* Seletor de Loja que afeta todo o Dashboard */}
        <div className="flex items-center gap-2 bg-[#F7FAF5] border border-[#A8C3A0]/50 rounded-2xl p-1.5 self-stretch md:self-auto">
          <Building2 className="w-4 h-4 text-[#2F6B4F] ml-2 shrink-0" />
          <select
            value={lojaFiltro}
            onChange={(e) => setLojaFiltro(e.target.value)}
            className="bg-transparent text-xs sm:text-sm font-semibold text-[#1D2B25] focus:outline-none cursor-pointer pr-3 py-1"
          >
            <option value="Todas as Lojas">Todas as 7 Lojas</option>
            {LOJAS.map((l) => (
              <option key={l.id} value={l.nome}>
                {l.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. Indicadores Principais (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Atendimentos Hoje */}
        <div className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E6E64]">
              Atendimentos Hoje
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF2E8] text-[#2F6B4F] flex items-center justify-center">
              <Headphones className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-serif italic font-bold text-3xl text-[#1D2B25]">
              {atendimentosHoje.length}
            </p>
            <p className="text-[11px] text-[#5E6E64] mt-1">
              {atendimentosFiltrados.length} atendimentos registrados
            </p>
          </div>
        </div>

        {/* Follow-ups a Fazer */}
        <div className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E6E64]">
              Follow-ups Pendentes
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <ClockAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="font-serif italic font-bold text-3xl text-[#1D2B25]">
                {followUpsPendentes.length}
              </p>
              {followUpsVencidos.length > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  {followUpsVencidos.length} atrasado{followUpsVencidos.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#5E6E64] mt-1">
              {followUpsHoje.length} agendados para hoje
            </p>
          </div>
        </div>

        {/* Reclamações Abertas */}
        <div
          className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col justify-between ${
            reclamacoesVencidas.length > 0 ? 'border-rose-300 bg-rose-50/20' : 'border-[#A8C3A0]/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
              Reclamações Abertas
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="font-serif italic font-bold text-3xl text-rose-800">
                {reclamacoesAbertas.length}
              </p>
              {reclamacoesVencidas.length > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white animate-pulse">
                  {reclamacoesVencidas.length} fora do prazo
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#5E6E64] mt-1">
              {reclamacoesFiltradas.filter((r) => r.status === 'Resolvida').length} já resolvidas
            </p>
          </div>
        </div>

        {/* Clientes em Atendimento */}
        <div className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E6E64]">
              Clientes em Atendimento
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-serif italic font-bold text-3xl text-[#1D2B25]">
              {clientesEmAtendimento.length}
            </p>
            <p className="text-[11px] text-[#5E6E64] mt-1">
              de {clientesFiltrados.length} clientes na base
            </p>
          </div>
        </div>
      </div>

      {/* 2. Régua de Índices e KPIs de Atendimento */}
      <div className="bg-[#1D2B25] text-white rounded-[24px] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#A8C3A0]" />
            <h3 className="font-serif italic font-semibold text-lg text-white">
              Índices de Qualidade do Atendimento
            </h3>
          </div>
          <span className="text-xs text-[#A8C3A0]">Boutique de Revestimentos • {lojaFiltro}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5">
          {/* Índice 1: Taxa de Resolução */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A8C3A0] uppercase font-bold tracking-wider text-[10px]">
                Taxa de Resolução de Reclamações
              </span>
              <span className="font-bold text-white font-mono">{taxaResolucaoReclamacoes}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, taxaResolucaoReclamacoes)}%` }}
              />
            </div>
            <p className="text-[11px] text-white/70">
              {totalResolvidas} de {totalReclamacoes} reclamações tratadas e resolvidas
            </p>
          </div>

          {/* Índice 2: Follow-ups no prazo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A8C3A0] uppercase font-bold tracking-wider text-[10px]">
                Follow-ups Realizados no Prazo
              </span>
              <span className="font-bold text-white font-mono">{taxaFollowUpsNoPrazo}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full bg-[#A8C3A0] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, taxaFollowUpsNoPrazo)}%` }}
              />
            </div>
            <p className="text-[11px] text-white/70">
              Compromissos e retornos cumpridos sem atraso
            </p>
          </div>

          {/* Índice 3: Tempo médio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A8C3A0] uppercase font-bold tracking-wider text-[10px]">
                Tempo Médio de Resolução
              </span>
              <span className="font-bold text-white font-mono">{tempoMedioDias} dias</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: '85%' }}
              />
            </div>
            <p className="text-[11px] text-white/70">Meta da rede: solução em até 3 dias úteis</p>
          </div>
        </div>
      </div>

      {/* 3. Blocos Operacionais: Reclamações que precisam de atenção + Follow-ups a fazer + Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bloco: Reclamações que precisam de atenção (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAF2E8]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-700" />
              <h2 className="font-serif italic font-semibold text-lg text-[#1D2B25]">
                Reclamações que Precisam de Atenção
              </h2>
            </div>
            <Link
              to="/reclamacoes"
              className="text-xs font-semibold text-[#2F6B4F] hover:underline flex items-center gap-1"
            >
              <span>Ver todas ({reclamacoesFiltradas.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {reclamacoesAtencao.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="text-xs font-medium text-[#1D2B25]">
                Nenhuma reclamação em aberto para esta loja!
              </p>
              <p className="text-[11px] text-[#5E6E64]">
                Todas as ocorrências estão resolvidas ou sem pendências registradas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reclamacoesAtencao.slice(0, 4).map((rec) => {
                const isVencida = rec.prazo_resolucao < hoje
                const waLink = rec.cliente_telefone
                  ? gerarLinkWhatsApp(
                      rec.cliente_telefone,
                      `Olá ${rec.cliente_nome}, aqui é do atendimento da Boutique (${rec.loja}). Estamos tratando sua solicitação sobre ${rec.categoria}.`,
                    )
                  : null

                return (
                  <div
                    key={rec.id}
                    className={`p-3.5 rounded-2xl border transition-all text-xs space-y-2 ${
                      isVencida
                        ? 'border-rose-300 bg-rose-50/30'
                        : 'border-[#A8C3A0]/30 bg-[#F7FAF5]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm text-[#1D2B25]">
                            {rec.cliente_nome}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#A8C3A0]/40 font-medium text-[#2F6B4F]">
                            {rec.categoria}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                              rec.gravidade === 'Alta'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rec.gravidade}
                          </span>
                          {isVencida && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-600 text-white">
                              Vencida
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#5E6E64] mt-0.5">
                          {rec.loja} • Resp: <strong>{rec.responsavel}</strong> • Prazo:{' '}
                          <span className={isVencida ? 'text-rose-700 font-bold' : ''}>
                            {rec.prazo_resolucao}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            title="Chamar no WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAbrirResolucao(rec)}
                          className="px-2.5 py-1 rounded-full bg-[#2F6B4F] text-white text-[11px] font-semibold hover:bg-[#25563F] transition-colors"
                        >
                          Resolver
                        </button>
                      </div>
                    </div>

                    <p className="text-[#1D2B25] line-clamp-2 leading-relaxed bg-white p-2 rounded-xl border border-[#A8C3A0]/20">
                      {rec.descricao}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Bloco: Follow-ups a fazer com disparo WhatsApp (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAF2E8]">
            <div className="flex items-center gap-2">
              <ClockAlert className="w-4 h-4 text-[#2F6B4F]" />
              <h2 className="font-serif italic font-semibold text-lg text-[#1D2B25]">
                Follow-ups a Fazer
              </h2>
            </div>
            <Link
              to="/follow-ups"
              className="text-xs font-semibold text-[#2F6B4F] hover:underline flex items-center gap-1"
            >
              <span>Ver todos ({followUpsPendentes.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {followUpsPendentes.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="text-xs font-medium text-[#1D2B25]">
                Nenhum follow-up pendente para esta loja!
              </p>
              <p className="text-[11px] text-[#5E6E64]">Todos os retornos foram concluídos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {followUpsPendentes.slice(0, 4).map((fu) => {
                const isAtrasado = fu.data_prevista < hoje
                const isHoje = fu.data_prevista === hoje
                const waLink = gerarLinkWhatsApp(fu.cliente_telefone, fu.mensagem_sugerida)

                return (
                  <div
                    key={fu.id}
                    className={`p-3.5 rounded-2xl border transition-all text-xs space-y-2 ${
                      isAtrasado
                        ? 'border-rose-300 bg-rose-50/20'
                        : isHoje
                          ? 'border-amber-300 bg-amber-50/20'
                          : 'border-[#A8C3A0]/30 bg-[#F7FAF5]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[#1D2B25]">
                            {fu.cliente_nome}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#A8C3A0]/40 font-mono text-[#2F6B4F]">
                            {fu.canal}
                          </span>
                          {isAtrasado && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                              Atrasado
                            </span>
                          )}
                          {isHoje && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              Hoje
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#5E6E64] mt-0.5">
                          {fu.loja} • Previsto para <strong>{fu.data_prevista}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleConcluirFollowUp(fu.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#A8C3A0]/40 text-[#2F6B4F] text-[11px] font-semibold hover:bg-[#EAF2E8] transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3 text-[#2F6B4F]" />
                          <span>Feito</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-[#1D2B25] bg-white p-2 rounded-xl border border-[#A8C3A0]/20">
                      <strong>Assunto: </strong>
                      {fu.assunto}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Bloco Agenda de Atendimentos */}
      <div className="bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAF2E8]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#2F6B4F]" />
            <h2 className="font-serif italic font-semibold text-lg text-[#1D2B25]">
              Atendimentos Recentes & Agendados
            </h2>
          </div>
          <Link
            to="/agenda"
            className="text-xs font-semibold text-[#2F6B4F] hover:underline flex items-center gap-1"
          >
            <span>Ver agenda completa</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {atendimentosFiltrados.length === 0 ? (
          <p className="text-xs text-[#5E6E64] py-4 text-center">
            Nenhum atendimento cadastrado para a loja selecionada.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {atendimentosFiltrados.slice(0, 6).map((at) => (
              <div
                key={at.id}
                className="p-3.5 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/30 space-y-2 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="font-serif italic font-semibold text-sm text-[#1D2B25]">
                      {at.cliente_nome}
                    </h4>
                    <span
                      className={`text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        at.status === 'Concluído'
                          ? 'bg-emerald-100 text-emerald-800'
                          : at.status === 'Em atendimento'
                            ? 'bg-blue-100 text-blue-800'
                            : at.status === 'Cancelado'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {at.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#5E6E64] mt-0.5">
                    {at.loja} • {at.data_atendimento} {at.horario ? `às ${at.horario}` : ''}
                  </p>

                  <p className="text-[#1D2B25] line-clamp-2 mt-1.5 bg-white p-2 rounded-xl border border-[#A8C3A0]/20">
                    {at.resumo}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#A8C3A0]/20 flex items-center justify-between">
                  <span className="text-[10px] text-[#5E6E64]">Resp: {at.responsavel}</span>

                  <div className="flex items-center gap-1.5">
                    {at.status !== 'Concluído' && (
                      <button
                        type="button"
                        onClick={() => handleConcluirAtendimento(at.id)}
                        className="px-2 py-0.5 rounded-full bg-white border border-[#A8C3A0]/40 text-[#2F6B4F] text-[10px] font-semibold hover:bg-[#EAF2E8]"
                      >
                        Concluir
                      </button>
                    )}
                    <Link
                      to={`/clientes/${at.cliente}`}
                      className="p-1 rounded-md text-[#5E6E64] hover:text-[#2F6B4F]"
                      title="Ver ficha"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Resolução Rápida de Reclamação */}
      <Dialog open={modalResolverAberto} onOpenChange={setModalResolverAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif italic text-2xl text-[#1D2B25] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Resolver Reclamação</span>
            </DialogTitle>
          </DialogHeader>

          {recSelecionada && (
            <form onSubmit={handleConfirmarResolucao} className="space-y-4 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30 space-y-1">
                <p className="font-semibold text-sm text-[#1D2B25]">
                  {recSelecionada.cliente_nome} — {recSelecionada.categoria}
                </p>
                <p className="text-[#5E6E64]">{recSelecionada.loja}</p>
                <p className="text-[#1D2B25] mt-1 bg-white p-2 rounded border border-[#A8C3A0]/20">
                  {recSelecionada.descricao}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Desfecho / Solução Adotada *
                </label>
                <textarea
                  rows={3}
                  required
                  value={desfechoTexto}
                  onChange={(e) => setDesfechoTexto(e.target.value)}
                  placeholder="Descreva a solução adotada com o cliente..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAF2E8]">
                <button
                  type="button"
                  onClick={() => setModalResolverAberto(false)}
                  className="px-4 py-1.5 rounded-full border text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoResolucao}
                  className="px-5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  {salvandoResolucao ? 'Salvando...' : 'Confirmar Resolução'}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
