import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Search,
  Filter,
  CheckCircle2,
  Clock4,
  CheckCheck,
  XCircle,
  ExternalLink,
  RefreshCw,
  LogOut,
  User,
  PlusCircle,
  Inbox,
  AlertCircle,
  MessageSquare,
} from 'lucide-react'
import { LOJAS } from '@/data/boutiqueData'
import { Solicitacao } from '@/types/boutique'
import {
  listarSolicitacoes,
  atualizarStatusSolicitacao,
  buildWhatsAppLink,
} from '@/services/solicitacoes'
import useRealtime from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export default function PedidosPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [pedidos, setPedidos] = useState<Solicitacao[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [lojaFilter, setLojaFilter] = useState<string>('todas')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const currentUser = pb.authStore.record

  // Carregar lista de solicitações
  const fetchPedidos = async () => {
    try {
      setLoading(true)
      const data = await listarSolicitacoes()
      setPedidos(data)
    } catch (err) {
      console.error('Erro ao listar solicitações:', err)
      toast({
        title: 'Erro ao carregar solicitações',
        description: 'Verifique se você está autenticado ou tente recarregar a página.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPedidos()
  }, [])

  // Atualização em Tempo Real via hook useRealtime no collection 'solicitacoes'
  useRealtime<Solicitacao>(
    'solicitacoes',
    (event) => {
      if (event.action === 'create') {
        setPedidos((prev) => [event.record, ...prev.filter((p) => p.id !== event.record.id)])
        toast({
          title: 'Novo agendamento recebido!',
          description: `${event.record.cliente_nome} solicitou visita na unidade ${event.record.loja}.`,
        })
      } else if (event.action === 'update') {
        setPedidos((prev) => prev.map((p) => (p.id === event.record.id ? event.record : p)))
      } else if (event.action === 'delete') {
        setPedidos((prev) => prev.filter((p) => p.id !== event.record.id))
      }
    },
    pb.authStore.isValid,
  )

  // Atualização inline de status via dropdown
  const handleStatusChange = async (id: string, newStatus: Solicitacao['status']) => {
    try {
      setUpdatingId(id)
      const updated = await atualizarStatusSolicitacao(id, newStatus)
      setPedidos((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: updated.status } : item)),
      )
      toast({
        title: 'Status atualizado com sucesso',
        description: `O pedido agora está como "${newStatus}".`,
      })
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
      toast({
        title: 'Erro ao atualizar status',
        description: 'Não foi possível atualizar o status do pedido.',
        variant: 'destructive',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const handleLogout = () => {
    pb.authStore.clear()
    toast({
      title: 'Sessão encerrada',
      description: 'Você saiu do painel administrativo.',
    })
    navigate('/login')
  }

  // Filtragem e busca
  const filteredPedidos = useMemo(() => {
    return pedidos.filter((item) => {
      // Filtro de status
      if (statusFilter !== 'todos' && item.status !== statusFilter) {
        return false
      }
      // Filtro de loja
      if (lojaFilter !== 'todas' && item.loja !== lojaFilter) {
        return false
      }
      // Busca por nome ou telefone
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const matchName = item.cliente_nome.toLowerCase().includes(query)
        const matchPhone = item.telefone.replace(/\D/g, '').includes(query.replace(/\D/g, ''))
        const matchEmail = item.email.toLowerCase().includes(query)
        return matchName || matchPhone || matchEmail
      }
      return true
    })
  }, [pedidos, statusFilter, lojaFilter, searchTerm])

  // Badge de Status com cores especificadas:
  // Pendente âmbar, Confirmado verde, Concluído azul, Cancelado cinza
  const renderStatusBadge = (status: Solicitacao['status']) => {
    switch (status) {
      case 'Pendente':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F5C84C]/25 text-[#9C7500] border border-[#F5C84C]/50 transition-colors">
            <Clock4 className="w-3.5 h-3.5" />
            <span>Pendente</span>
          </span>
        )
      case 'Confirmado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#3E9B6C]/20 text-[#256B48] border border-[#3E9B6C]/40 transition-colors">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirmado</span>
          </span>
        )
      case 'Concluído':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#6C8EBF]/20 text-[#2C4E7E] border border-[#6C8EBF]/40 transition-colors">
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Concluído</span>
          </span>
        )
      case 'Cancelado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#9AA3AD]/25 text-[#525B66] border border-[#9AA3AD]/40 transition-colors">
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancelado</span>
          </span>
        )
      default:
        return null
    }
  }

  // Formatação de data amigável
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoString
    }
  }

  const formatVisitDate = (dateStr: string) => {
    if (dateStr.includes('-')) {
      const [ano, mes, dia] = dateStr.split('-')
      return `${dia}/${mes}/${ano}`
    }
    return dateStr
  }

  return (
    <div className="min-h-screen bg-[#F7FAF5] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header do Painel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-[#A8C3A0]/30">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2F6B4F] flex items-center justify-center text-white border border-[#A8C3A0]/50 shadow-sm">
                <span className="font-serif italic text-xl font-bold">B</span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#2F6B4F]">
                  Área Administrativa
                </span>
                <h1 className="font-serif italic font-semibold text-3xl sm:text-4xl text-[#1D2B25] leading-tight">
                  Painel de Solicitações
                </h1>
              </div>
            </div>
            <p className="mt-2 text-sm text-[#5E6E64]">
              Acompanhe agendamentos em tempo real, atualize status e contate clientes pelo
              WhatsApp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchPedidos}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-[#EAF2E8] border border-[#A8C3A0]/40 text-xs font-semibold text-[#1D2B25] shadow-sm transition-colors"
              title="Recarregar dados"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#2F6B4F] ${loading ? 'animate-spin' : ''}`}
              />
              <span>Atualizar</span>
            </button>

            <Link
              to="/agendar"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-xs font-semibold text-white shadow-sm transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#A8C3A0]" />
              <span>Novo Agendamento</span>
            </Link>

            <div className="h-6 w-px bg-[#A8C3A0]/40 hidden sm:block" />

            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-[#A8C3A0]/40 text-xs text-[#5E6E64]">
              <User className="w-3.5 h-3.5 text-[#2F6B4F]" />
              <span className="max-w-[130px] truncate font-medium text-[#1D2B25]">
                {currentUser?.email || 'Autenticado'}
              </span>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 ml-1 p-1 hover:bg-red-50 rounded-full transition-colors"
                title="Sair do painel"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="mt-8 bg-white rounded-[24px] p-5 sm:p-6 border border-[#A8C3A0]/35 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Campo de Busca */}
            <div className="md:col-span-5 relative">
              <label className="block text-xs font-semibold text-[#5E6E64] mb-1">
                Buscar por Nome, Telefone ou E-mail
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#5E6E64] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ex.: Mariana ou (11) 9..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/40 text-sm text-[#1D2B25] placeholder:text-[#5E6E64]/50 focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                />
              </div>
            </div>

            {/* Filtro de Status */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-[#5E6E64] mb-1">
                Filtrar por Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/40 text-sm text-[#1D2B25] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
              >
                <option value="todos">Todos os Status</option>
                <option value="Pendente">Pendente</option>
                <option value="Confirmado">Confirmado</option>
                <option value="Concluído">Concluído</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>

            {/* Filtro de Loja */}
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-[#5E6E64] mb-1">
                Filtrar por Loja (7 Unidades)
              </label>
              <select
                value={lojaFilter}
                onChange={(e) => setLojaFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/40 text-sm text-[#1D2B25] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
              >
                <option value="todas">Todas as 7 Lojas</option>
                {LOJAS.map((l) => (
                  <option key={l.id} value={l.nome}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contador de Resultados */}
          <div className="flex items-center justify-between pt-2 border-t border-[#EAF2E8] text-xs text-[#5E6E64]">
            <div>
              <span>Exibindo </span>
              <strong className="text-[#1D2B25]">{filteredPedidos.length}</strong>
              <span> de </span>
              <strong className="text-[#1D2B25]">{pedidos.length}</strong>
              <span> solicitações</span>
            </div>

            {(searchTerm || statusFilter !== 'todos' || lojaFilter !== 'todas') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('todos')
                  setLojaFilter('todas')
                }}
                className="text-xs text-[#2F6B4F] hover:underline font-semibold"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* LISTA DE PEDIDOS EM CARDS (Não tabela, conforme requisito) */}
        <div className="mt-8">
          {loading && pedidos.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#2F6B4F]/20 border-t-[#2F6B4F] animate-spin mx-auto mb-4" />
              <p className="text-sm text-[#5E6E64]">Carregando solicitações da rede...</p>
            </div>
          ) : filteredPedidos.length === 0 ? (
            // ESTADO VAZIO AMIGÁVEL (Conforme Requisito do Usuário)
            <div className="bg-white rounded-[24px] p-12 text-center border border-[#A8C3A0]/35 shadow-sm max-w-xl mx-auto my-12 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-[#EAF2E8] flex items-center justify-center text-[#2F6B4F] mx-auto mb-5 shadow-inner">
                <Inbox className="w-10 h-10" />
              </div>
              <h2 className="font-serif italic font-semibold text-2xl text-[#1D2B25]">
                Nenhuma solicitação encontrada
              </h2>
              <p className="mt-3 text-sm text-[#5E6E64] max-w-sm mx-auto leading-relaxed">
                Nenhuma solicitação ainda com os filtros selecionados. Compartilhe o link de
                agendamento ou cadastre uma nova visita!
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/agendar"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold transition-all shadow-sm"
                >
                  <PlusCircle className="w-4 h-4 text-[#A8C3A0]" />
                  <span>Criar Agendamento</span>
                </Link>
                {(statusFilter !== 'todos' || lojaFilter !== 'todas' || searchTerm) && (
                  <button
                    onClick={() => {
                      setStatusFilter('todos')
                      setLojaFilter('todas')
                      setSearchTerm('')
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-full bg-[#EAF2E8] hover:bg-[#A8C3A0]/30 text-[#2F6B4F] text-xs font-semibold transition-colors"
                  >
                    Resetar Filtros
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPedidos.map((pedido) => {
                const waLink = buildWhatsAppLink({
                  telefone: pedido.telefone,
                  cliente_nome: pedido.cliente_nome,
                  servico: pedido.servico,
                  loja: pedido.loja,
                  data_preferida: pedido.data_preferida,
                  horario_preferido: pedido.horario_preferido,
                })

                return (
                  <div
                    key={pedido.id}
                    className="bg-white rounded-[24px] p-6 border border-[#A8C3A0]/35 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-lg hover:border-[#2F6B4F]/40 transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Topo do Card: Nome + Status Badge */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-serif font-bold text-lg text-[#1D2B25] group-hover:text-[#2F6B4F] transition-colors leading-snug">
                            {pedido.cliente_nome}
                          </h3>
                          <span className="text-[11px] text-[#5E6E64]">
                            Criado em {formatDate(pedido.created)}
                          </span>
                        </div>
                        <div>{renderStatusBadge(pedido.status)}</div>
                      </div>

                      {/* Informações de Contato com Link WhatsApp */}
                      <div className="p-3 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/30 mb-4 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[#5E6E64] flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-[#2F6B4F]" />
                            <strong className="text-[#1D2B25] font-mono">{pedido.telefone}</strong>
                          </span>
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-[11px] font-semibold transition-colors shadow-sm"
                            title="Conversar com o cliente no WhatsApp"
                          >
                            <span>WhatsApp</span>
                            <ExternalLink className="w-3 h-3 text-[#A8C3A0]" />
                          </a>
                        </div>

                        <div className="flex items-center gap-1.5 text-[#5E6E64] truncate">
                          <Mail className="w-3.5 h-3.5 text-[#2F6B4F] shrink-0" />
                          <span className="truncate">{pedido.email}</span>
                        </div>
                      </div>

                      {/* Detalhes do Serviço & Loja */}
                      <div className="space-y-2 text-xs text-[#1D2B25]">
                        <div className="flex items-start gap-2">
                          <span className="text-[#5E6E64] shrink-0 font-medium w-16">Serviço:</span>
                          <span className="font-semibold text-[#2F6B4F]">{pedido.servico}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-[#5E6E64] shrink-0 font-medium w-16">Loja:</span>
                          <span className="font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#2F6B4F]" />
                            {pedido.loja}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-[#5E6E64] shrink-0 font-medium w-16">
                            Data/Hora:
                          </span>
                          <span className="font-medium flex items-center gap-1 text-[#1D2B25]">
                            <Calendar className="w-3 h-3 text-[#2F6B4F]" />
                            {formatVisitDate(pedido.data_preferida)} às {pedido.horario_preferido}
                          </span>
                        </div>
                      </div>

                      {/* Mensagem Opcional */}
                      {pedido.mensagem && (
                        <div className="mt-3 p-2.5 rounded-xl bg-[#EAF2E8]/50 border border-[#A8C3A0]/30 text-xs">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#2F6B4F] mb-0.5">
                            <MessageSquare className="w-3 h-3" />
                            <span>Observações do Cliente:</span>
                          </div>
                          <p className="text-[#1D2B25] italic line-clamp-3">"{pedido.mensagem}"</p>
                        </div>
                      )}
                    </div>

                    {/* Rodapé do Card: Alteração de Status In-line via Dropdown */}
                    <div className="mt-5 pt-4 border-t border-[#EAF2E8]">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E6E64] mb-1.5">
                        Alterar Status (Salva automaticamente)
                      </label>
                      <select
                        value={pedido.status}
                        disabled={updatingId === pedido.id}
                        onChange={(e) =>
                          handleStatusChange(pedido.id, e.target.value as Solicitacao['status'])
                        }
                        className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all border focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] ${
                          updatingId === pedido.id ? 'opacity-60 cursor-wait' : ''
                        } ${
                          pedido.status === 'Pendente'
                            ? 'bg-[#F5C84C]/15 text-[#9C7500] border-[#F5C84C]/50'
                            : pedido.status === 'Confirmado'
                              ? 'bg-[#3E9B6C]/15 text-[#256B48] border-[#3E9B6C]/40'
                              : pedido.status === 'Concluído'
                                ? 'bg-[#6C8EBF]/15 text-[#2C4E7E] border-[#6C8EBF]/40'
                                : 'bg-gray-100 text-gray-700 border-gray-300'
                        }`}
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="Confirmado">Confirmado</option>
                        <option value="Concluído">Concluído</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
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
