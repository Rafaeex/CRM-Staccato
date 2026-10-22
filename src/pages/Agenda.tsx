import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Clock,
  Building2,
  CheckCircle2,
  Filter,
  Plus,
  Loader2,
  ExternalLink,
  Phone,
  MessageSquare,
} from 'lucide-react'
import { listarAtendimentos, atualizarAtendimento } from '@/services/atendimentos'
import { listarFollowUps, marcarFollowUpConcluido, gerarLinkWhatsApp } from '@/services/followUps'
import type { Atendimento, FollowUp } from '@/types/crm'
import { LOJAS } from '@/data/boutiqueData'
import { useToast } from '@/hooks/use-toast'

type ModoVisao = 'hoje' | 'semana' | 'todas'

export default function AgendaPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])

  const [modo, setModo] = useState<ModoVisao>('hoje')
  const [filtroLoja, setFiltroLoja] = useState<string>('todas')

  const hoje = new Date().toISOString().split('T')[0]

  const carregarAgenda = async () => {
    setLoading(true)
    try {
      const [aList, fList] = await Promise.all([listarAtendimentos(), listarFollowUps()])
      setAtendimentos(aList)
      setFollowUps(fList)
    } catch (err) {
      console.error('Falha ao carregar agenda:', err)
      toast({
        title: 'Erro ao carregar agenda',
        description: 'Tente recarregar a página.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarAgenda()
  }, [])

  // Concluir Atendimento
  const handleConcluirAtendimento = async (id: string) => {
    try {
      const atAtualizado = await atualizarAtendimento(id, { status: 'Concluído' })
      setAtendimentos((prev) => prev.map((a) => (a.id === id ? atAtualizado : a)))
      toast({
        title: 'Atendimento marcado como Concluído',
        description: 'Status atualizado com sucesso.',
      })
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
      toast({
        title: 'Falha',
        description: 'Não foi possível alterar status.',
        variant: 'destructive',
      })
    }
  }

  // Concluir Follow-up
  const handleConcluirFollowUp = async (id: string) => {
    try {
      await marcarFollowUpConcluido(id, 'Concluído na visão de Agenda do CRM')
      setFollowUps((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'Concluído' } : f)))
      toast({
        title: 'Follow-up concluído',
        description: 'Retorno registrado com sucesso.',
      })
    } catch (err) {
      console.error(err)
    }
  }

  // Filtros de data
  const calcularDataSemana = () => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  }
  const em7Dias = calcularDataSemana()

  const filtrarPorData = (dataStr: string) => {
    if (modo === 'hoje') return dataStr === hoje
    if (modo === 'semana') return dataStr >= hoje && dataStr <= em7Dias
    return true
  }

  const atendimentosFiltrados = atendimentos.filter((a) => {
    const matchData = filtrarPorData(a.data_atendimento)
    const matchLoja =
      filtroLoja === 'todas' || a.loja.toLowerCase().includes(filtroLoja.toLowerCase())
    return matchData && matchLoja
  })

  const followUpsFiltrados = followUps.filter((f) => {
    const matchData = filtrarPorData(f.data_prevista)
    const matchLoja =
      filtroLoja === 'todas' || f.loja.toLowerCase().includes(filtroLoja.toLowerCase())
    return matchData && matchLoja
  })

  return (
    <div className="space-y-6">
      {/* Topo da Agenda */}
      <div className="bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2F6B4F] flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            Compromissos & Visitas
          </span>
          <h1 className="font-semibold text-2xl sm:text-3xl text-[#1D2B25] tracking-tight mt-1">
            Agenda de Atendimentos
          </h1>
          <p className="text-xs sm:text-sm text-[#5E6E64] mt-0.5">
            Visitas marcadas às salas de especificação, reuniões técnicas e follow-ups agendados.
          </p>
        </div>

        {/* Alternador Hoje / Semana / Todas + Filtro Loja */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex bg-[#F7FAF5] p-1 rounded-full border border-[#A8C3A0]/40 text-xs">
            <button
              onClick={() => setModo('hoje')}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                modo === 'hoje'
                  ? 'bg-[#2F6B4F] text-white shadow-sm'
                  : 'text-[#5E6E64] hover:text-[#1D2B25]'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setModo('semana')}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                modo === 'semana'
                  ? 'bg-[#2F6B4F] text-white shadow-sm'
                  : 'text-[#5E6E64] hover:text-[#1D2B25]'
              }`}
            >
              Próximos 7 Dias
            </button>
            <button
              onClick={() => setModo('todas')}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                modo === 'todas'
                  ? 'bg-[#2F6B4F] text-white shadow-sm'
                  : 'text-[#5E6E64] hover:text-[#1D2B25]'
              }`}
            >
              Todos
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-[#F7FAF5] border border-[#A8C3A0]/40 rounded-full px-3 py-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5 text-[#2F6B4F]" />
            <select
              value={filtroLoja}
              onChange={(e) => setFiltroLoja(e.target.value)}
              className="bg-transparent text-xs text-[#1D2B25] focus:outline-none cursor-pointer"
            >
              <option value="todas">Todas as Lojas</option>
              {LOJAS.map((l) => (
                <option key={l.id} value={l.nome}>
                  {l.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#2F6B4F]" />
          <span className="text-xs font-medium text-[#5E6E64]">Carregando agenda...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Seção 1: Atendimentos & Visitas Agendadas */}
          <div className="bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF2E8]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#EAF2E8] text-[#2F6B4F] flex items-center justify-center">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-base sm:text-lg text-[#1D2B25]">
                    Atendimentos Agendados ({atendimentosFiltrados.length})
                  </h2>{' '}
                  <p className="text-xs text-[#5E6E64]">Consultorias marcadas com clientes</p>
                </div>
              </div>
            </div>

            {atendimentosFiltrados.length === 0 ? (
              <p className="text-xs text-[#5E6E64] py-8 text-center">
                Nenhum atendimento agendado para o período selecionado.
              </p>
            ) : (
              <div className="space-y-3">
                {atendimentosFiltrados.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/30 hover:border-[#2F6B4F]/50 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[#1D2B25]">
                            {item.cliente_nome}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-[#A8C3A0]/40 text-[#2F6B4F] font-semibold">
                            {item.horario || '10:00'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5E6E64] mt-0.5">
                          {item.loja} • {item.canal} • Resp: {item.responsavel}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          item.status === 'Concluído'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : item.status === 'Em atendimento'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : item.status === 'Cancelado'
                                ? 'bg-stone-100 text-stone-600 border border-stone-200'
                                : 'bg-stone-100 text-stone-700 border border-stone-200'
                        }`}
                      >
                        {item.status}
                      </span>{' '}
                    </div>

                    <p className="text-xs text-[#1D2B25] bg-white p-2.5 rounded-xl border border-[#A8C3A0]/20">
                      <strong>Interesse: </strong>
                      {item.interesse} — {item.resumo}
                    </p>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#A8C3A0]/20">
                      <span className="text-[11px] text-[#5E6E64]">
                        Data: <strong>{item.data_atendimento}</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        {item.status !== 'Concluído' && (
                          <button
                            type="button"
                            onClick={() => handleConcluirAtendimento(item.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F7FAF5] hover:bg-[#2F6B4F] border border-[#A8C3A0]/30 text-[#2F6B4F] hover:text-white font-semibold text-xs transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Concluir</span>
                          </button>
                        )}{' '}
                        <Link
                          to={`/clientes/${item.cliente}`}
                          className="text-[#2F6B4F] font-semibold text-xs hover:underline flex items-center gap-0.5"
                        >
                          <span>Ficha</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção 2: Follow-ups Agendados */}
          <div className="bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF2E8]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-base sm:text-lg text-[#1D2B25]">
                    Follow-ups Agendados ({followUpsFiltrados.length})
                  </h2>
                  <p className="text-xs text-[#5E6E64]">Retornos por canal e responsável</p>
                </div>
              </div>
            </div>

            {followUpsFiltrados.length === 0 ? (
              <p className="text-xs text-[#5E6E64] py-8 text-center">
                Nenhum follow-up para o período selecionado.
              </p>
            ) : (
              <div className="space-y-3">
                {followUpsFiltrados.map((fu) => {
                  const waLink = gerarLinkWhatsApp(fu.cliente_telefone, fu.mensagem_sugerida)
                  return (
                    <div
                      key={fu.id}
                      className="p-4 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/30 hover:border-[#2F6B4F]/50 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[#1D2B25]">
                              {fu.cliente_nome}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-[#A8C3A0]/40 text-[#2F6B4F] font-semibold">
                              {fu.canal}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5E6E64] mt-0.5">
                            {fu.loja} • Previsto: {fu.data_prevista} {fu.horario_previsto || ''}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            fu.status === 'Concluído'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {fu.status}
                        </span>{' '}
                      </div>

                      <p className="text-xs text-[#1D2B25] font-medium leading-snug">
                        {fu.assunto}
                      </p>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#A8C3A0]/20">
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#2F6B4F] hover:bg-[#25563F] text-white text-[11px] font-medium shadow-xs transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>

                        {fu.status === 'Pendente' && (
                          <button
                            type="button"
                            onClick={() => handleConcluirFollowUp(fu.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/40 text-[#2F6B4F] text-[11px] font-semibold hover:bg-[#EAF2E8] transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3 text-[#2F6B4F]" />
                            <span>Concluir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
