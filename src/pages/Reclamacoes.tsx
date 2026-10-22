import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
  FileText,
  UserCheck,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react'
import {
  listarReclamacoes,
  criarReclamacao,
  atualizarReclamacao,
  resolverReclamacao,
} from '@/services/reclamacoes'
import { listarClientes } from '@/services/clientes'
import { gerarLinkWhatsApp } from '@/services/followUps'
import type {
  Reclamacao,
  ReclamacaoInput,
  Cliente,
  CanalReclamacao,
  CategoriaReclamacao,
  GravidadeReclamacao,
  StatusReclamacao,
} from '@/types/crm'
import { LOJAS } from '@/data/boutiqueData'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const CANAIS_RECLAMACAO: CanalReclamacao[] = ['Loja', 'WhatsApp', 'Telefone', 'E-mail']
const CATEGORIAS_RECLAMACAO: CategoriaReclamacao[] = [
  'Produto com defeito',
  'Atraso na entrega',
  'Atendimento',
  'Troca/devolução',
  'Cobrança',
  'Outro',
]
const GRAVIDADES: GravidadeReclamacao[] = ['Baixa', 'Média', 'Alta']
const STATUS_RECLAMACAO: StatusReclamacao[] = ['Aberta', 'Em tratamento', 'Resolvida']

