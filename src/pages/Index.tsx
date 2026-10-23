import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
  Sparkles,
  ExternalLink,
  Kanban,
  CheckSquare,
  ArrowRight,
  UserCheck,
  SlidersHorizontal,
  FileSpreadsheet,
} from 'lucide-react'
import { ModalConfiguracaoSla } from '@/components/ModalConfiguracaoSla'
import { calcularMetricasDesempenho, mesmaLoja } from '@/services/indices'
import { listarAtendimentos, atualizarAtendimento } from '@/services/atendimentos'
import { listarClientes } from '@/services/clientes'
import { listarFollowUps, marcarFollowUpConcluido, gerarLinkWhatsApp } from '@/services/followUps'
import { listarReclamacoes, resolverReclamacao } from '@/services/reclamacoes'
import { listarCartoesKanban } from '@/services/kanban'
import { getUsuarioAtualInfo } from '@/services/permissoes'
import type { Atendimento, Cliente, FollowUp, Reclamacao, CartaoKanban } from '@/types/crm'
import { LOJAS } from '@/data/boutiqueData'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function DashboardPage() {
  const { toast } = useToast()
  const userInfo = getUsuarioAtualInfo()

  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const lojaParam = searchParams.get('loja')

  const [lojaFiltro, setLojaFiltro] = useState<string>(() => {
    if (userInfo.isAtendente && userInfo.loja) {
      return userInfo.loja
    }
    if (lojaParam) {
      return lojaParam
    }
    return 'Todas as Lojas'
  })

  // Sincroniza se a query param mudar na URL (ex: clique na sidebar)
  useEffect(() => {
    if (userInfo.isAtendente && userInfo.loja) {
      setLojaFiltro(userInfo.loja)
      return
    }
    if (lojaParam) {
      setLojaFiltro(lojaParam)
    } else {
      setLojaFiltro('Todas as Lojas')
    }
  }, [lojaParam, userInfo.isAtendente, userInfo.loja])

  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [reclamacoes, setReclamacoes] = useState<Reclamacao[]>([])
  const [cartoesKanban, setCartoesKanban] = useState<CartaoKanban[]>([])

  // Modal para resolução rápida de reclamação
  const [modalResolverAberto, setModalResolverAberto] = useState(false)
  const [recSelecionada, setRecSelecionada] = useState<Reclamacao | null>(null)
  const [desfechoTexto, setDesfechoTexto] = useState('')
  const [salvandoResolucao, setSalvandoResolucao] = useState(false)

  const hoje = new Date().toISOString().split('T')[0]

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [aList, cList, fList, rList, kList] = await Promise.all([
        listarAtendimentos(),
        listarClientes(),
        listarFollowUps(),
        listarReclamacoes(),
        listarCartoesKanban(),
      ])
      setAtendimentos(aList)
      setClientes(cList)
      setFollowUps(fList)
      setReclamacoes(rList)
      setCartoesKanban(kList)
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

  // Filtragem unificada por loja e por papel
  const filtraPorLoja = (itemLoja: string) => {
    if (userInfo.isAtendente && userInfo.loja) {
      return mesmaLoja(itemLoja, userInfo.loja)
    }
    if (lojaFiltro === 'Todas as Lojas') return true
    return mesmaLoja(itemLoja, lojaFiltro)
  }

  const atendimentosFiltrados = atendimentos.filter((a) => filtraPorLoja(a.loja))
  const clientesFiltrados = clientes.filter((c) => filtraPorLoja(c.loja_origem))
  const followUpsFiltrados = followUps.filter((f) => filtraPorLoja(f.loja))
  const reclamacoesFiltradas = reclamacoes.filter((r) => filtraPorLoja(r.loja))
  const cartoesFiltrados = cartoesKanban.filter((k) => filtraPorLoja(k.loja))

  // Indicadores
  const atendimentosHoje = atendimentosFiltrados.filter((a) => a.data_atendimento === hoje)
  const followUpsPendentes = followUpsFiltrados.filter((f) => f.status === 'Pendente')
  const followUpsVencidos = followUpsPendentes.filter((f) => f.data_prevista < hoje)
  const followUpsHoje = followUpsPendentes.filter((f) => f.data_prevista === hoje)

  const reclamacoesAbertas = reclamacoesFiltradas.filter((r) => r.status !== 'Resolvida')
  const reclamacoesVencidas = reclamacoesAbertas.filter((r) => r.prazo_resolucao < hoje)

  // Meus dados específicos para o Atendente
  const meusCartoesHoje = cartoesFiltrados.filter(
    (c) => c.coluna === 'Fazendo hoje' || c.data_limite === hoje,
  )
  const minhasReclamacoes = reclamacoesAbertas.filter(
    (r) =>
      r.responsavel.toLowerCase().includes(userInfo.name.toLowerCase()) ||
      r.responsavel.toLowerCase().includes('atendente') ||
      userInfo.isAtendente,
  )

  // Índices consolidados do Gestor (centralizados via serviço compartilhado)
  const metricasGestor = calcularMetricasDesempenho({
    atendimentos: atendimentosFiltrados,
    followUps: followUpsFiltrados,
    reclamacoes: reclamacoesFiltradas,
    quebras: [],
    hojeRef: hoje,
  })

  const totalReclamacoes = metricasGestor.totalOcorrencias
  const totalResolvidas = metricasGestor.ocorrenciasResolvidas
  const taxaResolucaoReclamacoes = metricasGestor.taxaResolucaoOcorrencias

  const ocorrenciasResolvidasNoSla = metricasGestor.ocorrenciasResolvidasNoSla
  const taxaCumprimentoSla = metricasGestor.taxaCumprimentoSla

  const followUpsConcluidos = metricasGestor.followUpsConcluidos
  const followUpsNoPrazo = metricasGestor.followUpsNoPrazo
  const taxaFollowUpsNoPrazo = metricasGestor.taxaFollowUpsNoPrazo
  const tempoMedioResolucaoDias = metricasGestor.tempoMedioResolucaoDias

  // Concluir Follow-up
  const handleConcluirFollowUp = async (id: string) => {
    try {
      await marcarFollowUpConcluido(id, 'Concluído no Painel')
      setFollowUps((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'Concluído', data_conclusao: hoje } : f)),
      )
      toast({
        title: 'Follow-up concluído',
        description: 'Contato registrado com sucesso.',
      })
    } catch (err) {
      console.error(err)
    }
  }

  const [modalSlaAberto, setModalSlaAberto] = useState(false)

  // Concluir Atendimento
  const handleConcluirAtendimento = async (id: string) => {
    try {
      const atualizado = await atualizarAtendimento(id, { status: 'Concluído' })
      setAtendimentos((prev) => prev.map((a) => (a.id === id ? atualizado : a)))
      toast({
        title: 'Atendimento Concluído',
        description: 'Marcado como concluído.',
      })
    } catch (err) {
      console.error(err)
    }
  }

  // Resolver Reclamação
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
        description: 'Desfecho gravado com sucesso.',
      })
    } catch (err) {
      console.error(err)
    } finally {
      setSalvandoResolucao(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Topo Limpo e Arejado */}
      <div className="bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl sm:text-3xl text-[#1D2B25] tracking-tight">
            {userInfo.isAtendente ? 'Painel de Atendimento - CRM' : 'Painel de Gestão - CRM'}
          </h1>
        </div>

        {/* Seletor de Loja (exibido apenas para o Gestor) */}
        {userInfo.isGestor ? (
          <div className="flex items-center gap-2 bg-[#F7FAF5] border border-[#A8C3A0]/50 rounded-2xl p-1.5 self-stretch md:self-auto">
            <Building2 className="w-4 h-4 text-[#2F6B4F] ml-2 shrink-0" />
            <select
              value={lojaFiltro}
              onChange={(e) => {
                const val = e.target.value
                setLojaFiltro(val)
                if (val === 'Todas as Lojas') {
                  const next = new URLSearchParams(searchParams)
                  next.delete('loja')
                  setSearchParams(next)
                } else {
                  setSearchParams({ loja: val })
                }
              }}
              className="bg-transparent text-xs sm:text-sm font-semibold text-[#1D2B25] focus:outline-none cursor-pointer pr-3 py-1"
            >
              <option value="Todas as Lojas">Todas as 7 Lojas</option>
              {LOJAS.map((l) => (
                <option key={l.id} value={l.nome}>
                  {l.nome}
                </option>
              ))}
            </select>

            <button
              onClick={() => setModalSlaAberto(true)}
              title="Configurar SLAs por Gravidade"
              className="p-1.5 rounded-xl hover:bg-[#EAF2E8] text-[#2F6B4F] transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <Link
              to="/relatorios"
              title="Abrir Relatório de Desempenho Mensal"
              className="p-1.5 rounded-xl hover:bg-[#EAF2E8] text-[#2F6B4F] transition-colors flex items-center"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/40 text-xs text-[#2F6B4F] font-semibold">
            <UserCheck className="w-4 h-4" />
            <span>Unidade Fixa: {userInfo.loja || 'Vila Olímpia'}</span>
          </div>
        )}
      </div>

      {/* ========================================================
          VISÃO DO ATENDENTE: Foco no próprio dia (enxuta)
         ======================================================== */}
      {userInfo.isAtendente ? (
        <div className="space-y-6">
          {/* 3 Cards Operacionais do Atendente */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* O que tenho hoje */}
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
                <p className="font-bold text-3xl text-[#1D2B25] tracking-tight">
                  {atendimentosHoje.length}
                </p>
                <p className="text-[11px] text-[#5E6E64] mt-1">Agendados na sua loja para hoje</p>
              </div>
            </div>

            {/* Follow-ups meus */}
            <div className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E6E64]">
                  Follow-ups a Fazer
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <ClockAlert className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <p className="font-bold text-3xl text-[#1D2B25] tracking-tight">
                    {followUpsPendentes.length}
                  </p>
                  {followUpsVencidos.length > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                      {followUpsVencidos.length} vencido{followUpsVencidos.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#5E6E64] mt-1">
                  {followUpsHoje.length} para retornar hoje
                </p>
              </div>
            </div>

            {/* Minhas Reclamações */}
            <div className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E6E64]">
                  Ocorrências sob Minha Responsabilidade
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#F7FAF5] text-[#5E6E64] border border-[#A8C3A0]/30 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <p className="font-bold text-3xl text-[#1D2B25] tracking-tight">
                    {minhasReclamacoes.length}
                  </p>
                  {minhasReclamacoes.filter((r) => r.prazo_resolucao < hoje).length > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                      {minhasReclamacoes.filter((r) => r.prazo_resolucao < hoje).length} vencida(s)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#5E6E64] mt-1">
                  {minhasReclamacoes.filter((r) => r.prazo_resolucao >= hoje).length} em prazo
                  regular
                </p>
              </div>
            </div>
          </div>

          {/* Duas Colunas: Meu Kanban Hoje + Follow-ups Imediatos com WhatsApp */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Meu Kanban Hoje */}
            <div className="lg:col-span-6 bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAF2E8]">
                <div className="flex items-center gap-2">
                  <Kanban className="w-4 h-4 text-[#2F6B4F]" />
                  <h2 className="font-semibold text-base sm:text-lg text-[#1D2B25]">
                    Meu Quadro Hoje ({meusCartoesHoje.length})
                  </h2>
                </div>
                <Link
                  to="/quadro"
                  className="text-xs font-semibold text-[#2F6B4F] hover:underline flex items-center gap-1"
                >
                  <span>Abrir Kanban</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {meusCartoesHoje.length === 0 ? (
                <p className="text-xs text-[#5E6E64] py-8 text-center">
                  Nenhum cartão prioritário marcado para hoje na sua loja.
                </p>
              ) : (
                <div className="space-y-3">
                  {meusCartoesHoje.map((card) => (
                    <div
                      key={card.id}
                      className="p-3.5 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/30 text-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm text-[#1D2B25]">{card.titulo}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF2E8] text-[#2F6B4F]">
                          {card.coluna}
                        </span>
                      </div>
                      {card.cliente_nome && (
                        <p className="text-[11px] text-[#5E6E64]">
                          Cliente: <strong>{card.cliente_nome}</strong>
                        </p>
                      )}
                      {card.descricao && (
                        <p className="text-[#1D2B25] bg-white p-2 rounded-xl border border-[#A8C3A0]/20 line-clamp-2">
                          {card.descricao}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Follow-ups com 1 clique para WhatsApp */}
            <div className="lg:col-span-6 bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAF2E8]">
                <div className="flex items-center gap-2">
                  <ClockAlert className="w-4 h-4 text-[#2F6B4F]" />
                  <h2 className="font-semibold text-base sm:text-lg text-[#1D2B25]">
                    Retornos Pendentes ({followUpsPendentes.length})
                  </h2>
                </div>
                <Link
                  to="/follow-ups"
                  className="text-xs font-semibold text-[#2F6B4F] hover:underline flex items-center gap-1"
                >
                  <span>Ver todos</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {followUpsPendentes.length === 0 ? (
                <p className="text-xs text-[#5E6E64] py-8 text-center">
                  Nenhum retorno pendente para sua loja hoje!
                </p>
              ) : (
                <div className="space-y-3">
                  {followUpsPendentes.slice(0, 4).map((fu) => {
                    const waLink = gerarLinkWhatsApp(fu.cliente_telefone, fu.mensagem_sugerida)
                    return (
                      <div
                        key={fu.id}
                        className="p-3.5 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/30 text-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-semibold text-sm text-[#1D2B25]">
                              {fu.cliente_nome}
                            </span>
                            <p className="text-[11px] text-[#5E6E64] mt-0.5">
                              Previsto: <strong>{fu.data_prevista}</strong> ({fu.canal})
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-xl bg-[#2F6B4F] hover:bg-[#25563F] text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-colors"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleConcluirFollowUp(fu.id)}
                              className="px-2 py-1 rounded-xl bg-white border border-[#A8C3A0]/40 text-[#2F6B4F] text-[11px] font-semibold hover:bg-[#EAF2E8] transition-colors"
                            >
                              Feito
                            </button>
                          </div>
                        </div>
                        <p className="text-[#1D2B25] bg-white p-2 rounded-xl border border-[#A8C3A0]/20">
                          {fu.assunto}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================
            VISÃO DO GESTOR: KPIs consolidados das 7 lojas
           ======================================================== */
        <div className="space-y-6">
          {/* 4 Cards de Indicadores do Gestor */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E6E64]">
                Atendimentos Hoje
              </span>
              <div className="mt-3">
                <p className="font-bold text-3xl text-[#1D2B25] tracking-tight">
                  {atendimentosHoje.length}
                </p>
                <p className="text-[11px] text-[#5E6E64] mt-1">
                  {atendimentosFiltrados.length} atendimentos no histórico
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E6E64]">
                Follow-ups Pendentes
              </span>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <p className="font-bold text-3xl text-[#1D2B25] tracking-tight">
                    {followUpsPendentes.length}
                  </p>
                  {followUpsVencidos.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      {followUpsVencidos.length} atrasado{followUpsVencidos.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#5E6E64] mt-1">
                  {followUpsHoje.length} agendados para hoje
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E6E64]">
                Ocorrências em Aberto
              </span>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <p className="font-bold text-3xl text-[#1D2B25] tracking-tight">
                    {reclamacoesAbertas.length}
                  </p>
                  {reclamacoesVencidas.length > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                      {reclamacoesVencidas.length} fora do prazo
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#5E6E64] mt-1">
                  {totalResolvidas} resolvidas no histórico
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E6E64]">
                Clientes na Base
              </span>
              <div className="mt-3">
                <p className="font-bold text-3xl text-[#1D2B25] tracking-tight">
                  {clientesFiltrados.length}
                </p>
                <p className="text-[11px] text-[#5E6E64] mt-1">
                  {
                    clientesFiltrados.filter((c) => c.status_atendimento === 'Em atendimento')
                      .length
                  }{' '}
                  em atendimento ativo
                </p>
              </div>
            </div>
          </div>

          {/* Régua de Qualidade do Atendimento — Indicadores Operacionais Estáticos */}
          <div className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF2E8]">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2F6B4F]">
                  Indicadores Operacionais
                </span>
                <h3 className="font-semibold text-base text-[#1D2B25] mt-0.5">
                  Índices de Qualidade do Atendimento
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/relatorios"
                  className="hidden sm:inline-flex items-center gap-1 text-xs text-[#2F6B4F] font-semibold hover:underline mr-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Relatório Mensal</span>
                </Link>
                <span className="text-xs text-[#5E6E64] font-medium px-2.5 py-1 rounded-full bg-[#F7FAF5] border border-[#A8C3A0]/30">
                  {lojaFiltro === 'Todas as Lojas'
                    ? 'Consolidado Rede'
                    : lojaFiltro.replace(' (SP)', '')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4">
              {/* Indicador 1: Resolução de Reclamações */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/25">
                <div className="px-2.5 py-1.5 rounded-lg bg-[#EAF2E8] border border-[#A8C3A0]/40 text-[#2F6B4F] text-xs font-bold font-mono shrink-0">
                  {taxaResolucaoReclamacoes}%
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64] block truncate">
                    Resolução de Ocorrências
                  </span>
                  <p className="text-xs font-semibold text-[#1D2B25] mt-0.5">
                    {totalResolvidas} de {totalReclamacoes} tratadas
                  </p>
                  <p className="text-[11px] text-[#5E6E64] truncate">com desfecho final</p>
                </div>
              </div>

              {/* Indicador 2: Follow-ups no Prazo */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/25">
                <div className="px-2.5 py-1.5 rounded-lg bg-[#EAF2E8] border border-[#A8C3A0]/40 text-[#2F6B4F] text-xs font-bold font-mono shrink-0">
                  {taxaFollowUpsNoPrazo}%
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64] block truncate">
                    Follow-ups no Prazo
                  </span>
                  <p className="text-xs font-semibold text-[#1D2B25] mt-0.5">
                    {followUpsNoPrazo} de {followUpsConcluidos || 1} pontuais
                  </p>
                  <p className="text-[11px] text-[#5E6E64] truncate">cronograma cumprido</p>
                </div>
              </div>

              {/* Indicador 3: Cumprimento de SLA */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/25">
                <div
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold font-mono shrink-0 ${
                    taxaCumprimentoSla >= 85
                      ? 'bg-[#EAF2E8] border-[#A8C3A0]/40 text-[#2F6B4F]'
                      : taxaCumprimentoSla >= 70
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {taxaCumprimentoSla}%
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64] block truncate">
                    Cumprimento de SLA
                  </span>
                  <p className="text-xs font-semibold text-[#1D2B25] mt-0.5">
                    {ocorrenciasResolvidasNoSla} de {totalResolvidas || 1} no prazo
                  </p>
                  <p className="text-[11px] text-[#5E6E64] truncate">dentro do SLA da gravidade</p>
                </div>
              </div>

              {/* Indicador 4: Tempo Médio de Resolução */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/25">
                <div className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold font-mono shrink-0">
                  {tempoMedioResolucaoDias !== null ? `${tempoMedioResolucaoDias}d` : '—'}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64] block truncate">
                    Tempo Médio Resolução
                  </span>
                  <p className="text-xs font-semibold text-[#1D2B25] mt-0.5">
                    {tempoMedioResolucaoDias !== null
                      ? `${tempoMedioResolucaoDias} dias médios`
                      : 'Sem ocorrências'}
                  </p>
                  <p className="text-[11px] text-[#5E6E64] truncate">abertura ao encerramento</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ocorrências com Ação Imediata + Quadro Kanban */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAF2E8]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-slate-500" />
                  <h2 className="font-semibold text-base sm:text-lg text-[#1D2B25]">
                    Ocorrências Prioritárias
                  </h2>
                </div>
                <Link
                  to="/ocorrencias"
                  className="text-xs font-semibold text-[#2F6B4F] hover:underline flex items-center gap-1"
                >
                  <span>Ver todas</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {reclamacoesAbertas.length === 0 ? (
                <p className="text-xs text-[#5E6E64] py-8 text-center">
                  Nenhuma ocorrência em aberto para a seleção atual.
                </p>
              ) : (
                <div className="space-y-3">
                  {reclamacoesAbertas.slice(0, 4).map((rec) => {
                    const isAtrasada = rec.prazo_resolucao < hoje
                    const isCritica =
                      rec.gravidade === 'Alta' || rec.gravidade === 'Urgente' || isAtrasada

                    return (
                      <div
                        key={rec.id}
                        className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                          isAtrasada
                            ? 'bg-rose-50/40 border-rose-200'
                            : 'bg-[#F7FAF5] border-[#A8C3A0]/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-sm text-[#1D2B25]">
                                {rec.cliente_nome}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  rec.gravidade === 'Urgente'
                                    ? 'bg-rose-50 text-rose-800 border border-rose-200 font-bold'
                                    : rec.gravidade === 'Alta'
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {rec.gravidade}
                              </span>
                              {isAtrasada && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                                  Vencida
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#5E6E64] mt-0.5">
                              {rec.loja} • Resp: {rec.responsavel} • Prazo: {rec.prazo_resolucao}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAbrirResolucao(rec)}
                            className="px-2.5 py-1 rounded-xl bg-[#2F6B4F] text-white text-[11px] font-semibold hover:bg-[#25563F] transition-colors"
                          >
                            Resolver
                          </button>
                        </div>
                        <p className="text-[#1D2B25] bg-white p-2 rounded-xl border border-[#A8C3A0]/20 line-clamp-2">
                          {rec.descricao}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="lg:col-span-6 bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAF2E8]">
                <div className="flex items-center gap-2">
                  <Kanban className="w-4 h-4 text-[#2F6B4F]" />
                  <h2 className="font-semibold text-base sm:text-lg text-[#1D2B25]">
                    Fluxo do Quadro
                  </h2>
                </div>
                <Link
                  to="/quadro"
                  className="text-xs font-semibold text-[#2F6B4F] hover:underline flex items-center gap-1"
                >
                  <span>Abrir Quadro</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {['A fazer', 'Fazendo hoje', 'Aguardando cliente', 'Resolvido'].map((col) => {
                  const count = cartoesFiltrados.filter((c) => c.coluna === col).length
                  return (
                    <div
                      key={col}
                      className="p-3.5 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/30 space-y-1"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5E6E64]">
                        {col}
                      </span>
                      <p className="font-bold text-2xl text-[#1D2B25] tracking-tight">{count}</p>
                    </div>
                  )
                })}
              </div>

              <div className="pt-2">
                <Link
                  to="/quadro"
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[#EAF2E8] text-[#2F6B4F] text-xs font-semibold hover:bg-[#d8e8d5] transition-colors"
                >
                  <span>Gerenciar cartões com anexos e fluxos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração de SLA por Gravidade */}
      <ModalConfiguracaoSla
        open={modalSlaAberto}
        onOpenChange={setModalSlaAberto}
        onSalvo={carregarDados}
      />

      {/* Modal de Resolução de Ocorrência */}
      <Dialog open={modalResolverAberto} onOpenChange={setModalResolverAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-semibold text-xl text-[#1D2B25] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-slate-700" />
              <span>Resolver Ocorrência</span>
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
                  className="px-4 py-1.5 rounded-xl border border-stone-200 text-xs text-[#5E6E64] hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoResolucao}
                  className="px-4 py-1.5 rounded-xl bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold"
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
