import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Calendar,
  MessageSquare,
  ClockAlert,
  Plus,
  Loader2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
} from 'lucide-react'
import { buscarClientePorId, atualizarCliente, excluirCliente } from '@/services/clientes'
import { listarAtendimentosPorCliente, criarAtendimento } from '@/services/atendimentos'
import {
  listarFollowUpsPorCliente,
  criarFollowUp,
  marcarFollowUpConcluido,
  gerarLinkWhatsApp,
} from '@/services/followUps'
import type {
  Cliente,
  Atendimento,
  FollowUp,
  EtapaFunil,
  CanalAtendimento,
  StatusAtendimento,
  CanalFollowUp,
} from '@/types/crm'
import { LOJAS } from '@/data/boutiqueData'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const ETAPAS_FUNIL: EtapaFunil[] = [
  'Lead',
  'Em atendimento',
  'Proposta enviada',
  'Cliente fechado',
  'Perdido',
]

export default function FichaClientePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])

  // Modal Novo Atendimento
  const [modalAtendimento, setModalAtendimento] = useState(false)
  const [salvandoAtendimento, setSalvandoAtendimento] = useState(false)
  const [novoAtendimento, setNovoAtendimento] = useState({
    responsavel: 'Consultor Boutique',
    canal: 'Presencial' as CanalAtendimento,
    data_atendimento: new Date().toISOString().split('T')[0],
    horario: '10:00',
    interesse: '',
    resumo: '',
    status: 'Em negociação' as StatusAtendimento,
    valor_estimado: 0,
  })

  // Modal Novo Follow-up
  const [modalFollowUp, setModalFollowUp] = useState(false)
  const [salvandoFollowUp, setSalvandoFollowUp] = useState(false)
  const [novoFollowUp, setNovoFollowUp] = useState({
    responsavel: 'Consultor Boutique',
    canal: 'WhatsApp' as CanalFollowUp,
    data_prevista: new Date().toISOString().split('T')[0],
    horario_previsto: '15:00',
    assunto: '',
    mensagem_sugerida: '',
  })

  // Edição rápida de notas e etapa
  const [editandoNotas, setEditandoNotas] = useState(false)
  const [notasTemp, setNotasTemp] = useState('')

  const carregarFicha = async () => {
    if (!id) return
    setLoading(true)
    try {
      const cli = await buscarClientePorId(id)
      setCliente(cli)
      setNotasTemp(cli.notas_internas || '')

      const [aList, fList] = await Promise.all([
        listarAtendimentosPorCliente(id),
        listarFollowUpsPorCliente(id),
      ])
      setAtendimentos(aList)
      setFollowUps(fList)
    } catch (err) {
      console.error('Erro ao buscar cliente:', err)
      toast({
        title: 'Cliente não encontrado',
        description: 'O cliente solicitado não pôde ser carregado.',
        variant: 'destructive',
      })
      navigate('/clientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarFicha()
  }, [id])

  // Troca de etapa do funil imediata
  const handleMudarEtapa = async (novaEtapa: EtapaFunil) => {
    if (!cliente) return
    try {
      const atualizado = await atualizarCliente(cliente.id, { etapa_funil: novaEtapa })
      setCliente(atualizado)
      toast({
        title: 'Etapa atualizada',
        description: `Cliente movido para "${novaEtapa}".`,
      })
    } catch (err) {
      console.error('Falha ao atualizar etapa:', err)
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar a etapa.',
        variant: 'destructive',
      })
    }
  }

  // Salvar notas
  const handleSalvarNotas = async () => {
    if (!cliente) return
    try {
      const atualizado = await atualizarCliente(cliente.id, { notas_internas: notasTemp })
      setCliente(atualizado)
      setEditandoNotas(false)
      toast({
        title: 'Notas salvas',
        description: 'Observações do cliente atualizadas.',
      })
    } catch (err) {
      console.error('Falha ao salvar notas:', err)
    }
  }

  // Criar Atendimento para o cliente
  const handleCriarAtendimento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cliente) return

    setSalvandoAtendimento(true)
    try {
      const at = await criarAtendimento({
        cliente: cliente.id,
        cliente_nome: cliente.nome,
        loja: cliente.loja_origem,
        responsavel: novoAtendimento.responsavel,
        canal: novoAtendimento.canal,
        data_atendimento: novoAtendimento.data_atendimento,
        horario: novoAtendimento.horario,
        interesse:
          novoAtendimento.interesse || cliente.interesse_principal || 'Revestimentos gerais',
        resumo: novoAtendimento.resumo,
        status: novoAtendimento.status,
        valor_estimado: novoAtendimento.valor_estimado
          ? Number(novoAtendimento.valor_estimado)
          : undefined,
      })

      setAtendimentos((prev) => [at, ...prev])
      setModalAtendimento(false)
      setNovoAtendimento({
        responsavel: 'Consultor Boutique',
        canal: 'Presencial',
        data_atendimento: new Date().toISOString().split('T')[0],
        horario: '10:00',
        interesse: '',
        resumo: '',
        status: 'Em negociação',
        valor_estimado: 0,
      })

      toast({
        title: 'Atendimento registrado',
        description: 'O atendimento foi adicionado ao histórico.',
      })
    } catch (err) {
      console.error('Erro ao criar atendimento:', err)
      toast({
        title: 'Falha ao registrar',
        description: 'Verifique os dados preenchidos.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoAtendimento(false)
    }
  }

  // Agendar Follow-up para o cliente
  const handleCriarFollowUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cliente) return

    setSalvandoFollowUp(true)
    try {
      const fu = await criarFollowUp({
        cliente: cliente.id,
        cliente_nome: cliente.nome,
        cliente_telefone: cliente.telefone,
        loja: cliente.loja_origem,
        responsavel: novoFollowUp.responsavel,
        canal: novoFollowUp.canal,
        data_prevista: novoFollowUp.data_prevista,
        horario_previsto: novoFollowUp.horario_previsto,
        assunto: novoFollowUp.assunto,
        mensagem_sugerida: novoFollowUp.mensagem_sugerida,
        status: 'Pendente',
      })

      setFollowUps((prev) => [fu, ...prev])
      setModalFollowUp(false)
      setNovoFollowUp({
        responsavel: 'Consultor Boutique',
        canal: 'WhatsApp',
        data_prevista: new Date().toISOString().split('T')[0],
        horario_previsto: '15:00',
        assunto: '',
        mensagem_sugerida: '',
      })

      toast({
        title: 'Follow-up agendado',
        description: `Agendado retorno para ${fu.data_prevista}.`,
      })
    } catch (err) {
      console.error('Erro ao agendar follow-up:', err)
      toast({
        title: 'Falha ao agendar',
        description: 'Verifique os dados.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoFollowUp(false)
    }
  }

  const handleConcluirFollowUp = async (fuId: string) => {
    try {
      await marcarFollowUpConcluido(fuId, 'Concluído diretamente na ficha do cliente')
      setFollowUps((prev) =>
        prev.map((f) =>
          f.id === fuId
            ? { ...f, status: 'Concluído', data_conclusao: new Date().toISOString().split('T')[0] }
            : f,
        ),
      )
      toast({
        title: 'Follow-up concluído',
        description: 'Histórico de contato atualizado.',
      })
    } catch (err) {
      console.error(err)
    }
  }

  if (loading || !cliente) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#2F6B4F]" />
        <span className="text-xs font-medium text-[#5E6E64]">Carregando ficha do cliente...</span>
      </div>
    )
  }

  const waLink = gerarLinkWhatsApp(
    cliente.telefone,
    `Olá ${cliente.nome}, aqui é da Boutique de Revestimentos (${cliente.loja_origem}). Tudo bem?`,
  )

  return (
    <div className="space-y-6">
      {/* Voltar + Topo */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/clientes"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5E6E64] hover:text-[#2F6B4F] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Clientes</span>
        </Link>
      </div>

      {/* Ficha Principal Header */}
      <div className="bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-[#EAF2E8]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif italic font-semibold text-2xl sm:text-3xl text-[#1D2B25]">
                {cliente.nome}
              </h1>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  cliente.etapa_funil === 'Cliente fechado'
                    ? 'bg-emerald-100 text-emerald-800'
                    : cliente.etapa_funil === 'Proposta enviada'
                      ? 'bg-indigo-100 text-indigo-800'
                      : cliente.etapa_funil === 'Em atendimento'
                        ? 'bg-amber-100 text-amber-800'
                        : cliente.etapa_funil === 'Perdido'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                }`}
              >
                {cliente.etapa_funil}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#5E6E64] flex items-center gap-2 mt-1">
              <Building2 className="w-3.5 h-3.5 text-[#2F6B4F]" />
              <span>
                Loja de Origem: <strong>{cliente.loja_origem}</strong>
              </span>
              {cliente.cidade && <span>• {cliente.cidade}</span>}
            </p>
          </div>

          {/* Botões de Ação na Ficha */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>

            {/* Dialog Novo Atendimento */}
            <Dialog open={modalAtendimento} onOpenChange={setModalAtendimento}>
              <DialogTrigger asChild>
                <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold shadow-sm transition-all">
                  <Plus className="w-3.5 h-3.5 text-[#A8C3A0]" />
                  <span>Novo Atendimento</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-serif italic text-xl text-[#1D2B25]">
                    Registrar Atendimento — {cliente.nome}
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleCriarAtendimento} className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                        Canal
                      </label>
                      <select
                        value={novoAtendimento.canal}
                        onChange={(e) =>
                          setNovoAtendimento({
                            ...novoAtendimento,
                            canal: e.target.value as CanalAtendimento,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                      >
                        <option value="Presencial">Presencial (Loja)</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Telefone">Telefone</option>
                        <option value="Reunião Online">Reunião Online</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                        Status
                      </label>
                      <select
                        value={novoAtendimento.status}
                        onChange={(e) =>
                          setNovoAtendimento({
                            ...novoAtendimento,
                            status: e.target.value as StatusAtendimento,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                      >
                        <option value="Aberto">Aberto</option>
                        <option value="Em negociação">Em negociação</option>
                        <option value="Fechado">Fechado</option>
                        <option value="Perdido">Perdido</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                        Data
                      </label>
                      <input
                        type="date"
                        required
                        value={novoAtendimento.data_atendimento}
                        onChange={(e) =>
                          setNovoAtendimento({
                            ...novoAtendimento,
                            data_atendimento: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                        Horário
                      </label>
                      <input
                        type="text"
                        value={novoAtendimento.horario}
                        onChange={(e) =>
                          setNovoAtendimento({
                            ...novoAtendimento,
                            horario: e.target.value,
                          })
                        }
                        placeholder="Ex.: 14:30"
                        className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Interesse Especificado
                    </label>
                    <input
                      type="text"
                      value={novoAtendimento.interesse}
                      onChange={(e) =>
                        setNovoAtendimento({ ...novoAtendimento, interesse: e.target.value })
                      }
                      placeholder="Ex.: Porcelanato 120x120, louças e metais dourados"
                      className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Resumo da Conversa *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={novoAtendimento.resumo}
                      onChange={(e) =>
                        setNovoAtendimento({ ...novoAtendimento, resumo: e.target.value })
                      }
                      placeholder="O que foi alinhado? Amostras entregues, dúvidas levantadas..."
                      className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                        Responsável
                      </label>
                      <input
                        type="text"
                        value={novoAtendimento.responsavel}
                        onChange={(e) =>
                          setNovoAtendimento({
                            ...novoAtendimento,
                            responsavel: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                        Valor Estimado (R$)
                      </label>
                      <input
                        type="number"
                        value={novoAtendimento.valor_estimado || ''}
                        onChange={(e) =>
                          setNovoAtendimento({
                            ...novoAtendimento,
                            valor_estimado: Number(e.target.value),
                          })
                        }
                        placeholder="Ex.: 45000"
                        className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setModalAtendimento(false)}
                      className="px-4 py-1.5 rounded-full border text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={salvandoAtendimento}
                      className="px-5 py-1.5 rounded-full bg-[#2F6B4F] text-white text-xs font-semibold"
                    >
                      {salvandoAtendimento ? 'Salvando...' : 'Salvar Atendimento'}
                    </button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Dialog Agendar Follow-up */}
            <Dialog open={modalFollowUp} onOpenChange={setModalFollowUp}>
              <DialogTrigger asChild>
                <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EAF2E8] hover:bg-[#d8e8d5] text-[#2F6B4F] text-xs font-semibold transition-all">
                  <ClockAlert className="w-3.5 h-3.5" />
                  <span>Agendar Follow-up</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-serif italic text-xl text-[#1D2B25]">
                    Agendar Retorno para {cliente.nome}
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleCriarFollowUp} className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                        Canal
                      </label>
                      <select
                        value={novoFollowUp.canal}
                        onChange={(e) =>
                          setNovoFollowUp({
                            ...novoFollowUp,
                            canal: e.target.value as CanalFollowUp,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                      >
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Telefone">Telefone</option>
                        <option value="E-mail">E-mail</option>
                        <option value="Presencial">Presencial</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                        Data Prevista *
                      </label>
                      <input
                        type="date"
                        required
                        value={novoFollowUp.data_prevista}
                        onChange={(e) =>
                          setNovoFollowUp({ ...novoFollowUp, data_prevista: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Assunto do Follow-up *
                    </label>
                    <input
                      type="text"
                      required
                      value={novoFollowUp.assunto}
                      onChange={(e) =>
                        setNovoFollowUp({ ...novoFollowUp, assunto: e.target.value })
                      }
                      placeholder="Ex.: Cobrar retorno sobre proposta de Calacatta..."
                      className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Mensagem Sugerida para WhatsApp
                    </label>
                    <textarea
                      rows={2}
                      value={novoFollowUp.mensagem_sugerida}
                      onChange={(e) =>
                        setNovoFollowUp({ ...novoFollowUp, mensagem_sugerida: e.target.value })
                      }
                      placeholder="Texto pré-definido que abrirá no WhatsApp..."
                      className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setModalFollowUp(false)}
                      className="px-4 py-1.5 rounded-full border text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={salvandoFollowUp}
                      className="px-5 py-1.5 rounded-full bg-[#2F6B4F] text-white text-xs font-semibold"
                    >
                      {salvandoFollowUp ? 'Salvando...' : 'Agendar Follow-up'}
                    </button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Funil Visual Rápido: Botões de mudança de etapa */}
        <div className="space-y-2">
          <p className="text-[11px] uppercase font-bold tracking-wider text-[#5E6E64]">
            Progresso no Funil de Vendas:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {ETAPAS_FUNIL.map((et) => {
              const ativo = cliente.etapa_funil === et
              return (
                <button
                  key={et}
                  type="button"
                  onClick={() => handleMudarEtapa(et)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all text-center border ${
                    ativo
                      ? 'bg-[#2F6B4F] text-white border-[#2F6B4F] shadow-sm'
                      : 'bg-[#F7FAF5] text-[#5E6E64] border-[#A8C3A0]/30 hover:bg-[#EAF2E8] hover:text-[#1D2B25]'
                  }`}
                >
                  {et}
                </button>
              )
            })}
          </div>
        </div>

        {/* Informações de Contato e Obra */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/30 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64]">
              Dados de Contato
            </span>
            <p className="font-semibold text-[#1D2B25] flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#2F6B4F]" />
              <span>{cliente.telefone}</span>
            </p>
            {cliente.email && (
              <p className="text-[#5E6E64] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#2F6B4F]" />
                <span>{cliente.email}</span>
              </p>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/30 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64]">
              Arquiteto / Parceria
            </span>
            <p className="font-semibold text-[#1D2B25] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#2F6B4F]" />
              <span>{cliente.arquiteto_parceiro || 'Não informado / Direto'}</span>
            </p>
            <p className="text-[#5E6E64]">Comissionamento e especificação</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/30 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64]">
              Interesse Principal
            </span>
            <p className="font-semibold text-[#1D2B25] line-clamp-2">
              {cliente.interesse_principal || 'Sem especificação registrada'}
            </p>
          </div>
        </div>

        {/* Bloco de Notas Internas com Edição */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#1D2B25] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#2F6B4F]" />
              <span>Notas e Observações da Obra</span>
            </span>
            {!editandoNotas ? (
              <button
                type="button"
                onClick={() => setEditandoNotas(true)}
                className="text-xs font-semibold text-[#2F6B4F] hover:underline flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>Editar notas</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditandoNotas(false)}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarNotas}
                  className="text-xs font-semibold text-[#2F6B4F] bg-[#EAF2E8] px-2.5 py-1 rounded-full hover:bg-[#d8e8d5]"
                >
                  Salvar
                </button>
              </div>
            )}
          </div>

          {editandoNotas ? (
            <textarea
              rows={3}
              value={notasTemp}
              onChange={(e) => setNotasTemp(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
            />
          ) : (
            <div className="p-3 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/30 text-xs text-[#1D2B25] leading-relaxed">
              {cliente.notas_internas || 'Nenhuma observação interna cadastrada.'}
            </div>
          )}
        </div>
      </div>

      {/* Grid: Histórico de Atendimentos & Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Atendimentos do Cliente (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAF2E8]">
            <h2 className="font-serif italic font-semibold text-lg text-[#1D2B25]">
              Histórico de Atendimentos ({atendimentos.length})
            </h2>
            <button
              onClick={() => setModalAtendimento(true)}
              className="text-xs font-semibold text-[#2F6B4F] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Registrar</span>
            </button>
          </div>

          {atendimentos.length === 0 ? (
            <p className="text-xs text-[#5E6E64] py-8 text-center">
              Nenhum atendimento registrado para este cliente ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {atendimentos.map((at) => (
                <div
                  key={at.id}
                  className="p-3.5 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/30 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-sm text-[#1D2B25]">{at.canal}</span>
                      <p className="text-[11px] text-[#5E6E64]">
                        {at.data_atendimento} {at.horario ? `às ${at.horario}` : ''} • Resp:{' '}
                        {at.responsavel}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        at.status === 'Fechado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : at.status === 'Em negociação'
                            ? 'bg-amber-100 text-amber-800'
                            : at.status === 'Perdido'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {at.status}
                    </span>
                  </div>

                  <p className="text-[#1D2B25] bg-white p-2.5 rounded-xl border border-[#A8C3A0]/20">
                    <strong className="text-[#2F6B4F]">Resumo: </strong>
                    {at.resumo}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-[#5E6E64]">
                    <span>Interesse: {at.interesse}</span>
                    {at.valor_estimado ? (
                      <span className="font-semibold text-[#1D2B25]">
                        R$ {at.valor_estimado.toLocaleString('pt-BR')}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Follow-ups do Cliente (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAF2E8]">
            <h2 className="font-serif italic font-semibold text-lg text-[#1D2B25]">
              Follow-ups & Retornos ({followUps.length})
            </h2>
            <button
              onClick={() => setModalFollowUp(true)}
              className="text-xs font-semibold text-[#2F6B4F] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Agendar</span>
            </button>
          </div>

          {followUps.length === 0 ? (
            <p className="text-xs text-[#5E6E64] py-8 text-center">
              Nenhum follow-up cadastrado para este cliente.
            </p>
          ) : (
            <div className="space-y-3">
              {followUps.map((fu) => {
                const fuWa = gerarLinkWhatsApp(cliente.telefone, fu.mensagem_sugerida)
                const isPendente = fu.status === 'Pendente'
                return (
                  <div
                    key={fu.id}
                    className="p-3 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/30 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-[#1D2B25]">{fu.canal}</span>
                          <span className="font-mono text-[10px] text-[#5E6E64]">
                            {fu.data_prevista}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#1D2B25] font-medium mt-0.5">
                          {fu.assunto}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          fu.status === 'Concluído'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {fu.status}
                      </span>
                    </div>

                    {isPendente && (
                      <div className="flex items-center justify-between pt-1 border-t border-[#A8C3A0]/20">
                        <a
                          href={fuWa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-medium"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleConcluirFollowUp(fu.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#A8C3A0]/40 text-[#2F6B4F] text-[10px] font-semibold hover:bg-[#EAF2E8]"
                        >
                          <CheckCircle2 className="w-3 h-3 text-[#2F6B4F]" />
                          <span>Concluir</span>
                        </button>
                      </div>
                    )}
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
