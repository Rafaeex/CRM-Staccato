import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Kanban,
  Plus,
  Paperclip,
  CheckSquare,
  MessageSquare,
  Calendar,
  Building2,
  User,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Loader2,
  FileText,
  Download,
  Send,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react'
import {
  getCartoesKanban,
  moverCartaoKanban,
  atualizarCartaoKanban,
  excluirCartaoKanban,
  adicionarComentario,
  getUrlAnexo,
  COLUNAS_KANBAN,
} from '@/services/kanban'
import { criarReclamacao, reabrirReclamacao, cancelarReclamacao } from '@/services/reclamacoes'
import { listarEventosPorCaso } from '@/services/casoEventos'
import { listarClientes } from '@/services/clientes'
import { getUsuarioAtualInfo } from '@/services/permissoes'
import type {
  CartaoKanban,
  ColunaSac,
  Cliente,
  ItemChecklist,
  CasoEvento,
  TipoOcorrencia,
  GravidadeOcorrencia,
} from '@/types/crm'
import { LOJAS } from '@/data/boutiqueData'
import { useToast } from '@/hooks/use-toast'
import { ModalResolverCaso } from '@/components/ModalResolverCaso'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export const COLUNAS_SAC_CONFIG: {
  id: ColunaSac
  label: string
  descricao: string
}[] = [
  { id: 'NOVOS', label: 'NOVOS', descricao: 'Ocorrências recém-abertas' },
  { id: 'EM TRATAMENTO', label: 'EM TRATAMENTO', descricao: 'Em atendimento ativo pelo SAC' },
  { id: 'RETORNO DA LOJA', label: 'RETORNO DA LOJA', descricao: 'Aguardando retorno da unidade' },
  {
    id: 'ANALISE DIRETORIA',
    label: 'ANALISE DIRETORIA',
    descricao: 'Avaliação de alçada da diretoria',
  },
  { id: 'A PAGAR', label: 'A PAGAR', descricao: 'Aguardando pagamento / reembolso' },
  { id: 'COMPRAS', label: 'COMPRAS', descricao: 'Pedido de reposição em compras' },
  { id: 'AT', label: 'AT', descricao: 'Assistência Técnica' },
  { id: 'COLETA/ENTREGA', label: 'COLETA/ENTREGA', descricao: 'Logística de troca / coleta' },
  { id: 'RESOLVIDO', label: 'RESOLVIDO', descricao: 'Casos finalizados com sucesso' },
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
  const [filtroGravidade, setFiltroGravidade] = useState<string>('todas')

  // Drag state
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<ColunaSac | null>(null)

  // Modal Resolver Caso (exigência B4)
  const [casoParaResolver, setCasoParaResolver] = useState<CartaoKanban | null>(null)
  const [modalResolverAberto, setModalResolverAberto] = useState(false)

  // Modal Novo Caso / Ocorrência
  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [formNovo, setFormNovo] = useState<{
    codigo: string
    cliente: string
    loja: string
    tipo: TipoOcorrencia
    gravidade: GravidadeOcorrencia
    descricao: string
    coluna: ColunaSac
    prazo_interno: string
    checklistTexto: string
  }>({
    codigo: '',
    cliente: '',
    loja: userInfo.loja || LOJAS[0].nome,
    tipo: 'outro',
    gravidade: 'media',
    descricao: '',
    coluna: 'NOVOS',
    prazo_interno: new Date().toISOString().split('T')[0],
    checklistTexto: '',
  })

  // Modal Detalhes / Edição de Ocorrência
  const [cartaoDetalhe, setCartaoDetalhe] = useState<CartaoKanban | null>(null)
  const [modalDetalheAberto, setModalDetalheAberto] = useState(false)
  const [eventosCaso, setEventosCaso] = useState<CasoEvento[]>([])
  const [carregandoEventos, setCarregandoEventos] = useState(false)
  const [novoItemChecklist, setNovoItemChecklist] = useState('')
  const [novoComentarioTexto, setNovoComentarioTexto] = useState('')
  const [abaModal, setAbaModal] = useState<'geral' | 'checklist' | 'eventos' | 'anexos'>('geral')

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [cList, cliList] = await Promise.all([getCartoesKanban(filtroLoja), listarClientes()])
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
  }, [filtroLoja])

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCardId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, col: ColunaSac) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverCol !== col) {
      setDragOverCol(col)
    }
  }

  const handleDragLeave = () => {
    setDragOverCol(null)
  }

  const handleDrop = async (e: React.DragEvent, destinoColuna: ColunaSac) => {
    e.preventDefault()
    setDragOverCol(null)
    const cardId = draggedCardId || e.dataTransfer.getData('text/plain')
    if (!cardId) return

    const card = cartoes.find((c) => c.id === cardId)
    if (!card || card.lista_quadro === destinoColuna) return

    // B4: Mover para RESOLVIDO exige desfecho preenchido e confirmação em modal
    if (destinoColuna === 'RESOLVIDO') {
      setCasoParaResolver(card)
      setModalResolverAberto(true)
      setDraggedCardId(null)
      return
    }

    // Atualização otimista
    const anterior = [...cartoes]
    setCartoes((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, lista_quadro: destinoColuna } : c)),
    )

    try {
      const atualizado = await moverCartaoKanban(cardId, destinoColuna)
      setCartoes((prev) => prev.map((c) => (c.id === cardId ? atualizado : c)))
      toast({
        title: 'Ocorrência movida',
        description: `Transferida para "${destinoColuna}".`,
      })
    } catch (err) {
      console.error('Erro ao mover cartão:', err)
      setCartoes(anterior)
      toast({
        title: 'Erro ao mover ocorrência',
        description: 'Não foi possível salvar a alteração.',
        variant: 'destructive',
      })
    } finally {
      setDraggedCardId(null)
    }
  }

  // Resolução com confirmação de modal
  const handleConfirmarResolucao = async (desfecho: string) => {
    if (!casoParaResolver) return
    const cardId = casoParaResolver.id

    const anterior = [...cartoes]
    setCartoes((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, lista_quadro: 'RESOLVIDO', status: 'resolvida', desfecho } : c,
      ),
    )

    try {
      const atualizado = await moverCartaoKanban(cardId, 'RESOLVIDO', desfecho)
      setCartoes((prev) => prev.map((c) => (c.id === cardId ? atualizado : c)))
      if (cartaoDetalhe?.id === cardId) {
        setCartaoDetalhe(atualizado)
        carregarEventos(cardId)
      }
      toast({
        title: 'Ocorrência resolvida com sucesso',
        description: `Desfecho registrado e movida para RESOLVIDO.`,
      })
    } catch (err) {
      console.error(err)
      setCartoes(anterior)
      toast({
        title: 'Falha ao resolver ocorrência',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
      throw err
    } finally {
      setCasoParaResolver(null)
    }
  }

  // Criar ocorrência
  const handleCriarCartao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNovo.cliente) {
      toast({
        title: 'Cliente obrigatório',
        description: 'Selecione o cliente da ocorrência.',
        variant: 'destructive',
      })
      return
    }
    if (!formNovo.descricao.trim()) {
      toast({
        title: 'Descrição obrigatória',
        description: 'Informe os detalhes da ocorrência.',
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

      const criada = await criarReclamacao({
        codigo: formNovo.codigo.trim() || undefined,
        cliente: formNovo.cliente,
        cliente_nome: cliSel ? cliSel.nome : undefined,
        cliente_telefone: cliSel ? cliSel.telefone : undefined,
        loja: formNovo.loja,
        tipo: formNovo.tipo,
        gravidade: formNovo.gravidade,
        descricao: formNovo.descricao.trim(),
        lista_quadro: formNovo.coluna,
        status: formNovo.coluna === 'RESOLVIDO' ? 'resolvida' : 'aberta',
        prazo_interno: formNovo.prazo_interno,
        checklist: checklistItems,
      })

      setCartoes((prev) => [criada, ...prev])
      setModalNovoAberto(false)
      setFormNovo({
        codigo: '',
        cliente: '',
        loja: userInfo.loja || LOJAS[0].nome,
        tipo: 'outro',
        gravidade: 'media',
        descricao: '',
        coluna: 'NOVOS',
        prazo_interno: new Date().toISOString().split('T')[0],
        checklistTexto: '',
      })

      toast({
        title: 'Ocorrência criada',
        description: `Registrada na coluna "${criada.lista_quadro}".`,
      })
    } catch (err) {
      console.error('Erro ao criar ocorrência:', err)
      toast({
        title: 'Falha ao criar ocorrência',
        description: 'Verifique os dados preenchidos.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Carregar eventos de auditoria do caso
  const carregarEventos = async (casoId: string) => {
    setCarregandoEventos(true)
    try {
      const lista = await listarEventosPorCaso(casoId)
      setEventosCaso(lista)
    } catch (err) {
      console.error(err)
    } finally {
      setCarregandoEventos(false)
    }
  }

  // Abrir detalhes da ocorrência
  const handleAbrirDetalhes = (c: CartaoKanban) => {
    setCartaoDetalhe(c)
    setNovoItemChecklist('')
    setNovoComentarioTexto('')
    setAbaModal('geral')
    setModalDetalheAberto(true)
    carregarEventos(c.id)
  }

  // Toggle checklist
  const handleToggleChecklist = async (itemId: string) => {
    if (!cartaoDetalhe) return
    const itens: ItemChecklist[] = Array.isArray(cartaoDetalhe.checklist)
      ? [...cartaoDetalhe.checklist]
      : []

    const atualizados = itens.map((item) =>
      item.id === itemId ? { ...item, concluido: !item.concluido } : item,
    )

    setCartaoDetalhe({ ...cartaoDetalhe, checklist: atualizados })
    setCartoes((prev) =>
      prev.map((c) => (c.id === cartaoDetalhe.id ? { ...c, checklist: atualizados } : c)),
    )

    try {
      await atualizarCartaoKanban(cartaoDetalhe.id, { checklist: atualizados })
    } catch (err) {
      console.error(err)
    }
  }

  // Adicionar item checklist
  const handleAdicionarItemChecklist = async () => {
    if (!cartaoDetalhe || !novoItemChecklist.trim()) return
    const itens: ItemChecklist[] = Array.isArray(cartaoDetalhe.checklist)
      ? [...cartaoDetalhe.checklist]
      : []

    const novo: ItemChecklist = {
      id: String(Date.now()),
      texto: novoItemChecklist.trim(),
      concluido: false,
    }
    const atualizados = [...itens, novo]

    setCartaoDetalhe({ ...cartaoDetalhe, checklist: atualizados })
    setCartoes((prev) =>
      prev.map((c) => (c.id === cartaoDetalhe.id ? { ...c, checklist: atualizados } : c)),
    )
    setNovoItemChecklist('')

    try {
      await atualizarCartaoKanban(cartaoDetalhe.id, { checklist: atualizados })
    } catch (err) {
      console.error(err)
    }
  }

  // Adicionar comentário/evento
  const handleAdicionarComentario = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!cartaoDetalhe || !novoComentarioTexto.trim()) return

    const texto = novoComentarioTexto.trim()
    setNovoComentarioTexto('')

    try {
      await adicionarComentario(cartaoDetalhe.id, userInfo.name || 'Atendente', texto)
      await carregarEventos(cartaoDetalhe.id)
      toast({
        title: 'Registro adicionado',
        description: 'Evento gravado no histórico da ocorrência.',
      })
    } catch (err) {
      console.error('Erro ao adicionar comentário:', err)
      toast({
        title: 'Falha ao salvar evento',
        variant: 'destructive',
      })
    }
  }

  // Reabrir caso (B4: permitido para gestor/sac)
  const handleReabrir = async () => {
    if (!cartaoDetalhe) return
    const motivo = prompt('Informe o motivo da reabertura desta ocorrência:')
    if (!motivo || !motivo.trim()) return

    try {
      const atualizado = await reabrirReclamacao(cartaoDetalhe.id, motivo.trim())
      setCartaoDetalhe(atualizado)
      setCartoes((prev) => prev.map((c) => (c.id === atualizado.id ? atualizado : c)))
      await carregarEventos(atualizado.id)
      toast({
        title: 'Ocorrência reaberta',
        description: 'Status alterado para em tratamento.',
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao reabrir ocorrência',
        variant: 'destructive',
      })
    }
  }

  // Cancelar caso (B4: preferindo cancelamento a apagar)
  const handleCancelarCaso = async () => {
    if (!cartaoDetalhe) return
    const motivo = prompt('Informe o motivo do cancelamento da ocorrência:')
    if (!motivo || !motivo.trim()) return

    try {
      const atualizado = await cancelarReclamacao(cartaoDetalhe.id, motivo.trim())
      setCartaoDetalhe(atualizado)
      setCartoes((prev) => prev.map((c) => (c.id === atualizado.id ? atualizado : c)))
      await carregarEventos(atualizado.id)
      toast({
        title: 'Ocorrência cancelada',
        description: 'Status atualizado para cancelada.',
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao cancelar ocorrência',
        variant: 'destructive',
      })
    }
  }

  // Excluir ocorrência (B4: botão Excluir visível apenas para gestor)
  const handleExcluirCartao = async (id: string) => {
    if (!userInfo.isGestor) {
      toast({
        title: 'Ação restrita',
        description: 'Apenas gestores podem excluir ocorrências.',
        variant: 'destructive',
      })
      return
    }
    if (
      !confirm(
        'ATENÇÃO: Recomenda-se cancelar a ocorrência em vez de apagá-la. Deseja realmente excluir permanentemente?',
      )
    )
      return
    const sucesso = await excluirCartaoKanban(id)
    if (sucesso) {
      setCartoes((prev) => prev.filter((c) => c.id !== id))
      setModalDetalheAberto(false)
      toast({
        title: 'Ocorrência excluída',
        description: 'Registro removido permanentemente.',
      })
    }
  }

  // Filtragem dos cartões
  const cartoesFiltrados = useMemo(() => {
    return cartoes.filter((c) => {
      if (userInfo.isAtendente && userInfo.loja) {
        if (!c.loja.toLowerCase().includes(userInfo.loja.toLowerCase())) {
          return false
        }
      } else if (filtroLoja !== 'todas') {
        if (!c.loja.toLowerCase().includes(filtroLoja.toLowerCase())) {
          return false
        }
      }

      if (filtroGravidade !== 'todas') {
        const grav = (c.gravidade || '').toLowerCase()
        if (grav !== filtroGravidade.toLowerCase()) return false
      }

      if (busca) {
        const b = busca.toLowerCase()
        const matchCodigo = (c.codigo || '').toLowerCase().includes(b)
        const matchCli = (c.cliente_nome || '').toLowerCase().includes(b)
        const matchDesc = (c.descricao || '').toLowerCase().includes(b)
        const matchResp = (c.responsavel || '').toLowerCase().includes(b)
        if (!matchCodigo && !matchCli && !matchDesc && !matchResp) return false
      }

      return true
    })
  }, [cartoes, userInfo, filtroLoja, filtroGravidade, busca])

  // Métricas compactas calculadas
  const totalCartoes = cartoesFiltrados.length
  const totalResolvidos = cartoesFiltrados.filter((c) => c.lista_quadro === 'RESOLVIDO').length
  const taxaConclusao = totalCartoes > 0 ? Math.round((totalResolvidos / totalCartoes) * 100) : 0

  const urgentesOuAltos = cartoesFiltrados.filter(
    (c) =>
      c.lista_quadro !== 'RESOLVIDO' &&
      ((c.gravidade || '').toLowerCase() === 'urgente' ||
        (c.gravidade || '').toLowerCase() === 'alta'),
  ).length

  return (
    <div className="space-y-4">
      {/* Topo Sóbrio */}
      <div className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2F6B4F] flex items-center gap-1.5">
            <Kanban className="w-3.5 h-3.5" />
            Quadro Operacional de Atendimento (SAC)
          </span>
          <h1 className="font-semibold text-2xl text-[#1D2B25] tracking-tight mt-0.5">
            Quadro de Ocorrências — 9 Colunas
          </h1>
          <p className="text-xs text-[#5E6E64] mt-0.5">
            Visualização unificada de ocorrências com fluxo de resolução, desfecho obrigatório e
            auditoria por eventos.
          </p>
        </div>

        {/* Indicadores estáticos sóbrios */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30">
            <span className="px-2 py-0.5 rounded-md bg-[#EAF2E8] border border-[#A8C3A0]/40 text-xs font-bold text-[#2F6B4F] font-mono">
              {taxaConclusao}%
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#5E6E64]">
                Conclusão
              </span>
              <span className="text-xs font-medium text-[#1D2B25]">
                {totalResolvidos} de {totalCartoes}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30">
            <span
              className={`px-2 py-0.5 rounded-md text-xs font-bold font-mono ${
                urgentesOuAltos > 0
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {urgentesOuAltos}
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#5E6E64]">
                Alta / Urgente
              </span>
              <span className="text-xs font-medium text-[#5E6E64]">
                {urgentesOuAltos} em aberto
              </span>
            </div>
          </div>
        </div>

        {/* Botão Nova Ocorrência */}
        <Dialog open={modalNovoAberto} onOpenChange={setModalNovoAberto}>
          <DialogTrigger asChild>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors">
              <Plus className="w-4 h-4 text-[#A8C3A0]" />
              <span>Nova Ocorrência</span>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-semibold text-xl text-[#1D2B25]">
                Nova Ocorrência (SAC)
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCriarCartao} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Código do Caso
                  </label>
                  <input
                    type="text"
                    value={formNovo.codigo}
                    onChange={(e) => setFormNovo({ ...formNovo, codigo: e.target.value })}
                    placeholder="Ex.: VIOL-100050 (ou auto)"
                    className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Cliente *
                  </label>
                  <select
                    required
                    value={formNovo.cliente}
                    onChange={(e) => setFormNovo({ ...formNovo, cliente: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                  >
                    <option value="">Selecione o cliente...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} ({c.loja_origem})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Tipo
                  </label>
                  <select
                    value={formNovo.tipo}
                    onChange={(e) =>
                      setFormNovo({ ...formNovo, tipo: e.target.value as TipoOcorrencia })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                  >
                    <option value="devolucao">Devolução</option>
                    <option value="troca">Troca</option>
                    <option value="quebra_entrega">Quebra entrega</option>
                    <option value="quebra_posterior">Quebra posterior</option>
                    <option value="falta_item">Falta item</option>
                    <option value="atraso">Atraso</option>
                    <option value="AT_fornecedor">AT fornecedor</option>
                    <option value="tonalidade_lote">Tonalidade/lote</option>
                    <option value="erro_especificacao">Erro especificação</option>
                    <option value="reembolso">Reembolso</option>
                    <option value="documentacao">Documentação</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Gravidade
                  </label>
                  <select
                    value={formNovo.gravidade}
                    onChange={(e) =>
                      setFormNovo({
                        ...formNovo,
                        gravidade: e.target.value as GravidadeOcorrencia,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Coluna Inicial
                  </label>
                  <select
                    value={formNovo.coluna}
                    onChange={(e) =>
                      setFormNovo({ ...formNovo, coluna: e.target.value as ColunaSac })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs font-semibold text-[#2F6B4F]"
                  >
                    {COLUNAS_SAC_CONFIG.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Descrição da Ocorrência *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formNovo.descricao}
                  onChange={(e) => setFormNovo({ ...formNovo, descricao: e.target.value })}
                  placeholder="Detalhes da manifestação do cliente, peças envolvidas, contexto..."
                  className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Checklist Inicial (1 item por linha)
                </label>
                <textarea
                  rows={2}
                  value={formNovo.checklistTexto}
                  onChange={(e) => setFormNovo({ ...formNovo, checklistTexto: e.target.value })}
                  placeholder="Confirmar avaria com encarregado&#10;Solicitar corte ao marmorista"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs font-mono"
                />
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
                  className="px-5 py-2 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {salvando ? 'Criando...' : 'Abrir Ocorrência'}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-2xl p-4 border border-[#A8C3A0]/30 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#5E6E64] absolute left-3.5 top-3" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por código (LOJA-123456), cliente, descrição ou responsável..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/40 text-xs sm:text-sm text-[#1D2B25] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
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
                <option value="todas">Todas as Unidades</option>
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
              value={filtroGravidade}
              onChange={(e) => setFiltroGravidade(e.target.value)}
              className="bg-transparent text-xs text-[#1D2B25] focus:outline-none cursor-pointer"
            >
              <option value="todas">Todas as Gravidades</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Horizontal Rolável com as 9 Colunas Oficiais */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-2xl border border-[#A8C3A0]/30">
          <Loader2 className="w-8 h-8 animate-spin text-[#2F6B4F]" />
          <span className="text-xs font-medium text-[#5E6E64]">Carregando ocorrências...</span>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4 pt-1">
          <div className="flex items-start gap-3.5 min-w-max">
            {COLUNAS_SAC_CONFIG.map((coluna) => {
              const cardsNaColuna = cartoesFiltrados.filter((c) => c.lista_quadro === coluna.id)
              const isOver = dragOverCol === coluna.id

              return (
                <div
                  key={coluna.id}
                  onDragOver={(e) => handleDragOver(e, coluna.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, coluna.id)}
                  className={`w-[290px] shrink-0 bg-slate-50/70 rounded-2xl p-3 border transition-all flex flex-col min-h-[580px] shadow-xs ${
                    isOver
                      ? 'border-[#2F6B4F] bg-[#EAF2E8]/60 ring-2 ring-[#2F6B4F]/20'
                      : 'border-[#A8C3A0]/30 hover:border-[#A8C3A0]/60'
                  }`}
                >
                  {/* Cabeçalho da Coluna: NOME + CONTAGEM DISCRETA */}
                  <div className="flex items-center justify-between pb-2.5 px-1 border-b border-[#A8C3A0]/20">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-xs text-[#1D2B25] tracking-wide uppercase truncate">
                        {coluna.label}
                      </span>
                      <span className="text-xs font-bold text-[#5E6E64] font-mono ml-0.5">
                        {cardsNaColuna.length}
                      </span>
                    </div>

                    <span className="text-[10px] text-[#5E6E64]/70 font-medium">
                      {coluna.id === 'RESOLVIDO' ? 'Fim' : `${cardsNaColuna.length} caso(s)`}
                    </span>
                  </div>

                  {/* Lista de Ocorrências na Coluna */}
                  <div className="space-y-2.5 pt-2.5 flex-1 overflow-y-auto max-h-[72vh] pr-0.5">
                    {cardsNaColuna.length === 0 ? (
                      <div className="h-28 border border-dashed border-[#A8C3A0]/30 rounded-xl flex items-center justify-center text-[11px] text-[#5E6E64]/70 text-center p-3">
                        Arraste uma ocorrência para cá
                      </div>
                    ) : (
                      cardsNaColuna.map((card) => {
                        const checklist = Array.isArray(card.checklist) ? card.checklist : []
                        const totalChecklist = checklist.length
                        const concluidosChecklist = checklist.filter((i) => i.concluido).length
                        const totalAnexos = Array.isArray(card.anexos) ? card.anexos.length : 0

                        const gravLower = (card.gravidade || '').toLowerCase()
                        const isUrgente = gravLower === 'urgente'
                        const isAlta = gravLower === 'alta'

                        return (
                          <div
                            key={card.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, card.id)}
                            onClick={() => handleAbrirDetalhes(card)}
                            className="group bg-white rounded-xl p-3 border border-slate-200 hover:border-[#2F6B4F] shadow-xs hover:shadow-sm transition-all cursor-grab active:cursor-grabbing space-y-2"
                          >
                            {/* Linha superior: Código / Gravidade e Loja */}
                            <div className="flex items-center justify-between gap-1.5">
                              <span
                                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                  isUrgente
                                    ? 'bg-rose-100 text-rose-800'
                                    : isAlta
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {card.codigo || card.gravidade || 'Caso'}
                              </span>

                              <span className="text-[10px] text-[#5E6E64] font-medium truncate max-w-[120px]">
                                {card.loja.replace(' (SP)', '')}
                              </span>
                            </div>

                            {/* Cliente Vinculado */}
                            <p className="text-[11px] text-[#2F6B4F] font-medium flex items-center gap-1 truncate">
                              <User className="w-3 h-3 shrink-0" />
                              <span className="truncate">{card.cliente_nome || 'Sem cliente'}</span>
                            </p>

                            {/* Descrição resumida */}
                            <p className="text-[11px] text-[#1D2B25] line-clamp-2 leading-relaxed">
                              {card.descricao}
                            </p>

                            {/* Rodapé com Badges estáticos */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#5E6E64]">
                              <div className="flex items-center gap-2 flex-wrap">
                                {totalChecklist > 0 && (
                                  <span
                                    title={`Checklist: ${concluidosChecklist} de ${totalChecklist} concluídos`}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-mono font-medium"
                                  >
                                    <CheckSquare className="w-3 h-3" />
                                    <span>
                                      {concluidosChecklist}/{totalChecklist}
                                    </span>
                                  </span>
                                )}

                                {totalAnexos > 0 && (
                                  <span
                                    title={`${totalAnexos} anexo(s)`}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium"
                                  >
                                    <Paperclip className="w-3 h-3 text-[#5E6E64]" />
                                    <span>{totalAnexos}</span>
                                  </span>
                                )}
                              </div>

                              {card.prazo_interno && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-[#5E6E64]">
                                  <Calendar className="w-3 h-3 text-[#5E6E64]" />
                                  <span>
                                    {card.prazo_interno.split('T')[0].split('-').slice(1).join('/')}
                                  </span>
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
        </div>
      )}

      {/* Modal Detalhes do Caso com abas */}
      <Dialog open={modalDetalheAberto} onOpenChange={setModalDetalheAberto}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          {cartaoDetalhe && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#2F6B4F] bg-[#EAF2E8] px-2 py-0.5 rounded">
                      {cartaoDetalhe.codigo || 'CASO'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {cartaoDetalhe.lista_quadro}
                    </span>
                  </div>

                  {userInfo.isGestor && (
                    <button
                      type="button"
                      onClick={() => handleExcluirCartao(cartaoDetalhe.id)}
                      className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  )}
                </div>

                <DialogTitle className="font-semibold text-lg text-[#1D2B25] text-left pt-2">
                  {cartaoDetalhe.cliente_nome || 'Ocorrência'} — {cartaoDetalhe.loja}
                </DialogTitle>
              </DialogHeader>

              {/* Metadados rápidos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30 text-xs">
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
                  <span className="text-[10px] uppercase font-bold text-[#5E6E64] block">
                    Status
                  </span>
                  <span className="font-semibold text-[#1D2B25]">{cartaoDetalhe.status}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[#5E6E64] block">
                    Gravidade
                  </span>
                  <span className="font-semibold text-[#1D2B25]">{cartaoDetalhe.gravidade}</span>
                </div>
              </div>

              {/* Desfecho registrado se resolvido */}
              {cartaoDetalhe.desfecho && (
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      Desfecho de Resolução:
                    </span>
                    {cartaoDetalhe.resolvida_em && (
                      <span className="text-[10px] text-emerald-700">
                        {new Date(cartaoDetalhe.resolvida_em).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-line">{cartaoDetalhe.desfecho}</p>
                </div>
              )}

              {/* Navegação por Abas */}
              <div className="flex border-b border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setAbaModal('geral')}
                  className={`px-3 py-2 font-semibold border-b-2 transition-colors ${
                    abaModal === 'geral'
                      ? 'border-[#2F6B4F] text-[#2F6B4F]'
                      : 'border-transparent text-[#5E6E64] hover:text-[#1D2B25]'
                  }`}
                >
                  Descrição
                </button>
                <button
                  type="button"
                  onClick={() => setAbaModal('checklist')}
                  className={`px-3 py-2 font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                    abaModal === 'checklist'
                      ? 'border-[#2F6B4F] text-[#2F6B4F]'
                      : 'border-transparent text-[#5E6E64] hover:text-[#1D2B25]'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>
                    Checklist (
                    {Array.isArray(cartaoDetalhe.checklist) ? cartaoDetalhe.checklist.length : 0})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAbaModal('eventos')}
                  className={`px-3 py-2 font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                    abaModal === 'eventos'
                      ? 'border-[#2F6B4F] text-[#2F6B4F]'
                      : 'border-transparent text-[#5E6E64] hover:text-[#1D2B25]'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Eventos ({eventosCaso.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAbaModal('anexos')}
                  className={`px-3 py-2 font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                    abaModal === 'anexos'
                      ? 'border-[#2F6B4F] text-[#2F6B4F]'
                      : 'border-transparent text-[#5E6E64] hover:text-[#1D2B25]'
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Anexos ({cartaoDetalhe.anexos?.length || 0})</span>
                </button>
              </div>

              {/* Aba 1: Geral */}
              {abaModal === 'geral' && (
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-[#1D2B25] uppercase tracking-wider block mb-1">
                      Descrição & Orientações
                    </span>
                    <p className="text-xs text-[#1D2B25] bg-[#F7FAF5] p-3 rounded-xl border border-[#A8C3A0]/30 leading-relaxed whitespace-pre-line">
                      {cartaoDetalhe.descricao}
                    </p>
                  </div>

                  {/* Ações de Transição */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
                    {cartaoDetalhe.lista_quadro !== 'RESOLVIDO' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCasoParaResolver(cartaoDetalhe)
                          setModalResolverAberto(true)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolver Caso</span>
                      </button>
                    ) : (
                      (userInfo.isGestor || userInfo.isSac) && (
                        <button
                          type="button"
                          onClick={handleReabrir}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reabrir Ocorrência</span>
                        </button>
                      )
                    )}

                    {cartaoDetalhe.status !== 'cancelada' && (
                      <button
                        type="button"
                        onClick={handleCancelarCaso}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Cancelar Caso</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Aba 2: Checklist */}
              {abaModal === 'checklist' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    {!cartaoDetalhe.checklist || cartaoDetalhe.checklist.length === 0 ? (
                      <p className="text-xs text-[#5E6E64] italic py-2">
                        Nenhum item de checklist cadastrado para este caso.
                      </p>
                    ) : (
                      cartaoDetalhe.checklist.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-2.5 p-2 rounded-lg bg-[#F7FAF5] border border-[#A8C3A0]/20 text-xs cursor-pointer hover:bg-[#EAF2E8]/40"
                        >
                          <input
                            type="checkbox"
                            checked={item.concluido}
                            onChange={() => handleToggleChecklist(item.id)}
                            className="rounded text-[#2F6B4F] focus:ring-[#2F6B4F] w-4 h-4"
                          />
                          <span
                            className={
                              item.concluido ? 'line-through text-slate-400' : 'text-[#1D2B25]'
                            }
                          >
                            {item.texto}
                          </span>
                        </label>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
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
                      className="px-3.5 py-1.5 rounded-lg bg-[#2F6B4F] text-white text-xs font-semibold"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              )}

              {/* Aba 3: Eventos do Caso */}
              {abaModal === 'eventos' && (
                <div className="space-y-3">
                  <form onSubmit={handleAdicionarComentario} className="space-y-2">
                    <textarea
                      rows={2}
                      value={novoComentarioTexto}
                      onChange={(e) => setNovoComentarioTexto(e.target.value)}
                      placeholder="Registrar anotação ou atualização técnica deste caso..."
                      className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/40 text-xs text-[#1D2B25] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!novoComentarioTexto.trim()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold disabled:opacity-40"
                      >
                        <Send className="w-3 h-3" />
                        <span>Adicionar Evento</span>
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2 pt-2 border-t border-slate-100 max-h-[35vh] overflow-y-auto pr-1">
                    {carregandoEventos ? (
                      <div className="py-4 text-center text-xs text-[#5E6E64]">
                        Carregando eventos...
                      </div>
                    ) : eventosCaso.length === 0 ? (
                      <p className="text-xs text-[#5E6E64] italic py-2 text-center">
                        Nenhum evento registrado ainda.
                      </p>
                    ) : (
                      eventosCaso.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-2.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-[#1D2B25]">
                              {ev.autor_nome || ev.expand?.autor?.name || 'Sistema'}
                              <span className="ml-1.5 text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                                {ev.tipo}
                              </span>
                            </span>
                            <span className="text-[10px] text-[#5E6E64]">
                              {new Date(ev.created).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {ev.texto && (
                            <p className="text-[#1D2B25] leading-relaxed whitespace-pre-line text-[11px]">
                              {ev.texto}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Aba 4: Anexos */}
              {abaModal === 'anexos' && (
                <div className="space-y-3">
                  {cartaoDetalhe.anexos && cartaoDetalhe.anexos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cartaoDetalhe.anexos.map((fileName) => {
                        const url = getUrlAnexo(cartaoDetalhe, fileName)
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
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[#5E6E64] italic">
                      Nenhum arquivo anexado a esta ocorrência.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Resolver Caso */}
      <ModalResolverCaso
        open={modalResolverAberto}
        onOpenChange={setModalResolverAberto}
        codigoCaso={casoParaResolver?.codigo}
        tituloCaso={casoParaResolver?.cliente_nome || casoParaResolver?.descricao}
        onConfirmar={handleConfirmarResolucao}
      />
    </div>
  )
}
