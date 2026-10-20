import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  ClockAlert,
  Users,
  Headphones,
  CheckCircle2,
  TrendingUp,
  PlusCircle,
  Building2,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  Loader2,
  Filter,
} from 'lucide-react'
import { listarClientes } from '@/services/clientes'
import { listarAtendimentos } from '@/services/atendimentos'
import { listarFollowUps, marcarFollowUpConcluido, gerarLinkWhatsApp } from '@/services/followUps'
import type { Cliente, Atendimento, FollowUp } from '@/types/crm'
import { LOJAS } from '@/data/boutiqueData'
import { useToast } from '@/hooks/use-toast'

export default function DashboardPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [lojaFiltro, setLojaFiltro] = useState<string>('todas')

  const hojeStr = new Date().toISOString().split('T')[0]

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [cList, aList, fList] = await Promise.all([
        listarClientes(),
        listarAtendimentos(),
        listarFollowUps(),
      ])
      setClientes(cList)
      setAtendimentos(aList)
      setFollowUps(fList)
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados mais recentes do CRM.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Filtragem opcional por loja
  const atendimentosFiltrados =
    lojaFiltro === 'todas'
      ? atendimentos
      : atendimentos.filter((a) => a.loja.toLowerCase().includes(lojaFiltro.toLowerCase()))

  const followUpsFiltrados =
    lojaFiltro === 'todas'
      ? followUps
      : followUps.filter((f) => f.loja.toLowerCase().includes(lojaFiltro.toLowerCase()))

  const clientesFiltrados =
    lojaFiltro === 'todas'
      ? clientes
      : clientes.filter((c) => c.loja_origem.toLowerCase().includes(lojaFiltro.toLowerCase()))

  // Métricas do dia
  const atendimentosHoje = atendimentosFiltrados.filter((a) => a.data_atendimento === hojeStr)

  const followUpsPendentes = followUpsFiltrados.filter((f) => f.status === 'Pendente')

  const followUpsUrgentes = followUpsPendentes.filter((f) => f.data_prevista <= hojeStr)

  const novosClientesSemana = clientesFiltrados.length

  const totalNegociacao = atendimentosFiltrados.filter((a) => a.status === 'Em negociação').length

  const totalFechados = atendimentosFiltrados.filter((a) => a.status === 'Fechado').length

  const handleConcluirFollowUp = async (id: string, clienteNome: string) => {
    try {
      await marcarFollowUpConcluido(id, 'Concluído via Dashboard do CRM')
      setFollowUps((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'Concluído', data_conclusao: hojeStr } : f)),
      )
      toast({
        title: 'Follow-up concluído',
        description: `Contato com ${clienteNome} registrado com sucesso.`,
      })
    } catch (err) {
      console.error('Erro ao concluir follow-up:', err)
      toast({
        title: 'Falha ao atualizar',
        description: 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#2F6B4F]" />
        <span className="text-sm font-medium text-[#5E6E64]">Carregando indicadores do dia...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Visão do Dia */}
      <div className="bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2F6B4F]">
            <Building2 className="w-3.5 h-3.5" />
            <span>Painel de Atendimento • 7 Lojas</span>
          </div>
          <h1 className="font-serif italic font-semibold text-2xl sm:text-3xl text-[#1D2B25] mt-1">
            Visão Geral do Dia
          </h1>
          <p className="text-xs sm:text-sm text-[#5E6E64] mt-0.5">
            Acompanhe atendimentos presenciais, negociações em andamento e retornos pendentes.
          </p>
        </div>

        {/* Filtro de Loja + Ações Rápidas */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-[#F7FAF5] border border-[#A8C3A0]/50 rounded-full px-3 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#2F6B4F]" />
            <select
              value={lojaFiltro}
              onChange={(e) => setLojaFiltro(e.target.value)}
              className="bg-transparent text-xs text-[#1D2B25] focus:outline-none cursor-pointer"
            >
              <option value="todas">Todas as 7 Lojas</option>
              {LOJAS.map((l) => (
                <option key={l.id} value={l.nome}>
                  {l.nome}
                </option>
              ))}
            </select>
          </div>

          <Link
            to="/atendimentos"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold shadow-sm transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#A8C3A0]" />
            <span>Novo Atendimento</span>
          </Link>
          <Link
            to="/clientes"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EAF2E8] hover:bg-[#d8e8d5] text-[#2F6B4F] text-xs font-semibold transition-all"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Novo Cliente</span>
          </Link>
        </div>
      </div>

      {/* 4 Cards de Métricas do Dia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Atendimentos Hoje */}
        <div className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#5E6E64]">
              Atendimentos de Hoje
            </span>
            <p className="font-serif italic font-bold text-3xl text-[#1D2B25] mt-1">
              {atendimentosHoje.length}
            </p>
            <span className="text-[11px] text-[#2F6B4F] font-medium flex items-center gap-1 mt-1">
              <CalendarDays className="w-3 h-3" />
              <span>{new Date().toLocaleDateString('pt-BR')}</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EAF2E8] text-[#2F6B4F] flex items-center justify-center">
            <Headphones className="w-6 h-6" />
          </div>
        </div>

        {/* Follow-ups Pendentes */}
        <div className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#5E6E64]">
              Follow-ups a Fazer
            </span>
            <p className="font-serif italic font-bold text-3xl text-[#1D2B25] mt-1">
              {followUpsPendentes.length}
            </p>
            <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1 mt-1">
              <ClockAlert className="w-3 h-3" />
              <span>{followUpsUrgentes.length} vencem hoje</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <ClockAlert className="w-6 h-6" />
          </div>
        </div>

        {/* Em Negociação */}
        <div className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#5E6E64]">
              Em Negociação
            </span>
            <p className="font-serif italic font-bold text-3xl text-[#1D2B25] mt-1">
              {totalNegociacao}
            </p>
            <span className="text-[11px] text-[#2F6B4F] font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>{totalFechados} fechados</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EAF2E8] text-[#2F6B4F] flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Base de Clientes */}
        <div className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#5E6E64]">
              Base de Clientes
            </span>
            <p className="font-serif italic font-bold text-3xl text-[#1D2B25] mt-1">
              {novosClientesSemana}
            </p>
            <span className="text-[11px] text-[#2F6B4F] font-medium flex items-center gap-1 mt-1">
              <Users className="w-3 h-3" />
              <span>Nas 7 boutiques</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EAF2E8] text-[#2F6B4F] flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid Duplo: Agenda de Hoje & Follow-ups a Fazer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Agenda de Hoje (7 colunas) */}
        <div className="lg:col-span-7 bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAF2E8]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#EAF2E8] text-[#2F6B4F] flex items-center justify-center">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif italic font-semibold text-lg text-[#1D2B25]">
                  Agenda de Atendimentos de Hoje
                </h2>
                <p className="text-xs text-[#5E6E64]">Visitas agendadas e consultas nas lojas</p>
              </div>
            </div>
            <Link
              to="/agenda"
              className="text-xs font-semibold text-[#2F6B4F] hover:underline flex items-center gap-1"
            >
              <span>Ver agenda</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {atendimentosHoje.length === 0 ? (
            <div className="py-12 text-center text-[#5E6E64] space-y-2">
              <p className="text-sm">Nenhum atendimento registrado para hoje ainda.</p>
              <Link
                to="/atendimentos"
                className="inline-flex items-center gap-1.5 text-xs text-[#2F6B4F] font-semibold underline"
              >
                + Registrar primeiro atendimento do dia
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {atendimentosHoje.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#F7FAF5] hover:bg-[#EAF2E8]/40 border border-[#A8C3A0]/30 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif italic font-semibold text-base text-[#1D2B25]">
                          {item.cliente_nome}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-[#A8C3A0]/40 text-[#2F6B4F] font-semibold">
                          {item.horario || '09:00'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2F6B4F]/10 text-[#2F6B4F] font-semibold">
                          {item.canal}
                        </span>
                      </div>
                      <p className="text-xs text-[#5E6E64] mt-0.5">
                        <span className="font-medium text-[#1D2B25]">{item.loja}</span> • Resp.:{' '}
                        {item.responsavel}
                      </p>
                    </div>

                    <span
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                        item.status === 'Fechado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'Em negociação'
                            ? 'bg-amber-100 text-amber-800'
                            : item.status === 'Perdido'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p className="text-xs text-[#1D2B25] bg-white p-2.5 rounded-xl border border-[#A8C3A0]/20">
                    <span className="font-semibold text-[#2F6B4F]">Interesse: </span>
                    {item.interesse} — {item.resumo}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-[#5E6E64] pt-1">
                    {item.valor_estimado ? (
                      <span className="font-medium text-[#1D2B25]">
                        Estimativa: R$ {item.valor_estimado.toLocaleString('pt-BR')}
                      </span>
                    ) : (
                      <span>Sob especificação</span>
                    )}
                    <Link
                      to={`/clientes/${item.cliente}`}
                      className="text-[#2F6B4F] font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Abrir ficha</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coluna Direita: Follow-ups a Fazer (5 colunas) */}
        <div className="lg:col-span-5 bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAF2E8]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
                <ClockAlert className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif italic font-semibold text-lg text-[#1D2B25]">
                  Follow-ups a Fazer
                </h2>
                <p className="text-xs text-[#5E6E64]">Retornos ordenados por urgência</p>
              </div>
            </div>
            <Link
              to="/follow-ups"
              className="text-xs font-semibold text-[#2F6B4F] hover:underline flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {followUpsPendentes.length === 0 ? (
            <div className="py-12 text-center text-[#5E6E64]">
              <CheckCircle2 className="w-8 h-8 text-[#2F6B4F] mx-auto mb-2 opacity-80" />
              <p className="text-sm font-medium text-[#1D2B25]">Nenhum follow-up pendente!</p>
              <p className="text-xs text-[#5E6E64]">Todos os retornos de clientes estão em dia.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {followUpsPendentes.slice(0, 5).map((fu) => {
                const waLink = gerarLinkWhatsApp(fu.cliente_telefone, fu.mensagem_sugerida)
                return (
                  <div
                    key={fu.id}
                    className="p-3.5 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/30 hover:border-[#2F6B4F]/50 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-[#1D2B25]">
                            {fu.cliente_nome}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white border border-[#A8C3A0]/30 text-[#2F6B4F] font-mono">
                            {fu.canal}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5E6E64] mt-0.5">
                          {fu.loja} • Resp: {fu.responsavel}
                        </p>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold shrink-0">
                        {fu.horario_previsto || 'Hoje'}
                      </span>
                    </div>

                    <p className="text-xs text-[#1D2B25] font-medium leading-snug">{fu.assunto}</p>

                    {/* Botões de Ação Imediata: WhatsApp + Concluir */}
                    <div className="flex items-center justify-between pt-1 gap-2 border-t border-[#A8C3A0]/20">
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium shadow-sm transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Abrir WhatsApp</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleConcluirFollowUp(fu.id, fu.cliente_nome)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#EAF2E8] border border-[#A8C3A0]/50 text-[#2F6B4F] text-[11px] font-semibold transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3 text-[#2F6B4F]" />
                        <span>Feito</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