export default function ReclamacoesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [reclamacoes, setReclamacoes] = useState<Reclamacao[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todas')
  const [filtroLoja, setFiltroLoja] = useState<string>('todas')
  const [filtroGravidade, setFiltroGravidade] = useState<string>('todas')

  // Modal Novo / Edição
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  // Modal de Resolução
  const [modalResolverAberto, setModalResolverAberto] = useState(false)
  const [resolvendoId, setResolvendoId] = useState<string | null>(null)
  const [desfechoTexto, setDesfechoTexto] = useState('')
  const [dataResolucao, setDataResolucao] = useState(new Date().toISOString().split('T')[0])
  const [salvandoResolucao, setSalvandoResolucao] = useState(false)

  const hoje = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState<ReclamacaoInput>({
    cliente: '',
    cliente_nome: '',
    cliente_telefone: '',
    loja: LOJAS[0].nome,
    canal_origem: 'WhatsApp',
    categoria: 'Produto com defeito',
    descricao: '',
    gravidade: 'Média',
    responsavel: 'Consultor Boutique',
    prazo_resolucao: hoje,
    status: 'Aberta',
    resolucao_desfecho: '',
    data_resolucao: '',
  })

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [rList, cList] = await Promise.all([listarReclamacoes(), listarClientes()])
      setReclamacoes(rList)
      setClientes(cList)
    } catch (err) {
      console.error('Falha ao carregar ocorrências:', err)
      toast({
        title: 'Erro ao carregar ocorrências',
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
    const primeiro = clientes[0]
    setForm({
      cliente: primeiro?.id || '',
      cliente_nome: primeiro?.nome || '',
      cliente_telefone: primeiro?.telefone || '',
      loja: primeiro?.loja_origem || LOJAS[0].nome,
      canal_origem: 'WhatsApp',
      categoria: 'Produto com defeito',
      descricao: '',
      gravidade: 'Média',
      responsavel: 'Consultor Boutique',
      prazo_resolucao: hoje,
      status: 'Aberta',
      resolucao_desfecho: '',
      data_resolucao: '',
    })
    setModalAberto(true)
  }

  const handleAbrirEdicao = (rec: Reclamacao) => {
    setEditandoId(rec.id)
    setForm({
      cliente: rec.cliente,
      cliente_nome: rec.cliente_nome,
      cliente_telefone: rec.cliente_telefone || '',
      loja: rec.loja,
      canal_origem: rec.canal_origem,
      categoria: rec.categoria,
      descricao: rec.descricao,
      gravidade: rec.gravidade,
      responsavel: rec.responsavel,
      prazo_resolucao: rec.prazo_resolucao,
      status: rec.status,
      resolucao_desfecho: rec.resolucao_desfecho || '',
      data_resolucao: rec.data_resolucao || '',
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
        cliente_telefone: sel.telefone,
        loja: sel.loja_origem || prev.loja,
      }))
    }
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.cliente || !form.descricao || !form.prazo_resolucao) {
      toast({
        title: 'Campos incompletos',
        description: 'Selecione o cliente, preencha a descrição e o prazo.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      if (editandoId) {
        const atualizado = await atualizarReclamacao(editandoId, form)
        setReclamacoes((prev) => prev.map((r) => (r.id === editandoId ? atualizado : r)))
        toast({
          title: 'Ocorrência atualizada',
          description: 'Alterações gravadas com sucesso.',
        })
      } else {
        const criado = await criarReclamacao(form)
        setReclamacoes((prev) => [criado, ...prev])
        toast({
          title: 'Ocorrência registrada',
          description: `Ocorrência para ${criado.cliente_nome} aberta com sucesso.`,
        })
      }
      setModalAberto(false)
    } catch (err) {
      console.error('Falha ao salvar ocorrência:', err)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível gravar a ocorrência.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleAbrirModalResolver = (rec: Reclamacao) => {
    setResolvendoId(rec.id)
    setDesfechoTexto(rec.resolucao_desfecho || '')
    setDataResolucao(rec.data_resolucao || hoje)
    setModalResolverAberto(true)
  }

  const handleConfirmarResolucao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolvendoId || !desfechoTexto.trim()) {
      toast({
        title: 'Desfecho obrigatório',
        description: 'Descreva a solução adotada para concluir a ocorrência.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoResolucao(true)
    try {
      const atualizada = await resolverReclamacao(resolvendoId, desfechoTexto, dataResolucao)
      setReclamacoes((prev) => prev.map((r) => (r.id === resolvendoId ? atualizada : r)))
      setModalResolverAberto(false)
      toast({
        title: 'Ocorrência resolvida!',
        description: 'O desfecho e a data de resolução foram gravados.',
      })
    } catch (err) {
      console.error('Erro ao resolver ocorrência:', err)
      toast({
        title: 'Falha ao resolver',
        description: 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoResolucao(false)
    }
  }

  // Filtragem
  const reclamacoesFiltradas = reclamacoes
    .filter((r) => {
      const matchBusca =
        r.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
        r.descricao.toLowerCase().includes(busca.toLowerCase()) ||
        r.responsavel.toLowerCase().includes(busca.toLowerCase()) ||
        r.categoria.toLowerCase().includes(busca.toLowerCase()) ||
        (r.cliente_telefone && r.cliente_telefone.includes(busca))

      const matchStatus = filtroStatus === 'todas' || r.status === filtroStatus
      const matchLoja =
        filtroLoja === 'todas' || r.loja.toLowerCase().includes(filtroLoja.toLowerCase())
      const matchGravidade = filtroGravidade === 'todas' || r.gravidade === filtroGravidade

      return matchBusca && matchStatus && matchLoja && matchGravidade
    })
    .sort((a, b) => {
      // Prioridade: Não resolvidas com prazo vencido primeiro
      const aVencida = a.status !== 'Resolvida' && a.prazo_resolucao < hoje
      const bVencida = b.status !== 'Resolvida' && b.prazo_resolucao < hoje
      if (aVencida && !bVencida) return -1
      if (!aVencida && bVencida) return 1

      // Alta gravidade aberta antes de baixa
      if (a.status !== 'Resolvida' && b.status !== 'Resolvida') {
        const peso = { Alta: 3, Média: 2, Baixa: 1 }
        if (peso[a.gravidade] !== peso[b.gravidade]) {
          return peso[b.gravidade] - peso[a.gravidade]
        }
      }
      return a.prazo_resolucao.localeCompare(b.prazo_resolucao)
    })

  // Contadores rápidos para resumo
  const abertasCount = reclamacoes.filter((r) => r.status === 'Aberta').length
  const emTratamentoCount = reclamacoes.filter((r) => r.status === 'Em tratamento').length
  const resolvidasCount = reclamacoes.filter((r) => r.status === 'Resolvida').length
  const vencidasCount = reclamacoes.filter(
    (r) => r.status !== 'Resolvida' && r.prazo_resolucao < hoje,
  ).length

  return (
    <div className="space-y-6">
      {/* Topo do Módulo Ocorrências */}
      <div className="bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
            Pilar de Qualidade & Atendimento
          </span>
          <h1 className="font-semibold text-2xl sm:text-3xl text-[#1D2B25] tracking-tight mt-1">
            Gestão de Ocorrências
          </h1>{' '}
          <p className="text-xs sm:text-sm text-[#5E6E64] mt-0.5">
            Registro de ocorrências de variados assuntos, acompanhamento de prazos e resolução nas 7
            boutiques.
          </p>
        </div>

        <button
          onClick={handleAbrirNovo}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <Plus className="w-4 h-4 text-[#A8C3A0]" />
          <span>Registrar Ocorrência</span>
        </button>
      </div>

      {/* Mini-cards de Resumo Operacional de Reclamações */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#A8C3A0]/30 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64]">
              Abertas
            </span>
            <p className="font-bold text-2xl text-[#1D2B25] tracking-tight mt-0.5">
              {abertasCount}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#A8C3A0]/30 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64]">
              Em Tratamento
            </span>
            <p className="font-bold text-2xl text-slate-800 tracking-tight mt-0.5">
              {emTratamentoCount}
            </p>{' '}
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        <div
          className={`bg-white rounded-2xl p-4 border shadow-sm flex items-center justify-between ${
            vencidasCount > 0
              ? 'border-rose-400 bg-rose-50/25 ring-1 ring-rose-300'
              : 'border-[#A8C3A0]/30'
          }`}
        >
          <div>
            <span
              className={`text-[10px] uppercase font-bold tracking-wider ${vencidasCount > 0 ? 'text-rose-700' : 'text-[#5E6E64]'}`}
            >
              Vencidas (Atrasadas)
            </span>
            <p
              className={`font-bold text-2xl tracking-tight mt-0.5 ${vencidasCount > 0 ? 'text-rose-700' : 'text-[#1D2B25]'}`}
            >
              {vencidasCount}
            </p>{' '}
          </div>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${vencidasCount > 0 ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 text-slate-600'}`}
          >
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#A8C3A0]/30 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600">
              Resolvidas
            </span>
            <p className="font-bold text-2xl text-slate-800 tracking-tight mt-0.5">
              {resolvidasCount}
            </p>{' '}
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-2xl p-4 border border-[#A8C3A0]/30 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#5E6E64] absolute left-3.5 top-3" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente, motivo, loja ou responsável..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/40 text-xs sm:text-sm text-[#1D2B25] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Loja */}
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

          {/* Status */}
          <div className="flex items-center gap-1.5 bg-[#F7FAF5] border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#2F6B4F]" />
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="bg-transparent text-xs text-[#1D2B25] focus:outline-none cursor-pointer"
            >
              <option value="todas">Todos os Status</option>
              {STATUS_RECLAMACAO.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Gravidade */}
          <div className="flex items-center gap-1.5 bg-[#F7FAF5] border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs">
            <select
              value={filtroGravidade}
              onChange={(e) => setFiltroGravidade(e.target.value)}
              className="bg-transparent text-xs text-[#1D2B25] focus:outline-none cursor-pointer"
            >
              <option value="todas">Todas as Gravidades</option>
              {GRAVIDADES.map((g) => (
                <option key={g} value={g}>
                  Gravidade {g}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Reclamações */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#2F6B4F]" />
          <span className="text-xs font-medium text-[#5E6E64]">Carregando ocorrências...</span>
        </div>
      ) : reclamacoesFiltradas.length === 0 ? (
        <div className="bg-white rounded-[24px] p-12 text-center border border-[#A8C3A0]/30 shadow-sm space-y-3">
          <CheckCircle2 className="w-10 h-10 text-[#2F6B4F] mx-auto opacity-70" />
          <h3 className="font-semibold text-base sm:text-lg text-[#1D2B25]">
            Nenhuma ocorrência encontrada
          </h3>
          <p className="text-xs text-[#5E6E64]">
            Tudo em ordem nas boutiques ou os filtros aplicados não retornaram resultados.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reclamacoesFiltradas.map((rec) => {
            const isVencida = rec.status !== 'Resolvida' && rec.prazo_resolucao < hoje
            const isHoje = rec.status !== 'Resolvida' && rec.prazo_resolucao === hoje
            const waLink = rec.cliente_telefone
              ? gerarLinkWhatsApp(
                  rec.cliente_telefone,
                  `Olá ${rec.cliente_nome}, aqui é da equipe de atendimento da Boutique (${rec.loja}). Estamos acompanhando sua solicitação referente a "${rec.categoria}".`,
                )
              : null

            return (
              <div
                key={rec.id}
                className={`bg-white rounded-2xl p-5 border shadow-sm transition-all space-y-3.5 ${
                  isVencida
                    ? 'border-rose-400 bg-rose-50/25 ring-1 ring-rose-300'
                    : isHoje
                      ? 'border-amber-300 bg-amber-50/15'
                      : 'border-[#A8C3A0]/30 hover:border-[#2F6B4F]/50'
                }`}
              >
                {/* Cabeçalho do Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-base sm:text-lg text-[#1D2B25]">
                        {rec.cliente_nome}
                      </h3>
                      {/* Categoria Badge */}
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F7FAF5] border border-[#A8C3A0]/40 text-[#2F6B4F]">
                        {rec.categoria}
                      </span>

                      {/* Gravidade Badge - Tons frios, vermelho apenas se Alta */}
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          rec.gravidade === 'Alta'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        Gravidade {rec.gravidade}
                      </span>

                      {/* Status Badge - Tons frios e sóbrios */}
                      <span
                        className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${
                          rec.status === 'Resolvida'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : rec.status === 'Em tratamento'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-stone-100 text-stone-700 border border-stone-200'
                        }`}
                      >
                        {rec.status}
                      </span>

                      {/* Destaque Vencida */}
                      {isVencida && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1 animate-pulse">
                          <AlertCircle className="w-3 h-3" />
                          <span>Prazo Vencido</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#5E6E64] flex flex-wrap items-center gap-2 mt-1">
                      <span className="font-medium text-[#1D2B25]">{rec.loja}</span>
                      <span>•</span>
                      <span>Canal: {rec.canal_origem}</span>
                      <span>•</span>
                      <span>
                        Responsável: <strong>{rec.responsavel}</strong>
                      </span>
                      <span>•</span>
                      <span className={isVencida ? 'text-rose-700 font-bold' : ''}>
                        Prazo: <strong>{rec.prazo_resolucao}</strong>
                      </span>
                    </p>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#3A6652] hover:bg-[#2F5342] text-white text-xs font-semibold shadow-xs transition-all"
                        title="Falar no WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    {rec.status !== 'Resolvida' ? (
                      <button
                        type="button"
                        onClick={() => handleAbrirModalResolver(rec)}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold shadow-sm transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#A8C3A0]" />
                        <span>Resolver</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAbrirModalResolver(rec)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#EAF2E8] text-[#2F6B4F] text-xs font-semibold hover:bg-[#d8e8d5]"
                        title="Ver ou editar desfecho"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ver Desfecho</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleAbrirEdicao(rec)}
                      className="px-2.5 py-1.5 rounded-lg border border-[#A8C3A0]/40 text-xs font-medium text-[#5E6E64] hover:text-[#2F6B4F] hover:bg-[#EAF2E8] transition-colors"
                    >
                      Editar
                    </button>

                    <Link
                      to={`/clientes/${rec.cliente}`}
                      className="p-1.5 rounded-lg border border-[#A8C3A0]/30 hover:bg-[#EAF2E8] text-[#5E6E64] hover:text-[#2F6B4F] transition-colors"
                      title="Ver ficha do cliente"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Descrição da Reclamação */}
                <div className="p-3.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/20 space-y-1 text-xs">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-[#5E6E64]">
                    Descrição da Ocorrência:
                  </span>
                  <p className="text-[#1D2B25] leading-relaxed whitespace-pre-wrap">
                    {rec.descricao}
                  </p>
                </div>

                {/* Bloco de Desfecho se Resolvida */}
                {rec.status === 'Resolvida' && rec.resolucao_desfecho && (
                  <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-emerald-900">
                      <span className="font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        Desfecho / Solução Adotada
                      </span>
                      {rec.data_resolucao && (
                        <span className="text-[11px] text-emerald-800">
                          Resolvida em: <strong>{rec.data_resolucao}</strong>
                        </span>
                      )}
                    </div>
                    <p className="text-[#1D2B25] leading-relaxed">{rec.resolucao_desfecho}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Criar / Editar Ocorrência */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-semibold text-xl text-[#1D2B25]">
              {editandoId ? 'Editar Ocorrência' : 'Registrar Nova Ocorrência'}
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
                  Canal de Origem
                </label>
                <select
                  value={form.canal_origem}
                  onChange={(e) =>
                    setForm({ ...form, canal_origem: e.target.value as CanalReclamacao })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                >
                  {CANAIS_RECLAMACAO.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Categoria da Ocorrência *
                </label>
                <select
                  value={form.categoria}
                  onChange={(e) =>
                    setForm({ ...form, categoria: e.target.value as CategoriaReclamacao })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                >
                  {CATEGORIAS_RECLAMACAO.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Gravidade *
                </label>
                <select
                  value={form.gravidade}
                  onChange={(e) =>
                    setForm({ ...form, gravidade: e.target.value as GravidadeReclamacao })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                >
                  {GRAVIDADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Responsável pelo Tratamento
                </label>
                <input
                  type="text"
                  required
                  value={form.responsavel}
                  onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                  placeholder="Nome do consultor ou gerente"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                ></input>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Prazo de Resolução *
                </label>
                <input
                  type="date"
                  required
                  value={form.prazo_resolucao}
                  onChange={(e) => setForm({ ...form, prazo_resolucao: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                Status da Ocorrência
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as StatusReclamacao })}
                className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
              >
                {STATUS_RECLAMACAO.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                Descrição Detalhada do Problema *
              </label>
              <textarea
                rows={3}
                required
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descreva a falha, peças avariadas, atraso, reclamação sobre atendimento..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
              />
            </div>

            {form.status === 'Resolvida' && (
              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Desfecho da Solução
                </label>
                <textarea
                  rows={2}
                  value={form.resolucao_desfecho || ''}
                  onChange={(e) => setForm({ ...form, resolucao_desfecho: e.target.value })}
                  placeholder="Como o problema foi solucionado com o cliente..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                />
              </div>
            )}

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
                    ? 'Atualizar Ocorrência'
                    : 'Registrar Ocorrência'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Específico para Resolver Ocorrência */}
      <Dialog open={modalResolverAberto} onOpenChange={setModalResolverAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-semibold text-xl text-[#1D2B25] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-slate-700" />
              <span>Concluir Resolução da Ocorrência</span>
            </DialogTitle>{' '}
          </DialogHeader>

          <form onSubmit={handleConfirmarResolucao} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                Data da Resolução
              </label>
              <input
                type="date"
                required
                value={dataResolucao}
                onChange={(e) => setDataResolucao(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                Desfecho / Solução Adotada *
              </label>
              <textarea
                rows={4}
                required
                value={desfechoTexto}
                onChange={(e) => setDesfechoTexto(e.target.value)}
                placeholder="Ex.: Visita técnica realizada na obra com reposição de 2 caixas com entrega expressa e aceite do cliente."
                className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#EAF2E8]">
              <button
                type="button"
                onClick={() => setModalResolverAberto(false)}
                className="px-4 py-2 rounded-full border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvandoResolucao}
                className="px-5 py-2 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                {salvandoResolucao ? 'Salvando...' : 'Confirmar Resolução'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
