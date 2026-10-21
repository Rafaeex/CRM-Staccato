import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ClockAlert,
  Search,
  Filter,
  CheckCircle2,
  Building2,
  MessageSquare,
  Plus,
  Loader2,
  ExternalLink,
  Sparkles,
  Bot,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import {
  listarFollowUps,
  criarFollowUp,
  marcarFollowUpConcluido,
  excluirFollowUp,
  gerarLinkWhatsApp,
} from '@/services/followUps'
import { listarClientes } from '@/services/clientes'
import { gerarFollowUpComIA } from '@/services/iaFollowUp'
import { getUsuarioAtualInfo } from '@/services/permissoes'
import type { FollowUp, FollowUpInput, Cliente, CanalFollowUp, UrgenciaFollowUp } from '@/types/crm'
import { LOJAS } from '@/data/boutiqueData'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const CANAIS: CanalFollowUp[] = ['WhatsApp', 'Telefone', 'E-mail', 'Presencial']

export default function FollowUpsPage() {
  const { toast } = useToast()
  const userInfo = getUsuarioAtualInfo()

  const [loading, setLoading] = useState(true)
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('Pendente')
  const [filtroLoja, setFiltroLoja] = useState<string>(
    userInfo.isAtendente && userInfo.loja ? userInfo.loja : 'todas',
  )
  const [filtroCanal, setFiltroCanal] = useState<string>('todas')
  const [filtroOrigem, setFiltroOrigem] = useState<string>('todas') // todas | ia | manual

  // Modal Novo Follow-up
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [gerandoIA, setGerandoIA] = useState(false)
  const [resumoIACompleto, setResumoIACompleto] = useState<string | null>(null)

  const hoje = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState<FollowUpInput>({
    cliente: '',
    cliente_nome: '',
    cliente_telefone: '',
    loja: userInfo.loja || LOJAS[0].nome,
    responsavel: userInfo.name,
    canal: 'WhatsApp',
    data_prevista: hoje,
    horario_previsto: '14:30',
    assunto: '',
    mensagem_sugerida: '',
    status: 'Pendente',
    gerado_por_ia: false,
    urgencia: 'Média',
    justificativa_ia: '',
  })

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [fList, cList] = await Promise.all([listarFollowUps(), listarClientes()])
      setFollowUps(fList)
      setClientes(cList)
    } catch (err) {
      console.error('Falha ao carregar follow-ups:', err)
      toast({
        title: 'Erro ao carregar follow-ups',
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

  const handleClienteChange = (clienteId: string) => {
    const sel = clientes.find((c) => c.id === clienteId)
    if (sel) {
      setForm((prev) => ({
        ...prev,
        cliente: sel.id,
        cliente_nome: sel.nome,
        cliente_telefone: sel.telefone,
        loja: sel.loja_origem || prev.loja,
      }))
    }
  }

  // Gerar recomendação automática de follow-up com o Agente Nativo Skip Cloud
  const handleGerarComIA = async () => {
    if (!form.cliente) {
      toast({
        title: 'Selecione um cliente',
        description: 'Escolha um cliente para analisar o histórico de atendimentos e reclamações.',
        variant: 'destructive',
      })
      return
    }

    setGerandoIA(true)
    try {
      const res = await gerarFollowUpComIA(form.cliente)
      if (res.sucesso && res.sugestao) {
        setResumoIACompleto(res.resposta_completa_ia)
        setForm((prev) => ({
          ...prev,
          assunto: res.sugestao.assunto,
          mensagem_sugerida: res.sugestao.mensagem_sugerida,
          urgencia: res.sugestao.urgencia,
          data_prevista: res.sugestao.data_prevista || prev.data_prevista,
          gerado_por_ia: true,
          justificativa_ia: res.sugestao.justificativa,
        }))
        toast({
          title: 'Sugestão criada pela IA',
          description: 'Histórico de atendimento analisado com sucesso!',
        })
      }
    } catch (err) {
      console.error('Erro na IA:', err)
      toast({
        title: 'Aviso da IA',
        description: 'Preencha manualmente o follow-up.',
        variant: 'destructive',
      })
    } finally {
      setGerandoIA(false)
    }
  }

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.cliente || !form.assunto || !form.data_prevista) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione o cliente, defina a data prevista e o assunto.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const criado = await criarFollowUp(form)
      setFollowUps((prev) => [criado, ...prev])
      setModalAberto(false)
      setResumoIACompleto(null)
      toast({
        title: 'Follow-up agendado',
        description: `Contato para ${criado.cliente_nome} cadastrado com sucesso.`,
      })
    } catch (err) {
      console.error('Falha ao salvar follow-up:', err)
      toast({
        title: 'Erro',
        description: 'Não foi possível agendar o follow-up.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleMarcarConcluido = async (id: string, clienteNome: string) => {
    try {
      const atualizado = await marcarFollowUpConcluido(id, 'Concluído na lista de follow-ups')
      setFollowUps((prev) => prev.map((f) => (f.id === id ? atualizado : f)))
      toast({
        title: 'Follow-up concluído!',
        description: `Retorno com ${clienteNome} registrado.`,
      })
    } catch (err) {
      console.error('Falha ao marcar como concluído:', err)
      toast({
        title: 'Erro ao concluir',
        description: 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja excluir este follow-up?')) return
    const sucesso = await excluirFollowUp(id)
    if (sucesso) {
      setFollowUps((prev) => prev.filter((f) => f.id !== id))
      toast({
        title: 'Follow-up excluído',
      })
    }
  }

  // Filtragem e ordenação por urgência
  const followUpsFiltrados = followUps
    .filter((fu) => {
      // Regra de papel: atendente vê apenas da sua loja
      if (userInfo.isAtendente && userInfo.loja) {
        if (!fu.loja.toLowerCase().includes(userInfo.loja.toLowerCase())) {
          return false
        }
      } else if (filtroLoja !== 'todas') {
        if (!fu.loja.toLowerCase().includes(filtroLoja.toLowerCase())) {
          return false
        }
      }

      if (filtroStatus !== 'todas' && fu.status !== filtroStatus) return false
      if (filtroCanal !== 'todas' && fu.canal !== filtroCanal) return false
      if (filtroOrigem === 'ia' && !fu.gerado_por_ia) return false
      if (filtroOrigem === 'manual' && fu.gerado_por_ia) return false

      if (busca) {
        const b = busca.toLowerCase()
        const matchNome = fu.cliente_nome.toLowerCase().includes(b)
        const matchAssunto = fu.assunto.toLowerCase().includes(b)
        const matchResp = fu.responsavel.toLowerCase().includes(b)
        const matchTel = fu.cliente_telefone.includes(b)
        if (!matchNome && !matchAssunto && !matchResp && !matchTel) return false
      }

      return true
    })
    .sort((a, b) => {
      if (a.status === 'Pendente' && b.status !== 'Pendente') return -1
      if (a.status !== 'Pendente' && b.status === 'Pendente') return 1
      return a.data_prevista.localeCompare(b.data_prevista)
    })

  return (
    <div className="space-y-6">
      {/* Topo Limpo e Arejado */}
      <div className="bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2F6B4F] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Follow-ups & IA Nativa do Atendimento
          </span>
          <h1 className="font-semibold text-2xl sm:text-3xl text-[#1D2B25] tracking-tight mt-1">
            Gestão de Retornos & Prazos
          </h1>
          <p className="text-xs sm:text-sm text-[#5E6E64] mt-0.5">
            Geração com 1 clique usando o histórico puro de atendimento (amostras, notas e
            ocorrências).
          </p>
        </div>

        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogTrigger asChild>
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]">
              <Plus className="w-4 h-4 text-[#A8C3A0]" />
              <span>Agendar Follow-up</span>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-semibold text-xl text-[#1D2B25]">
                Novo Follow-up de Atendimento
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCriar} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Cliente Vinculado *
                </label>
                <select
                  required
                  value={form.cliente}
                  onChange={(e) => handleClienteChange(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                >
                  <option value="">Selecione o cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.loja_origem}) — {c.telefone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botão de Análise do Agente de IA */}
              {form.cliente && (
                <div className="p-3.5 rounded-2xl bg-[#EAF2E8]/60 border border-[#A8C3A0]/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#2F6B4F] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Agente de IA do CRM (Skip Cloud)
                    </span>
                    <button
                      type="button"
                      onClick={handleGerarComIA}
                      disabled={gerandoIA}
                      className="px-3 py-1 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-[11px] font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                    >
                      {gerandoIA ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Analisando histórico...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3" />
                          <span>Gerar Sugestão com IA</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#5E6E64] leading-relaxed">
                    Lê os atendimentos, ocorrências e reclamações passadas e formula a mensagem
                    ideal com urgência estimada.
                  </p>

                  {form.gerado_por_ia && (
                    <div className="pt-1.5 border-t border-[#A8C3A0]/30 flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2F6B4F] text-white flex items-center gap-1">
                        <Bot className="w-3 h-3" />
                        <span>Sugestão da IA carregada</span>
                      </span>
                      <span className="text-[10px] text-[#2F6B4F] font-medium">
                        Urgência: {form.urgencia || 'Média'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Canal de Retorno
                  </label>
                  <select
                    value={form.canal}
                    onChange={(e) => setForm({ ...form, canal: e.target.value as CanalFollowUp })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                  >
                    {CANAIS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Loja da Rede
                  </label>
                  <select
                    value={form.loja}
                    disabled={userInfo.isAtendente && Boolean(userInfo.loja)}
                    onChange={(e) => setForm({ ...form, loja: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] disabled:opacity-75"
                  >
                    {LOJAS.map((l) => (
                      <option key={l.id} value={l.nome}>
                        {l.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Data Prevista *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.data_prevista}
                    onChange={(e) => setForm({ ...form, data_prevista: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Urgência
                  </label>
                  <select
                    value={form.urgencia || 'Média'}
                    onChange={(e) =>
                      setForm({ ...form, urgencia: e.target.value as UrgenciaFollowUp })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Assunto da Pendência *
                </label>
                <input
                  type="text"
                  required
                  value={form.assunto}
                  onChange={(e) => setForm({ ...form, assunto: e.target.value })}
                  placeholder="Ex.: Confirmar recebimento do laudo da pedra Hijau..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Mensagem Pronta para WhatsApp (Editável)
                </label>
                <textarea
                  rows={3}
                  value={form.mensagem_sugerida}
                  onChange={(e) => setForm({ ...form, mensagem_sugerida: e.target.value })}
                  placeholder="Mensagem cordial que já abre escrita ao clicar no WhatsApp..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAF2E8]">
                <button
                  type="button"
                  onClick={() => {
                    setModalAberto(false)
                    setResumoIACompleto(null)
                  }}
                  className="px-4 py-2 rounded-full border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Agendar Follow-up'}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barra de Filtros Arejada */}
      <div className="bg-white rounded-2xl p-4 border border-[#A8C3A0]/30 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#5E6E64] absolute left-3.5 top-3" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente, assunto, consultor ou telefone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/40 text-xs sm:text-sm text-[#1D2B25] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-[#F7FAF5] border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#2F6B4F]" />
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="bg-transparent text-xs text-[#1D2B25] focus:outline-none cursor-pointer"
            >
              <option value="todas">Todos os Status</option>
              <option value="Pendente">Pendentes</option>
              <option value="Concluído">Concluídos</option>
              <option value="Cancelado">Cancelados</option>
            </select>
          </div>

          {userInfo.isGestor && (
            <div className="flex items-center gap-1.5 bg-[#F7FAF5] border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs">
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
          )}

          <div className="flex items-center gap-1.5 bg-[#F7FAF5] border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#2F6B4F]" />
            <select
              value={filtroOrigem}
              onChange={(e) => setFiltroOrigem(e.target.value)}
              className="bg-transparent text-xs text-[#1D2B25] focus:outline-none cursor-pointer"
            >
              <option value="todas">Todas as Origens</option>
              <option value="ia">Gerados por IA</option>
              <option value="manual">Manuais</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Follow-ups */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#2F6B4F]" />
          <span className="text-xs font-medium text-[#5E6E64]">
            Carregando pendências de follow-up...
          </span>
        </div>
      ) : followUpsFiltrados.length === 0 ? (
        <div className="bg-white rounded-[24px] p-12 text-center border border-[#A8C3A0]/30 shadow-sm space-y-3">
          <CheckCircle2 className="w-10 h-10 text-[#2F6B4F] mx-auto opacity-70" />
          <h3 className="font-semibold text-base sm:text-lg text-[#1D2B25]">
            Nenhum follow-up encontrado
          </h3>
          <p className="text-xs text-[#5E6E64]">Não há pendências com os filtros selecionados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {followUpsFiltrados.map((fu) => {
            const waLink = gerarLinkWhatsApp(fu.cliente_telefone, fu.mensagem_sugerida)
            const isVencido = fu.status === 'Pendente' && fu.data_prevista < hoje
            const isHoje = fu.status === 'Pendente' && fu.data_prevista === hoje

            return (
              <div
                key={fu.id}
                className={`bg-white rounded-2xl p-5 border shadow-sm transition-all space-y-3 ${
                  isVencido
                    ? 'border-rose-300 bg-rose-50/20'
                    : isHoje
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-[#A8C3A0]/30'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base sm:text-lg text-[#1D2B25]">
                        {fu.cliente_nome}
                      </h3>{' '}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F7FAF5] border border-[#A8C3A0]/40 text-[#2F6B4F] font-semibold">
                        {fu.canal}
                      </span>
                      {/* Tag de IA vs Manual */}
                      {fu.gerado_por_ia ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EAF2E8] text-[#2F6B4F] border border-[#A8C3A0]/50 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Gerado por IA</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Manual
                        </span>
                      )}
                      {isVencido && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          Vencido
                        </span>
                      )}
                      {isHoje && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Vence Hoje
                        </span>
                      )}
                      {fu.status === 'Concluído' && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Concluído
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#5E6E64] flex items-center gap-2 mt-1">
                      <span className="font-medium text-[#1D2B25]">{fu.loja}</span>
                      <span>•</span>
                      <span>
                        Previsto: <strong>{fu.data_prevista}</strong>{' '}
                        {fu.horario_previsto ? `às ${fu.horario_previsto}` : ''}
                      </span>
                      <span>•</span>
                      <span>Resp: {fu.responsavel}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Botão WhatsApp wa.me */}
                    {waLink && fu.status === 'Pendente' && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Abrir WhatsApp</span>
                      </a>
                    )}

                    {fu.status === 'Pendente' && (
                      <button
                        type="button"
                        onClick={() => handleMarcarConcluido(fu.id, fu.cliente_nome)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white hover:bg-[#EAF2E8] border border-[#A8C3A0]/50 text-[#2F6B4F] text-xs font-semibold transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B4F]" />
                        <span>Marcar Feito</span>
                      </button>
                    )}

                    <Link
                      to={`/clientes/${fu.cliente}`}
                      className="p-1.5 rounded-lg border border-[#A8C3A0]/30 hover:bg-[#EAF2E8] text-[#5E6E64] hover:text-[#2F6B4F] transition-colors"
                      title="Abrir ficha do cliente"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleExcluir(fu.id)}
                      className="p-1.5 rounded-lg border border-transparent hover:border-rose-200 text-gray-400 hover:text-rose-600 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/20 space-y-1 text-xs">
                  <p className="font-semibold text-[#1D2B25]">{fu.assunto}</p>
                  {fu.mensagem_sugerida && (
                    <p className="text-[#5E6E64] italic">&ldquo;{fu.mensagem_sugerida}&rdquo;</p>
                  )}
                  {fu.justificativa_ia && (
                    <p className="text-[11px] text-[#2F6B4F] pt-1 border-t border-[#A8C3A0]/20">
                      <strong>Motivo sugerido pela IA:</strong> {fu.justificativa_ia}
                    </p>
                  )}
                </div>

                {fu.status === 'Concluído' && fu.data_conclusao && (
                  <p className="text-[11px] text-[#5E6E64] text-right">
                    Concluído em: <strong>{fu.data_conclusao}</strong>{' '}
                    {fu.resultado_nota ? `(${fu.resultado_nota})` : ''}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
