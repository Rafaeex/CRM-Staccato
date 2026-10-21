import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Kanban,
  Plus,
  Paperclip,
  CheckSquare,
  Calendar,
  Building2,
  User,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Loader2,
  FileText,
  Upload,
  CheckCircle2,
  X,
  Sparkles,
  ChevronRight,
  Download,
} from 'lucide-react'
import {
  listarCartoesKanban,
  criarCartaoKanban,
  atualizarCartaoKanban,
  moverCartaoColuna,
  excluirCartaoKanban,
  getUrlAnexo,
} from '@/services/kanban'
import { listarClientes } from '@/services/clientes'
import { getUsuarioAtualInfo } from '@/services/permissoes'
import type {
  CartaoKanban,
  CartaoKanbanInput,
  ColunaKanban,
  PrioridadeKanban,
  Cliente,
  ItemChecklist,
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

const COLUNAS: { id: ColunaKanban; label: string; cor: string }[] = [
  { id: 'A fazer', label: 'A fazer', cor: 'border-slate-300 bg-slate-50/50' },
  { id: 'Fazendo hoje', label: 'Fazendo hoje', cor: 'border-amber-300 bg-amber-50/30' },
  {
    id: 'Aguardando cliente',
    label: 'Aguardando cliente',
    cor: 'border-purple-300 bg-purple-50/30',
  },
  { id: 'Resolvido', label: 'Resolvido', cor: 'border-emerald-300 bg-emerald-50/30' },
]

export default function QuadroPage() {
  const { toast } = useToast()
  const userInfo = getUsuarioAtualInfo()

  const [loading, setLoading] = useState(true)
  const [cartoes, setCartoes] = useState<CartaoKanban[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroLoja, setFiltroLoja] = useState<string>(
    userInfo.isAtendente && userInfo.loja ? userInfo.loja : 'todas',
  )
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('todas')

  // Drag state
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<ColunaKanban | null>(null)

  // Modal Novo Cartão
  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [formNovo, setFormNovo] = useState<{
    titulo: string
    cliente: string
    loja: string
    responsavel: string
    coluna: ColunaKanban
    prioridade: PrioridadeKanban
    descricao: string
    data_limite: string
    checklistTexto: string
    anexos: File[]
  }>({
    titulo: '',
    cliente: '',
    loja: userInfo.loja || LOJAS[0].nome,
    responsavel: userInfo.name,
    coluna: 'A fazer',
    prioridade: 'Média',
    descricao: '',
    data_limite: new Date().toISOString().split('T')[0],
    checklistTexto: '',
    anexos: [],
  })

  // Modal Detalhes / Edição de Cartão
  const [cartaoDetalhe, setCartaoDetalhe] = useState<CartaoKanban | null>(null)
  const [modalDetalheAberto, setModalDetalheAberto] = useState(false)
  const [salvandoDetalhe, setSalvandoDetalhe] = useState(false)
  const [novoItemChecklist, setNovoItemChecklist] = useState('')
  const [novosAnexos, setNovosAnexos] = useState<File[]>([])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [cList, cliList] = await Promise.all([listarCartoesKanban(), listarClientes()])
      setCartoes(cList)
      setClientes(cliList)
    } catch (err) {
      console.error('Falha ao carregar kanban:', err)
      toast({
        title: 'Erro ao carregar quadro',
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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCardId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, col: ColunaKanban) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverCol !== col) {
      setDragOverCol(col)
    }
  }

  const handleDragLeave = () => {
    setDragOverCol(null)
  }

  const handleDrop = async (e: React.DragEvent, destinoColuna: ColunaKanban) => {
    e.preventDefault()
    setDragOverCol(null)
    const cardId = draggedCardId || e.dataTransfer.getData('text/plain')
    if (!cardId) return

    const card = cartoes.find((c) => c.id === cardId)
    if (!card || card.coluna === destinoColuna) return

    // Atualização otimista
    const anterior = [...cartoes]
    setCartoes((prev) => prev.map((c) => (c.id === cardId ? { ...c, coluna: destinoColuna } : c)))

    try {
      await moverCartaoColuna(cardId, destinoColuna)
      toast({
        title: 'Cartão movido',
        description: `"${card.titulo}" agora está em "${destinoColuna}".`,
      })
    } catch (err) {
      console.error('Erro ao mover cartão:', err)
      setCartoes(anterior)
      toast({
        title: 'Erro ao mover cartão',
        description: 'Não foi possível salvar a alteração.',
        variant: 'destructive',
      })
    } finally {
      setDraggedCardId(null)
    }
  }

  // Criar cartão
  const handleCriarCartao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNovo.titulo.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Informe o título do cartão.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const cliSel = clientes.find((c) => c.id === formNovo.cliente)
      const checklistItems: ItemChecklist[] = formNovo.checklistTexto
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((texto, i) => ({ id: String(i + 1), texto, concluido: false }))

      const input: CartaoKanbanInput = {
        titulo: formNovo.titulo.trim(),
        cliente: formNovo.cliente || undefined,
        cliente_nome: cliSel ? cliSel.nome : undefined,
        loja: formNovo.loja,
        responsavel: formNovo.responsavel,
        coluna: formNovo.coluna,
        prioridade: formNovo.prioridade,
        descricao: formNovo.descricao,
        data_limite: formNovo.data_limite,
        checklist_json: JSON.stringify(checklistItems),
        anexos: formNovo.anexos,
      }

      const criado = await criarCartaoKanban(input)
      setCartoes((prev) => [criado, ...prev])
      setModalNovoAberto(false)
      setFormNovo({
        titulo: '',
        cliente: '',
        loja: userInfo.loja || LOJAS[0].nome,
        responsavel: userInfo.name,
        coluna: 'A fazer',
        prioridade: 'Média',
        descricao: '',
        data_limite: new Date().toISOString().split('T')[0],
        checklistTexto: '',
        anexos: [],
      })

      toast({
        title: 'Cartão criado no Kanban',
        description: `"${criado.titulo}" adicionado com sucesso.`,
      })
    } catch (err) {
      console.error('Erro ao criar cartão:', err)
      toast({
        title: 'Falha ao criar cartão',
        description: 'Verifique os dados preenchidos.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Abrir detalhes do cartão
  const handleAbrirDetalhes = (c: CartaoKanban) => {
    setCartaoDetalhe(c)
    setNovosAnexos([])
    setNovoItemChecklist('')
    setModalDetalheAberto(true)
  }

  // Toggle checklist item
  const handleToggleChecklist = async (itemId: string) => {
    if (!cartaoDetalhe) return
    const itens: ItemChecklist[] = cartaoDetalhe.checklist_json
      ? JSON.parse(cartaoDetalhe.checklist_json)
      : []

    const atualizados = itens.map((item) =>
      item.id === itemId ? { ...item, concluido: !item.concluido } : item,
    )

    const jsonStr = JSON.stringify(atualizados)
    setCartaoDetalhe({ ...cartaoDetalhe, checklist_json: jsonStr })
    setCartoes((prev) =>
      prev.map((c) => (c.id === cartaoDetalhe.id ? { ...c, checklist_json: jsonStr } : c)),
    )

    try {
      await atualizarCartaoKanban(cartaoDetalhe.id, { checklist_json: jsonStr })
    } catch (err) {
      console.error(err)
    }
  }

  // Adicionar item checklist
  const handleAdicionarItemChecklist = async () => {
    if (!cartaoDetalhe || !novoItemChecklist.trim()) return
    const itens: ItemChecklist[] = cartaoDetalhe.checklist_json
      ? JSON.parse(cartaoDetalhe.checklist_json)
      : []

    const novo: ItemChecklist = {
      id: String(Date.now()),
      texto: novoItemChecklist.trim(),
      concluido: false,
    }
    const atualizados = [...itens, novo]
    const jsonStr = JSON.stringify(atualizados)

    setCartaoDetalhe({ ...cartaoDetalhe, checklist_json: jsonStr })
    setCartoes((prev) =>
      prev.map((c) => (c.id === cartaoDetalhe.id ? { ...c, checklist_json: jsonStr } : c)),
    )
    setNovoItemChecklist('')

    try {
      await atualizarCartaoKanban(cartaoDetalhe.id, { checklist_json: jsonStr })
    } catch (err) {
      console.error(err)
    }
  }

  // Upload de novos anexos no cartão
  const handleUploadNovosAnexos = async () => {
    if (!cartaoDetalhe || novosAnexos.length === 0) return
    setSalvandoDetalhe(true)
    try {
      const atualizado = await atualizarCartaoKanban(cartaoDetalhe.id, {
        anexosNovos: novosAnexos,
      })
      setCartaoDetalhe(atualizado)
      setCartoes((prev) => prev.map((c) => (c.id === atualizado.id ? atualizado : c)))
      setNovosAnexos([])
      toast({
        title: 'Anexos salvos',
        description: 'Arquivos adicionados com sucesso ao cartão.',
      })
    } catch (err) {
      console.error('Erro ao enviar anexos:', err)
      toast({
        title: 'Falha no upload',
        description: 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoDetalhe(false)
    }
  }

  // Excluir cartão
  const handleExcluirCartao = async (id: string) => {
    if (!confirm('Deseja realmente excluir este cartão do quadro?')) return
    const sucesso = await excluirCartaoKanban(id)
    if (sucesso) {
      setCartoes((prev) => prev.filter((c) => c.id !== id))
      setModalDetalheAberto(false)
      toast({
        title: 'Cartão removido',
        description: 'Cartão excluído com sucesso.',
      })
    }
  }

  // Filtragem dos cartões
  const cartoesFiltrados = cartoes.filter((c) => {
    // Filtro por atendente: atendente vê apenas da sua loja ou seus registros
    if (userInfo.isAtendente && userInfo.loja) {
      if (!c.loja.toLowerCase().includes(userInfo.loja.toLowerCase())) {
        return false
      }
    } else if (filtroLoja !== 'todas') {
      if (!c.loja.toLowerCase().includes(filtroLoja.toLowerCase())) {
        return false
      }
    }

    if (filtroPrioridade !== 'todas' && c.prioridade !== filtroPrioridade) {
      return false
    }

    if (busca) {
      const b = busca.toLowerCase()
      const matchTitulo = c.titulo.toLowerCase().includes(b)
      const matchCli = (c.cliente_nome || '').toLowerCase().includes(b)
      const matchDesc = (c.descricao || '').toLowerCase().includes(b)
      const matchResp = c.responsavel.toLowerCase().includes(b)
      if (!matchTitulo && !matchCli && !matchDesc && !matchResp) return false
    }

    return true
  })

  // Métricas compactas calculadas
  const totalCartoes = cartoesFiltrados.length
  const totalResolvidos = cartoesFiltrados.filter((c) => c.coluna === 'Resolvido').length
  const taxaConclusao = totalCartoes > 0 ? Math.round((totalResolvidos / totalCartoes) * 100) : 0

  const totalComAnexos = cartoesFiltrados.filter(
    (c) => Array.isArray(c.anexos) && c.anexos.length > 0,
  ).length
  const pctAnexos = totalCartoes > 0 ? Math.round((totalComAnexos / totalCartoes) * 100) : 0

  const urgentesOuAltos = cartoesFiltrados.filter(
    (c) => c.coluna !== 'Resolvido' && (c.prioridade === 'Urgente' || c.prioridade === 'Alta'),
  ).length
  const pctUrgentes = totalCartoes > 0 ? Math.round((urgentesOuAltos / totalCartoes) * 100) : 0

  const hojeStr = new Date().toISOString().split('T')[0]
  const vencidos = cartoesFiltrados.filter(
    (c) => c.coluna !== 'Resolvido' && c.data_limite && c.data_limite < hojeStr,
  ).length

  // Helper para anéis circulares (SVG radial/donut compacto)
  const renderMiniRadial = (pct: number, corStroke: string, corTrack: string = '#EAF2E8') => {
    const size = 38
    const strokeWidth = 3.5
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const safePct = Math.max(0, Math.min(100, pct))
    const strokeDashoffset = circumference - (safePct / 100) * circumference

    return (
      <svg width={size} height={size} className="transform -rotate-90 shrink-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={corTrack}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={corStroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
    )
  }

  return (
    <div className="space-y-4">
      {/* Topo Limpo, Sóbrio e Arejado com Indicadores Redondos Pequenos Integrados */}
      <div className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2F6B4F] flex items-center gap-1.5">
            <Kanban className="w-3.5 h-3.5" />
            Quadro Operacional de Obras
          </span>
          <h1 className="font-semibold text-2xl text-[#1D2B25] tracking-tight mt-0.5">
            Fluxo de Atendimento
          </h1>
          <p className="text-xs text-[#5E6E64] mt-0.5">
            Checklists, prazos técnicos e anexos de plantas por cartão.
          </p>
        </div>

        {/* Indicadores redondos e relativamente pequenos (radial/donut compactos) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Indicador 1: Taxa de Resolução */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30">
            <div className="relative flex items-center justify-center">
              {renderMiniRadial(taxaConclusao, '#2F6B4F', '#EAF2E8')}
              <span className="absolute text-[10px] font-bold text-[#1D2B25] font-mono">
                {taxaConclusao}%
              </span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#5E6E64]">
                Conclusão
              </span>
              <span className="text-xs font-bold text-[#1D2B25]">
                {totalResolvidos} de {totalCartoes}
              </span>
            </div>
          </div>

          {/* Indicador 2: Prioridade Crítica */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30">
            <div className="relative flex items-center justify-center">
              {renderMiniRadial(
                pctUrgentes,
                urgentesOuAltos > 0 ? '#C27803' : '#2F6B4F',
                '#FEF3C7',
              )}
              <span className="absolute text-[10px] font-bold text-[#1D2B25] font-mono">
                {urgentesOuAltos}
              </span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#5E6E64]">
                Alta / Urgente
              </span>
              <span className="text-xs font-medium text-[#5E6E64]">{pctUrgentes}% em aberto</span>
            </div>
          </div>

          {/* Indicador 3: Plantas & Anexos Técnicos */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30">
            <div className="relative flex items-center justify-center">
              {renderMiniRadial(pctAnexos, '#2563EB', '#DBEAFE')}
              <span className="absolute text-[10px] font-bold text-[#1D2B25] font-mono">
                {totalComAnexos}
              </span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#5E6E64]">
                Com Anexos
              </span>
              <span className="text-xs font-medium text-[#5E6E64]">{pctAnexos}% dos cartões</span>
            </div>
          </div>
        </div>

        {/* Botão Novo Cartão */}
        <Dialog open={modalNovoAberto} onOpenChange={setModalNovoAberto}>
          <DialogTrigger asChild>
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]">
              <Plus className="w-4 h-4 text-[#A8C3A0]" />
              <span>Novo Cartão</span>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-semibold text-xl text-[#1D2B25]">
                Novo Cartão Operacional
              </DialogTitle>{' '}
            </DialogHeader>

            <form onSubmit={handleCriarCartao} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Título do Cartão *
                </label>
                <input
                  type="text"
                  required
                  value={formNovo.titulo}
                  onChange={(e) => setFormNovo({ ...formNovo, titulo: e.target.value })}
                  placeholder="Ex.: Enviar amostra Calacatta ou Medição in loco"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Cliente Vinculado
                  </label>
                  <select
                    value={formNovo.cliente}
                    onChange={(e) => setFormNovo({ ...formNovo, cliente: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                  >
                    <option value="">Nenhum / Geral</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} ({c.loja_origem})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Coluna Inicial
                  </label>
                  <select
                    value={formNovo.coluna}
                    onChange={(e) =>
                      setFormNovo({ ...formNovo, coluna: e.target.value as ColunaKanban })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                  >
                    {COLUNAS.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Prioridade
                  </label>
                  <select
                    value={formNovo.prioridade}
                    onChange={(e) =>
                      setFormNovo({
                        ...formNovo,
                        prioridade: e.target.value as PrioridadeKanban,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Loja
                  </label>
                  <select
                    value={formNovo.loja}
                    disabled={userInfo.isAtendente && Boolean(userInfo.loja)}
                    onChange={(e) => setFormNovo({ ...formNovo, loja: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs disabled:opacity-75"
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
                    Data Limite
                  </label>
                  <input
                    type="date"
                    value={formNovo.data_limite}
                    onChange={(e) => setFormNovo({ ...formNovo, data_limite: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Descrição / Contexto
                </label>
                <textarea
                  rows={2}
                  value={formNovo.descricao}
                  onChange={(e) => setFormNovo({ ...formNovo, descricao: e.target.value })}
                  placeholder="Orientações, memorial descritivo, especificações..."
                  className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Itens de Checklist (1 por linha)
                </label>
                <textarea
                  rows={2}
                  value={formNovo.checklistTexto}
                  onChange={(e) => setFormNovo({ ...formNovo, checklistTexto: e.target.value })}
                  placeholder="Enviar amostras para arquiteto&#10;Subir memorial técnico&#10;Confirmar prumada"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs font-mono"
                />
              </div>

              {/* Anexos de Arquivos */}
              <div className="p-3 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1D2B25] flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#2F6B4F]" />
                    <span>Anexar Arquivos (Plantas, PDFs, Imagens)</span>
                  </span>
                  <span className="text-[10px] text-[#5E6E64]">Máx. 20MB cada</span>
                </div>
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      setFormNovo({ ...formNovo, anexos: Array.from(e.target.files) })
                    }
                  }}
                  className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#2F6B4F] file:text-white hover:file:bg-[#25563F] cursor-pointer"
                />
                {formNovo.anexos.length > 0 && (
                  <p className="text-[11px] text-[#2F6B4F] font-medium">
                    {formNovo.anexos.length} arquivo(s) selecionado(s)
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAF2E8]">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="px-4 py-2 rounded-full border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {salvando ? 'Criando...' : 'Criar Cartão'}
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
            placeholder="Buscar cartão por título, cliente, descrição ou responsável..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/40 text-xs sm:text-sm text-[#1D2B25] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {userInfo.isGestor ? (
            <div className="flex items-center gap-1.5 bg-[#F7FAF5] border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs">
              <Building2 className="w-3.5 h-3.5 text-[#2F6B4F]" />
              <select
                value={filtroLoja}
                onChange={(e) => setFiltroLoja(e.target.value)}
                className="bg-transparent text-xs text-[#1D2B25] focus:outline-none cursor-pointer"
              >
                <option value="todas">Filtrar por loja (todas)</option>
                {LOJAS.map((l) => (
                  <option key={l.id} value={l.nome}>
                    {l.nome.replace(' (SP)', '')}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#F7FAF5] border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs text-[#5E6E64]">
              <Building2 className="w-3.5 h-3.5 text-[#2F6B4F]" />
              <span className="font-medium text-[#1D2B25]">
                {userInfo.loja ? userInfo.loja.replace(' (SP)', '') : 'Minha Unidade'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-[#F7FAF5] border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#2F6B4F]" />
            <select
              value={filtroPrioridade}
              onChange={(e) => setFiltroPrioridade(e.target.value)}
              className="bg-transparent text-xs text-[#1D2B25] focus:outline-none cursor-pointer"
            >
              <option value="todas">Todas as Prioridades</option>
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid das 4 Colunas Kanban com Drag and Drop */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#2F6B4F]" />
          <span className="text-xs font-medium text-[#5E6E64]">Carregando quadro kanban...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {COLUNAS.map((coluna) => {
            const cardsNaColuna = cartoesFiltrados.filter((c) => c.coluna === coluna.id)
            const isOver = dragOverCol === coluna.id

            return (
              <div
                key={coluna.id}
                onDragOver={(e) => handleDragOver(e, coluna.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, coluna.id)}
                className={`bg-white/90 backdrop-blur-xs rounded-[20px] p-3.5 border transition-all flex flex-col min-h-[500px] shadow-xs ${
                  isOver
                    ? 'border-[#2F6B4F] bg-[#EAF2E8]/40 ring-2 ring-[#2F6B4F]/20'
                    : 'border-[#A8C3A0]/30'
                }`}
              >
                {/* Cabeçalho da Coluna */}
                <div className="flex items-center justify-between pb-3 px-1 border-b border-[#EAF2E8]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm sm:text-base text-[#1D2B25]">
                      {coluna.label}
                    </span>{' '}
                    <span className="w-5 h-5 rounded-full bg-[#F7FAF5] border border-[#A8C3A0]/40 text-[#2F6B4F] text-[10px] font-bold flex items-center justify-center">
                      {cardsNaColuna.length}
                    </span>
                  </div>
                </div>

                {/* Lista de Cartões Arrasta/Solta */}
                <div className="space-y-3 pt-3 flex-1">
                  {cardsNaColuna.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-[#A8C3A0]/30 rounded-xl flex items-center justify-center text-[11px] text-[#5E6E64] text-center p-3">
                      Arraste um cartão para cá
                    </div>
                  ) : (
                    cardsNaColuna.map((card) => {
                      const checklist: ItemChecklist[] = card.checklist_json
                        ? JSON.parse(card.checklist_json)
                        : []
                      const totalChecklist = checklist.length
                      const concluidosChecklist = checklist.filter((i) => i.concluido).length
                      const totalAnexos = Array.isArray(card.anexos) ? card.anexos.length : 0

                      return (
                        <div
                          key={card.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, card.id)}
                          onClick={() => handleAbrirDetalhes(card)}
                          className="group bg-white rounded-xl p-3.5 border border-[#A8C3A0]/30 hover:border-[#2F6B4F] shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                card.prioridade === 'Urgente'
                                  ? 'bg-rose-100 text-rose-800'
                                  : card.prioridade === 'Alta'
                                    ? 'bg-amber-100 text-amber-800'
                                    : card.prioridade === 'Baixa'
                                      ? 'bg-slate-100 text-slate-700'
                                      : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {card.prioridade || 'Média'}
                            </span>
                            <span className="text-[10px] text-[#5E6E64] font-medium truncate max-w-[120px]">
                              {card.loja.replace(' (SP)', '')}
                            </span>
                          </div>

                          <h4 className="font-semibold text-sm text-[#1D2B25] group-hover:text-[#2F6B4F] transition-colors line-clamp-2 leading-snug">
                            {card.titulo}
                          </h4>

                          {card.cliente_nome && (
                            <p className="text-[11px] text-[#2F6B4F] font-medium flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span className="truncate">{card.cliente_nome}</span>
                            </p>
                          )}

                          {card.descricao && (
                            <p className="text-[11px] text-[#5E6E64] line-clamp-2 leading-relaxed">
                              {card.descricao}
                            </p>
                          )}

                          {/* Rodapé do Cartão: Checklist, Anexos e Prazo */}
                          <div className="pt-2 border-t border-[#EAF2E8] flex items-center justify-between text-[10px] text-[#5E6E64]">
                            <div className="flex items-center gap-2">
                              {totalChecklist > 0 && (
                                <span
                                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono ${
                                    concluidosChecklist === totalChecklist
                                      ? 'bg-emerald-100 text-emerald-800 font-bold'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  <CheckSquare className="w-3 h-3" />
                                  <span>
                                    {concluidosChecklist}/{totalChecklist}
                                  </span>
                                </span>
                              )}

                              {totalAnexos > 0 && (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                                  <Paperclip className="w-3 h-3" />
                                  <span>{totalAnexos}</span>
                                </span>
                              )}
                            </div>

                            {card.data_limite && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{card.data_limite}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Detalhes do Cartão (com upload de novos anexos e download) */}
      <Dialog open={modalDetalheAberto} onOpenChange={setModalDetalheAberto}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          {cartaoDetalhe && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center justify-between pr-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#EAF2E8] text-[#2F6B4F]">
                    {cartaoDetalhe.coluna}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleExcluirCartao(cartaoDetalhe.id)}
                    className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                </div>
                <DialogTitle className="font-semibold text-xl text-[#1D2B25] text-left pt-1">
                  {cartaoDetalhe.titulo}
                </DialogTitle>{' '}
              </DialogHeader>

              {/* Metadados */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/30 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#5E6E64] block">
                    Cliente
                  </span>
                  {cartaoDetalhe.cliente ? (
                    <Link
                      to={`/clientes/${cartaoDetalhe.cliente}`}
                      className="text-[#2F6B4F] font-semibold hover:underline flex items-center gap-1"
                    >
                      <span className="truncate">{cartaoDetalhe.cliente_nome || 'Ver ficha'}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </Link>
                  ) : (
                    <span className="text-[#1D2B25]">{cartaoDetalhe.cliente_nome || 'Geral'}</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[#5E6E64] block">Loja</span>
                  <span className="font-semibold text-[#1D2B25]">{cartaoDetalhe.loja}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[#5E6E64] block">
                    Responsável
                  </span>
                  <span className="font-semibold text-[#1D2B25]">{cartaoDetalhe.responsavel}</span>
                </div>
              </div>

              {/* Descrição */}
              {cartaoDetalhe.descricao && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-[#1D2B25] uppercase tracking-wider block">
                    Descrição & Orientações
                  </span>
                  <p className="text-xs text-[#1D2B25] bg-[#F7FAF5] p-3 rounded-xl border border-[#A8C3A0]/30 leading-relaxed">
                    {cartaoDetalhe.descricao}
                  </p>
                </div>
              )}

              {/* Checklist Interativo */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#1D2B25] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-[#2F6B4F]" />
                  <span>Checklist de Atendimento</span>
                </span>

                <div className="space-y-1.5">
                  {(cartaoDetalhe.checklist_json
                    ? (JSON.parse(cartaoDetalhe.checklist_json) as ItemChecklist[])
                    : []
                  ).map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-[#F7FAF5] border border-[#A8C3A0]/20 text-xs cursor-pointer hover:bg-[#EAF2E8]/40"
                    >
                      <input
                        type="checkbox"
                        checked={item.concluido}
                        onChange={() => handleToggleChecklist(item.id)}
                        className="rounded text-[#2F6B4F] focus:ring-[#2F6B4F] w-4 h-4"
                      />
                      <span
                        className={item.concluido ? 'line-through text-gray-400' : 'text-[#1D2B25]'}
                      >
                        {item.texto}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Adicionar item ao checklist */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={novoItemChecklist}
                    onChange={(e) => setNovoItemChecklist(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAdicionarItemChecklist()
                      }
                    }}
                    placeholder="Adicionar tarefa ao checklist..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#F7FAF5] border border-[#A8C3A0]/40 text-xs focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                  />
                  <button
                    type="button"
                    onClick={handleAdicionarItemChecklist}
                    className="px-3 py-1.5 rounded-lg bg-[#2F6B4F] text-white text-xs font-semibold"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Bloco de Anexos (Arquivos, Projetos, Fotos) */}
              <div className="space-y-2 pt-2 border-t border-[#EAF2E8]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1D2B25] uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#2F6B4F]" />
                    <span>Anexos do Cartão ({cartaoDetalhe.anexos?.length || 0})</span>
                  </span>
                </div>

                {/* Lista de Anexos Existentes */}
                {cartaoDetalhe.anexos && cartaoDetalhe.anexos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cartaoDetalhe.anexos.map((fileName) => {
                      const url = getUrlAnexo(cartaoDetalhe, fileName)
                      const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName)

                      return (
                        <div
                          key={fileName}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/40 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-[#2F6B4F] shrink-0" />
                            <span className="truncate text-xs font-medium text-[#1D2B25]">
                              {fileName}
                            </span>
                          </div>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-md bg-white border border-[#A8C3A0]/30 hover:bg-[#EAF2E8] text-[#2F6B4F] shrink-0"
                            title="Visualizar ou Baixar arquivo"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#5E6E64] italic">Nenhum anexo salvo neste cartão.</p>
                )}

                {/* Adicionar novos anexos direto na ficha */}
                <div className="p-3 rounded-xl bg-[#F7FAF5] border border-dashed border-[#A8C3A0]/60 space-y-2">
                  <span className="text-[11px] font-semibold text-[#1D2B25] block">
                    Adicionar mais arquivos ao cartão:
                  </span>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          setNovosAnexos(Array.from(e.target.files))
                        }
                      }}
                      className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-full file:border-0 file:text-[11px] file:font-semibold file:bg-[#2F6B4F] file:text-white"
                    />
                    {novosAnexos.length > 0 && (
                      <button
                        type="button"
                        onClick={handleUploadNovosAnexos}
                        disabled={salvandoDetalhe}
                        className="w-full sm:w-auto px-3.5 py-1.5 rounded-full bg-[#2F6B4F] text-white text-xs font-semibold shrink-0"
                      >
                        {salvandoDetalhe ? 'Enviando...' : `Salvar ${novosAnexos.length} anexo(s)`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
