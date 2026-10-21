import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Headphones,
  Search,
  Filter,
  Plus,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
  Edit,
  UserCheck,
} from 'lucide-react'
import { listarAtendimentos, criarAtendimento, atualizarAtendimento } from '@/services/atendimentos'
import { listarClientes } from '@/services/clientes'
import type {
  Atendimento,
  AtendimentoInput,
  Cliente,
  CanalAtendimento,
  StatusAtendimento,
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

const CANAIS: CanalAtendimento[] = ['Presencial', 'WhatsApp', 'Telefone', 'Reunião Online']
const STATUS_LIST: StatusAtendimento[] = ['Aberto', 'Em atendimento', 'Concluído', 'Cancelado']

export default function AtendimentosPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todas')
  const [filtroLoja, setFiltroLoja] = useState<string>('todas')
  const [filtroCanal, setFiltroCanal] = useState<string>('todas')

  // Modal Novo / Edição
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const hoje = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState<AtendimentoInput>({
    cliente: '',
    cliente_nome: '',
    loja: LOJAS[0].nome,
    responsavel: 'Consultor Boutique',
    canal: 'Presencial',
    data_atendimento: hoje,
    horario: '10:00',
    interesse: '',
    resumo: '',
    status: 'Aberto',
  })

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [aList, cList] = await Promise.all([listarAtendimentos(), listarClientes()])
      setAtendimentos(aList)
      setClientes(cList)
    } catch (err) {
      console.error('Falha ao carregar atendimentos:', err)
      toast({
        title: 'Erro ao carregar atendimentos',
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

  const handleAbrirNovo = () => {
    setEditandoId(null)
    setForm({
      cliente: clientes[0]?.id || '',
      cliente_nome: clientes[0]?.nome || '',
      loja: LOJAS[0].nome,
      responsavel: 'Consultor Boutique',
      canal: 'Presencial',
      data_atendimento: hoje,
      horario: '10:00',
      interesse: '',
      resumo: '',
      status: 'Aberto',
    })
    setModalAberto(true)
  }

  const handleAbrirEdicao = (at: Atendimento) => {
    setEditandoId(at.id)
    setForm({
      cliente: at.cliente,
      cliente_nome: at.cliente_nome,
      loja: at.loja,
      responsavel: at.responsavel,
      canal: at.canal,
      data_atendimento: at.data_atendimento,
      horario: at.horario || '10:00',
      interesse: at.interesse,
      resumo: at.resumo,
      status: at.status,
    })
    setModalAberto(true)
  }

  const handleClienteChange = (clienteId: string) => {
    const sel = clientes.find((c) => c.id === clienteId)
    if (sel) {
      setForm((prev) => ({
        ...prev,
        cliente: sel.id,
        cliente_nome: sel.nome,
        loja: sel.loja_origem || prev.loja,
        interesse: prev.interesse || sel.interesse_principal || '',
      }))
    }
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.cliente || !form.resumo || !form.interesse) {
      toast({
        title: 'Campos incompletos',
        description: 'Selecione o cliente, descreva o interesse e o resumo.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      if (editandoId) {
        const atualizado = await atualizarAtendimento(editandoId, form)
        setAtendimentos((prev) => prev.map((a) => (a.id === editandoId ? atualizado : a)))
        toast({
          title: 'Atendimento atualizado',
          description: 'Alterações gravadas com sucesso.',
        })
      } else {
        const criado = await criarAtendimento(form)
        setAtendimentos((prev) => [criado, ...prev])
        toast({
          title: 'Atendimento registrado',
          description: `Atendimento de ${criado.cliente_nome} criado.`,
        })
      }
      setModalAberto(false)
    } catch (err) {
      console.error('Falha ao salvar atendimento:', err)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível gravar o atendimento.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Filtragem
  const atendimentosFiltrados = atendimentos.filter((a) => {
    const matchBusca =
      a.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
      a.interesse.toLowerCase().includes(busca.toLowerCase()) ||
      a.resumo.toLowerCase().includes(busca.toLowerCase()) ||
      a.responsavel.toLowerCase().includes(busca.toLowerCase())

    const matchStatus = filtroStatus === 'todas' || a.status === filtroStatus
    const matchLoja =
      filtroLoja === 'todas' || a.loja.toLowerCase().includes(filtroLoja.toLowerCase())
    const matchCanal = filtroCanal === 'todas' || a.canal === filtroCanal

    return matchBusca && matchStatus && matchLoja && matchCanal
  })

  return (
    <div className="space-y-6">
      {/* Topo: Título + Botão Novo Atendimento */}
      <div className="bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2F6B4F] flex items-center gap-1.5">
            <Headphones className="w-3.5 h-3.5" />
            Consultoria e Atendimento Técnico
          </span>
          <h1 className="font-semibold text-2xl sm:text-3xl text-[#1D2B25] tracking-tight mt-1">
            Registro de Atendimentos
          </h1>
          <p className="text-xs sm:text-sm text-[#5E6E64] mt-0.5">
            Presenciais nas lojas, WhatsApp, telefone e alinhamentos de especificação técnica.
          </p>
        </div>

        <button
          onClick={handleAbrirNovo}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <Plus className="w-4 h-4 text-[#A8C3A0]" />
          <span>Novo Atendimento</span>
        </button>
      </div>

      {/* Modal Dialog (Criação e Edição) */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-semibold text-xl text-[#1D2B25]">
              {editandoId ? 'Editar Atendimento' : 'Registrar Novo Atendimento'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                Cliente *
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
                    {c.nome} ({c.loja_origem})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Loja da Rede
                </label>
                <select
                  value={form.loja}
                  onChange={(e) => setForm({ ...form, loja: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                >
                  {LOJAS.map((l) => (
                    <option key={l.id} value={l.nome}>
                      {l.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Consultor Responsável
                </label>
                <input
                  type="text"
                  required
                  value={form.responsavel}
                  onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                  placeholder="Nome do consultor"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Canal de Atendimento
                </label>
                <select
                  value={form.canal}
                  onChange={(e) => setForm({ ...form, canal: e.target.value as CanalAtendimento })}
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
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as StatusAtendimento })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                >
                  {STATUS_LIST.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Data do Atendimento
                </label>
                <input
                  type="date"
                  required
                  value={form.data_atendimento}
                  onChange={(e) => setForm({ ...form, data_atendimento: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Horário
                </label>
                <input
                  type="text"
                  value={form.horario || ''}
                  onChange={(e) => setForm({ ...form, horario: e.target.value })}
                  placeholder="Ex.: 14:30"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                Interesse (Revestimentos, Mármores, Metais) *
              </label>
              <input
                type="text"
                required
                value={form.interesse}
                onChange={(e) => setForm({ ...form, interesse: e.target.value })}
                placeholder="Ex.: Porcelanato grandes formatos 120x240, torneiras monocomando..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                Resumo do Atendimento *
              </label>
              <textarea
                rows={3}
                required
                value={form.resumo}
                onChange={(e) => setForm({ ...form, resumo: e.target.value })}
                placeholder="Resumo das decisões, amostras entregues, prazos alinhados..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#EAF2E8]">
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="px-4 py-2 rounded-full border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="px-5 py-2 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                {salvando
                  ? 'Salvando...'
                  : editandoId
                    ? 'Atualizar Atendimento'
                    : 'Registrar Atendimento'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 border border-[#A8C3A0]/30 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#5E6E64] absolute left-3.5 top-3" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente, material, resumo ou consultor..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/40 text-xs sm:text-sm text-[#1D2B25] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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

          <div className="flex items-center gap-1.5 bg-[#F7FAF5] border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#2F6B4F]" />
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="bg-transparent text-xs text-[#1D2B25] focus:outline-none cursor-pointer"
            >
              <option value="todas">Todos os Status</option>
              {STATUS_LIST.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#F7FAF5] border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs">
            <select
              value={filtroCanal}
              onChange={(e) => setFiltroCanal(e.target.value)}
              className="bg-transparent text-xs text-[#1D2B25] focus:outline-none cursor-pointer"
            >
              <option value="todas">Todos os Canais</option>
              {CANAIS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Atendimentos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#2F6B4F]" />
          <span className="text-xs font-medium text-[#5E6E64]">Carregando atendimentos...</span>
        </div>
      ) : atendimentosFiltrados.length === 0 ? (
        <div className="bg-white rounded-[24px] p-12 text-center border border-[#A8C3A0]/30 shadow-sm space-y-3">
          <Headphones className="w-10 h-10 text-[#5E6E64] mx-auto opacity-50" />
          <h3 className="font-semibold text-base sm:text-lg text-[#1D2B25]">
            Nenhum atendimento encontrado
          </h3>
          <p className="text-xs text-[#5E6E64]">
            Tente mudar os filtros ou registre um novo atendimento acima.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {atendimentosFiltrados.map((at) => (
            <div
              key={at.id}
              className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 hover:border-[#2F6B4F]/50 shadow-sm transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base sm:text-lg text-[#1D2B25]">
                      {at.cliente_nome}
                    </h3>{' '}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F7FAF5] border border-[#A8C3A0]/40 text-[#2F6B4F] font-semibold">
                      {at.canal}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
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

                  <p className="text-xs text-[#5E6E64] flex items-center gap-2 mt-1">
                    <span className="font-medium text-[#1D2B25]">{at.loja}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#2F6B4F]" />
                      {at.data_atendimento} {at.horario ? `às ${at.horario}` : ''}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-[#2F6B4F]" />
                      {at.responsavel}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleAbrirEdicao(at)}
                    className="p-1.5 rounded-lg border border-[#A8C3A0]/40 text-[#5E6E64] hover:text-[#2F6B4F] hover:bg-[#EAF2E8] transition-colors"
                    title="Editar atendimento"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    to={`/clientes/${at.cliente}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#EAF2E8] hover:bg-[#2F6B4F] text-[#2F6B4F] hover:text-white font-semibold text-xs transition-colors"
                  >
                    <span>Ficha do Cliente</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/20 space-y-1.5 text-xs">
                <p className="text-[#1D2B25]">
                  <strong className="text-[#2F6B4F] font-semibold">Interesse: </strong>
                  {at.interesse}
                </p>
                <p className="text-[#5E6E64] leading-relaxed">{at.resumo}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
