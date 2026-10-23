import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  AlertCircle,
  Plus,
  Search,
  Building2,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
  Trash2,
  Loader2,
  ExternalLink,
  MessageSquare,
  FileText,
  Paperclip,
  SlidersHorizontal,
} from 'lucide-react'
import {
  listarReclamacoes,
  criarReclamacao,
  atualizarReclamacao,
  resolverReclamacao,
  excluirReclamacao,
  getUrlAnexoReclamacao,
} from '@/services/reclamacoes'
import { listarTrelloListas } from '@/services/trelloListas'
import { listarClientes } from '@/services/clientes'
import { getUsuarioAtualInfo } from '@/services/permissoes'
import { LOJAS } from '@/data/boutiqueData'
import type {
  Reclamacao,
  Cliente,
  CanalReclamacao,
  CategoriaReclamacao,
  GravidadeReclamacao,
  StatusReclamacao,
  TrelloLista,
} from '@/types/crm'
import { useToast } from '@/hooks/use-toast'
import { IndicadorSla } from '@/components/IndicadorSla'
import { ModalConfiguracaoSla } from '@/components/ModalConfiguracaoSla'
import {
  calcularPrazoPorGravidade,
  listarConfiguracoesSla,
  SLA_PADRAO_DIAS_UTEIS,
} from '@/services/sla'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const STATUS_LIST: StatusReclamacao[] = ['Aberta', 'Em tratamento', 'Resolvida']
const CANAIS: CanalReclamacao[] = ['WhatsApp', 'Telefone', 'Loja', 'E-mail']
const CATEGORIAS: CategoriaReclamacao[] = [
  'Produto com defeito',
  'Atraso na entrega',
  'Atendimento',
  'Troca/devolução',
  'Cobrança',
  'Outro',
]
const GRAVIDADES: GravidadeReclamacao[] = ['Baixa', 'Média', 'Alta', 'Urgente']

const STATUS_PRODUTO_OPCOES = [
  'Material ainda na obra / em posse do cliente',
  'Material com a transportadora / em transporte',
  'Material no CD Staccato',
  'Material na loja',
  'Outro',
]

const SOLICITACOES_DESEJO_OPCOES = [
  'Substituição do produto',
  'Crédito para novo pedido',
  'Reembolso financeiro',
  'Assistência técnica',
  'Personalizar',
]

export default function ReclamacoesPage() {
  const { toast } = useToast()
  const userInfo = getUsuarioAtualInfo()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [reclamacoes, setReclamacoes] = useState<Reclamacao[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [listasTrello, setListasTrello] = useState<TrelloLista[]>([])

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todas')
  const [filtroLoja, setFiltroLoja] = useState<string>(
    userInfo.isAtendente && userInfo.loja ? userInfo.loja : 'todas',
  )
  const [filtroGravidade, setFiltroGravidade] = useState<string>('todas')
  const [filtroLista, setFiltroLista] = useState<string>('todas')

  // Modais e SLA
  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [modalSlaAberto, setModalSlaAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [reclamacaoSelecionada, setReclamacaoSelecionada] = useState<Reclamacao | null>(null)
  const [modalDetalheAberto, setModalDetalheAberto] = useState(false)
  const [mapaSlaDias, setMapaSlaDias] =
    useState<Record<GravidadeReclamacao, number>>(SLA_PADRAO_DIAS_UTEIS)

  // Formulário Nova Ocorrência (SAC) com campos exatos do Trello
  const [form, setForm] = useState<{
    numero_pedido: string
    cliente: string
    cliente_nome: string
    cliente_telefone: string
    contato_tratar_nome: string
    contato_tratar_telefone: string
    contato_tratar_email: string
    loja: string
    canal_origem: CanalReclamacao
    categoria: CategoriaReclamacao
    descricao: string
    produtos_envolvidos: string
    status_produto: string
    produto_instalado: string
    solicitacao_desejo: string
    gravidade: GravidadeReclamacao
    responsavel: string
    prazo_resolucao: string
    status: StatusReclamacao
    lista_quadro: string
    anexos: File[]
  }>({
    numero_pedido: '',
    cliente: '',
    cliente_nome: '',
    cliente_telefone: '',
    contato_tratar_nome: '',
    contato_tratar_telefone: '',
    contato_tratar_email: '',
    loja: userInfo.loja || LOJAS[0].nome,
    canal_origem: 'WhatsApp',
    categoria: 'Produto com defeito',
    descricao: '',
    produtos_envolvidos: '',
    status_produto: 'Material ainda na obra / em posse do cliente',
    produto_instalado: 'NÃO',
    solicitacao_desejo: 'Substituição do produto',
    gravidade: 'Média',
    responsavel: userInfo.name,
    prazo_resolucao: calcularPrazoPorGravidade('Média', SLA_PADRAO_DIAS_UTEIS),
    status: 'Aberta',
    lista_quadro: 'RAFAEL - SAC',
    anexos: [],
  })

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [rList, cList, tList, configsSla] = await Promise.all([
        listarReclamacoes(),
        listarClientes(),
        listarTrelloListas(),
        listarConfiguracoesSla(),
      ])
      setReclamacoes(rList)
      setClientes(cList)
      setListasTrello(tList)

      const mapa: Record<GravidadeReclamacao, number> = { ...SLA_PADRAO_DIAS_UTEIS }
      configsSla.forEach((c) => {
        if (c.gravidade) {
          mapa[c.gravidade] = c.dias_uteis
        }
      })
      setMapaSlaDias(mapa)
    } catch (err) {
      console.error('Falha ao carregar dados:', err)
      toast({
        title: 'Erro ao carregar Ocorrências',
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

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('novo') === 'true') {
      setModalNovoAberto(true)
    }
  }, [location.search])

  const handleClienteChange = (clienteId: string) => {
    const sel = clientes.find((c) => c.id === clienteId)
    if (sel) {
      setForm((prev) => ({
        ...prev,
        cliente: sel.id,
        cliente_nome: sel.nome,
        cliente_telefone: sel.telefone || '',
        loja: sel.loja_origem || prev.loja,
        contato_tratar_nome: prev.contato_tratar_nome || sel.nome,
        contato_tratar_telefone: prev.contato_tratar_telefone || sel.telefone || '',
        contato_tratar_email: prev.contato_tratar_email || sel.email || '',
      }))
    }
  }

  const handleCriarReclamacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.cliente_nome.trim() || !form.descricao.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o cliente e a descrição da ocorrência.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const criada = await criarReclamacao({
        cliente: form.cliente || undefined,
        cliente_nome: form.cliente_nome.trim(),
        cliente_telefone: form.cliente_telefone.trim() || undefined,
        loja: form.loja,
        canal_origem: form.canal_origem,
        categoria: form.categoria,
        descricao: form.descricao.trim(),
        gravidade: form.gravidade,
        responsavel: form.responsavel,
        prazo_resolucao: form.prazo_resolucao,
        status: form.status,
        numero_pedido: form.numero_pedido.trim() || undefined,
        contato_tratar_nome: form.contato_tratar_nome.trim() || undefined,
        contato_tratar_telefone: form.contato_tratar_telefone.trim() || undefined,
        contato_tratar_email: form.contato_tratar_email.trim() || undefined,
        produtos_envolvidos: form.produtos_envolvidos.trim() || undefined,
        status_produto: form.status_produto || undefined,
        produto_instalado: form.produto_instalado || undefined,
        solicitacao_desejo: form.solicitacao_desejo || undefined,
        lista_quadro: form.lista_quadro || 'RAFAEL - SAC',
        anexos: form.anexos.length > 0 ? form.anexos : undefined,
      })

      setReclamacoes((prev) => [criada, ...prev])
      setModalNovoAberto(false)

      setForm({
        numero_pedido: '',
        cliente: '',
        cliente_nome: '',
        cliente_telefone: '',
        contato_tratar_nome: '',
        contato_tratar_telefone: '',
        contato_tratar_email: '',
        loja: userInfo.loja || LOJAS[0].nome,
        canal_origem: 'WhatsApp',
        categoria: 'Produto com defeito',
        descricao: '',
        produtos_envolvidos: '',
        status_produto: 'Material ainda na obra / em posse do cliente',
        produto_instalado: 'NÃO',
        solicitacao_desejo: 'Substituição do produto',
        gravidade: 'Média',
        responsavel: userInfo.name,
        prazo_resolucao: calcularPrazoPorGravidade('Média', mapaSlaDias),
        status: 'Aberta',
        lista_quadro: 'RAFAEL - SAC',
        anexos: [],
      })

      toast({
        title: 'Ocorrência registrada',
        description: `Ocorrência de ${criada.cliente_nome} aberta com sucesso.`,
      })
    } catch (err) {
      console.error('Falha ao registrar ocorrência:', err)
      toast({
        title: 'Erro ao registrar',
        description: 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleResolverReclamacao = async (reclamacao: Reclamacao) => {
    try {
      const atualizada = await resolverReclamacao(
        reclamacao.id,
        reclamacao.resolucao_desfecho || 'Ocorrência atendida e finalizada com sucesso.',
      )
      setReclamacoes((prev) => prev.map((r) => (r.id === reclamacao.id ? atualizada : r)))
      if (reclamacaoSelecionada?.id === reclamacao.id) {
        setReclamacaoSelecionada(atualizada)
      }
      toast({
        title: 'Ocorrência resolvida!',
        description: `Ocorrência de ${reclamacao.cliente_nome} marcada como resolvida.`,
      })
    } catch (err) {
      console.error('Erro ao resolver:', err)
      toast({
        title: 'Erro ao resolver ocorrência',
        variant: 'destructive',
      })
    }
  }

  const handleMoverParaLista = async (reclamacaoId: string, novaLista: string) => {
    try {
      const atualizada = await atualizarReclamacao(reclamacaoId, { lista_quadro: novaLista })
      setReclamacoes((prev) => prev.map((r) => (r.id === reclamacaoId ? atualizada : r)))
      if (reclamacaoSelecionada?.id === reclamacaoId) {
        setReclamacaoSelecionada(atualizada)
      }
      toast({
        title: 'Card estacionado',
        description: `Movido para "${novaLista}".`,
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Falha ao mover cartão',
        variant: 'destructive',
      })
    }
  }

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta ocorrência?')) return
    const ok = await excluirReclamacao(id)
    if (ok) {
      setReclamacoes((prev) => prev.filter((r) => r.id !== id))
      setModalDetalheAberto(false)
      toast({
        title: 'Ocorrência excluída',
      })
    }
  }

  // Filtragem
  const reclamacoesFiltradas = useMemo(() => {
    return reclamacoes.filter((r) => {
      if (userInfo.isComercial) {
        const cadastradoPorEle =
          r.responsavel?.toLowerCase().includes(userInfo.name.toLowerCase()) ||
          userInfo.name.toLowerCase().includes(r.responsavel?.toLowerCase() || '')
        const mesmaLoja =
          userInfo.loja && r.loja.toLowerCase().includes(userInfo.loja.toLowerCase())
        if (!cadastradoPorEle && !mesmaLoja) return false
      }

      if (userInfo.isAtendente && userInfo.loja) {
        if (!r.loja.toLowerCase().includes(userInfo.loja.toLowerCase())) {
          return false
        }
      } else if (filtroLoja !== 'todas') {
        if (!r.loja.toLowerCase().includes(filtroLoja.toLowerCase())) {
          return false
        }
      }

      if (filtroStatus !== 'todas' && r.status !== filtroStatus) return false
      if (filtroGravidade !== 'todas' && r.gravidade !== filtroGravidade) return false
      if (filtroLista !== 'todas' && (r.lista_quadro || 'RAFAEL - SAC') !== filtroLista)
        return false

      if (busca) {
        const b = busca.toLowerCase()
        const matchCliente = r.cliente_nome.toLowerCase().includes(b)
        const matchDesc = r.descricao.toLowerCase().includes(b)
        const matchPedido = r.numero_pedido?.toLowerCase().includes(b) || false
        const matchContato = r.contato_tratar_nome?.toLowerCase().includes(b) || false
        if (!matchCliente && !matchDesc && !matchPedido && !matchContato) return false
      }

      return true
    })
  }, [reclamacoes, userInfo, filtroLoja, filtroStatus, filtroGravidade, filtroLista, busca])

  // Contadores
  const totalAbertas = reclamacoes.filter((r) => r.status === 'Aberta').length
  const totalEmTratamento = reclamacoes.filter((r) => r.status === 'Em tratamento').length
  const totalResolvidas = reclamacoes.filter((r) => r.status === 'Resolvida').length

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2F6B4F] flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            SAC Boutique de Revestimentos
          </span>
          <h1 className="font-semibold text-2xl sm:text-3xl text-[#1D2B25] tracking-tight mt-1">
            Gestão de Ocorrências (SAC)
          </h1>
          <p className="text-xs sm:text-sm text-[#5E6E64] mt-0.5">
            Registro estruturado de ocorrências e manifestações com colunas Trello por responsável.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {userInfo.isGestor && (
            <button
              onClick={() => setModalSlaAberto(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F7FAF5] hover:bg-[#EAF2E8] text-[#2F6B4F] text-xs sm:text-sm font-semibold border border-[#A8C3A0]/40 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#2F6B4F]" />
              <span>Configurar SLAs</span>
            </button>
          )}

          <Dialog open={modalNovoAberto} onOpenChange={setModalNovoAberto}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors">
                <Plus className="w-4 h-4 text-[#A8C3A0]" />
                <span>Nova Ocorrência SAC</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-semibold text-xl text-[#1D2B25]">
                  Abertura de Ocorrência (SAC - Modelo Trello)
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCriarReclamacao} className="space-y-4 pt-1">
                {/* Título do Card: Pedido LOJA-123456 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Número do Pedido (LOJA-123456) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: LOJA-0123456"
                      value={form.numero_pedido}
                      onChange={(e) => setForm({ ...form, numero_pedido: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Coluna / Responsável Trello
                    </label>
                    <select
                      value={form.lista_quadro}
                      onChange={(e) => setForm({ ...form, lista_quadro: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm font-semibold text-[#2F6B4F] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    >
                      {listasTrello.map((l) => (
                        <option key={l.id} value={l.nome}>
                          {l.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dados do Cliente */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Vincular Cliente
                    </label>
                    <select
                      value={form.cliente}
                      onChange={(e) => handleClienteChange(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    >
                      <option value="">Selecione ou digite abaixo...</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} ({c.loja_origem})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Nome do Cliente *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nome exatamente igual ao sistema"
                      value={form.cliente_nome}
                      onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    />
                  </div>
                </div>

                {/* COM QUEM TRATAR O SAC */}
                <div className="p-3.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#1D2B25] block">
                    Com quem tratar o SAC (Arquiteto / Cliente / Responsável)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Nome do responsável"
                      value={form.contato_tratar_nome}
                      onChange={(e) => setForm({ ...form, contato_tratar_nome: e.target.value })}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#A8C3A0]/40 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Telefone (XX) XXXXX-XXXX"
                      value={form.contato_tratar_telefone}
                      onChange={(e) =>
                        setForm({ ...form, contato_tratar_telefone: e.target.value })
                      }
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#A8C3A0]/40 text-xs"
                    />
                    <input
                      type="email"
                      placeholder="E-mail de contato"
                      value={form.contato_tratar_email}
                      onChange={(e) => setForm({ ...form, contato_tratar_email: e.target.value })}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#A8C3A0]/40 text-xs"
                    />
                  </div>
                </div>

                {/* DESCRIÇÃO DA OCORRÊNCIA */}
                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Descrição da Ocorrência *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Descrever de forma objetiva: contexto da venda, entrega/instalação, manifestação do cliente e ações já tomadas."
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                  />
                </div>

                {/* PRODUTOS ENVOLVIDOS */}
                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Produtos Envolvidos (Código e Descrição igual ao sistema)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: CÓDIGO - DESCRIÇÃO DO PRODUTO"
                    value={form.produtos_envolvidos}
                    onChange={(e) => setForm({ ...form, produtos_envolvidos: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                  />
                </div>

                {/* STATUS DO PRODUTO & PRODUTO JÁ INSTALADO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Status do Produto (Marcar uma)
                    </label>
                    <select
                      value={form.status_produto}
                      onChange={(e) => setForm({ ...form, status_produto: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    >
                      {STATUS_PRODUTO_OPCOES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Produto já instalado?
                    </label>
                    <div className="flex gap-4 pt-2">
                      <label className="inline-flex items-center gap-1.5 text-xs text-[#1D2B25] cursor-pointer">
                        <input
                          type="radio"
                          name="produto_instalado"
                          value="SIM"
                          checked={form.produto_instalado === 'SIM'}
                          onChange={(e) => setForm({ ...form, produto_instalado: e.target.value })}
                          className="text-[#2F6B4F] focus:ring-[#2F6B4F]"
                        />
                        <span>SIM</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-xs text-[#1D2B25] cursor-pointer">
                        <input
                          type="radio"
                          name="produto_instalado"
                          value="NÃO"
                          checked={form.produto_instalado === 'NÃO'}
                          onChange={(e) => setForm({ ...form, produto_instalado: e.target.value })}
                          className="text-[#2F6B4F] focus:ring-[#2F6B4F]"
                        />
                        <span>NÃO</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* SOLICITAÇÃO / DESEJO */}
                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Solicitação / Desejo do Cliente
                  </label>
                  <select
                    value={form.solicitacao_desejo}
                    onChange={(e) => setForm({ ...form, solicitacao_desejo: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                  >
                    {SOLICITACOES_DESEJO_OPCOES.map((sol) => (
                      <option key={sol} value={sol}>
                        {sol}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Metadados Operacionais (Loja, Gravidade, Prazo) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Loja
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider">
                        Gravidade
                      </label>
                      <span className="text-[10px] text-[#5E6E64]">
                        SLA: {mapaSlaDias[form.gravidade] ?? SLA_PADRAO_DIAS_UTEIS[form.gravidade]}d
                        úteis
                      </span>
                    </div>
                    <select
                      value={form.gravidade}
                      onChange={(e) => {
                        const novaGravidade = e.target.value as GravidadeReclamacao
                        const novoPrazo = calcularPrazoPorGravidade(novaGravidade, mapaSlaDias)
                        setForm({
                          ...form,
                          gravidade: novaGravidade,
                          prazo_resolucao: novoPrazo,
                        })
                      }}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    >
                      {GRAVIDADES.map((g) => (
                        <option key={g} value={g}>
                          {g} ({mapaSlaDias[g] ?? SLA_PADRAO_DIAS_UTEIS[g]}d úteis)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider">
                        Prazo Calculado
                      </label>
                      <span className="text-[10px] text-[#2F6B4F] font-medium">
                        Dias úteis seg-sex
                      </span>
                    </div>
                    <input
                      type="date"
                      value={form.prazo_resolucao}
                      onChange={(e) => setForm({ ...form, prazo_resolucao: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    />
                  </div>
                </div>

                {/* Anexos */}
                <div className="p-3.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30 space-y-1 text-xs">
                  <span className="font-semibold text-[#1D2B25] block">
                    Anexos (Obrigatório fotos e/ou vídeos comprobatórios)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files) {
                        setForm({ ...form, anexos: Array.from(e.target.files) })
                      }
                    }}
                    className="w-full text-xs text-[#5E6E64] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#EAF2E8] file:text-[#2F6B4F]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#EAF2E8]">
                  <button
                    type="button"
                    onClick={() => setModalNovoAberto(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5E6E64] hover:bg-[#F7FAF5]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando}
                    className="px-5 py-2 rounded-xl bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-2"
                  >
                    {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Abrir Ocorrência</span>
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#A8C3A0]/30 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#5E6E64] tracking-wider">
            1. Abertas
          </span>
          <p className="text-2xl font-semibold text-[#1D2B25] mt-1">{totalAbertas}</p>
          <span className="text-[11px] text-[#5E6E64] mt-0.5">Aguardando análise</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#A8C3A0]/30 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#5E6E64] tracking-wider">
            2. Em Tratamento
          </span>
          <p className="text-2xl font-semibold text-amber-700 mt-1">{totalEmTratamento}</p>
          <span className="text-[11px] text-amber-700/80 mt-0.5">Em tratativa com áreas</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#A8C3A0]/30 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#5E6E64] tracking-wider">
            3. Resolvidas
          </span>
          <p className="text-2xl font-semibold text-[#2F6B4F] mt-1">{totalResolvidas}</p>
          <span className="text-[11px] text-[#2F6B4F] mt-0.5">Casos solucionados</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-2xl p-4 border border-[#A8C3A0]/30 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#5E6E64]" />
            <input
              type="text"
              placeholder="Buscar por cliente, pedido (LOJA-123456), responsável ou conteúdo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <select
              value={filtroLista}
              onChange={(e) => setFiltroLista(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs text-[#1D2B25] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
            >
              <option value="todas">Todas as Colunas Trello</option>
              {listasTrello.map((l) => (
                <option key={l.id} value={l.nome}>
                  {l.nome}
                </option>
              ))}
            </select>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs text-[#1D2B25] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
            >
              <option value="todas">Todos os status</option>
              {STATUS_LIST.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={filtroLoja}
              disabled={userInfo.isAtendente && Boolean(userInfo.loja)}
              onChange={(e) => setFiltroLoja(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs text-[#1D2B25] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] disabled:opacity-75"
            >
              <option value="todas">Todas as lojas</option>
              {LOJAS.map((l) => (
                <option key={l.id} value={l.nome}>
                  {l.nome}
                </option>
              ))}
            </select>

            <select
              value={filtroGravidade}
              onChange={(e) => setFiltroGravidade(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs text-[#1D2B25] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
            >
              <option value="todas">Todas as gravidades</option>
              {GRAVIDADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Ocorrências */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#A8C3A0]/30">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#2F6B4F]" />
          <p className="text-xs text-[#5E6E64] mt-2">Carregando ocorrências do SAC...</p>
        </div>
      ) : reclamacoesFiltradas.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#A8C3A0]/30 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-[#5E6E64]/40" />
          <h3 className="text-sm font-semibold text-[#1D2B25]">Nenhuma ocorrência encontrada</h3>
          <p className="text-xs text-[#5E6E64]">
            Ajuste os filtros de busca ou abra uma nova ocorrência SAC.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reclamacoesFiltradas.map((r) => {
            const isAberta = r.status !== 'Resolvida'
            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 hover:border-[#2F6B4F]/40 shadow-xs transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {r.numero_pedido && (
                      <span className="font-bold text-sm text-[#1D2B25] font-mono">
                        {r.numero_pedido}
                      </span>
                    )}
                    <span className="font-semibold text-sm text-[#1D2B25]">{r.cliente_nome}</span>

                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      Coluna: {r.lista_quadro || 'RAFAEL - SAC'}
                    </span>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        r.status === 'Resolvida'
                          ? 'bg-[#EAF2E8] text-[#2F6B4F]'
                          : r.status === 'Em tratamento'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {r.status}
                    </span>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        r.gravidade === 'Urgente'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200 font-bold'
                          : r.gravidade === 'Alta'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : r.gravidade === 'Média'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-[#EAF2E8] text-[#2F6B4F] border border-[#A8C3A0]/40'
                      }`}
                    >
                      Gravidade: {r.gravidade}
                    </span>

                    {/* Indicador discreto de SLA */}
                    {r.prazo_resolucao && (
                      <IndicadorSla
                        prazoResolucao={r.prazo_resolucao}
                        dataResolucao={r.data_resolucao}
                        status={r.status}
                        compacto={true}
                      />
                    )}
                  </div>

                  <p className="text-xs text-[#5E6E64] line-clamp-2">{r.descricao}</p>

                  <div className="flex items-center gap-3 text-xs text-[#5E6E64] flex-wrap">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-[#2F6B4F]" />
                      {r.loja}
                    </span>
                    <span>•</span>
                    <span>Origem: {r.canal_origem}</span>
                    {r.solicitacao_desejo && (
                      <>
                        <span>•</span>
                        <span className="text-[#2F6B4F] font-medium">
                          Desejo: {r.solicitacao_desejo}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span>Resp: {r.responsavel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                  <button
                    onClick={() => {
                      setReclamacaoSelecionada(r)
                      setModalDetalheAberto(true)
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#F7FAF5] hover:bg-[#EAF2E8] text-xs font-semibold text-[#2F6B4F] border border-[#A8C3A0]/40"
                  >
                    Ver Detalhes
                  </button>
                  {isAberta && (
                    <button
                      onClick={() => handleResolverReclamacao(r)}
                      className="px-3 py-1.5 rounded-xl bg-[#2F6B4F] hover:bg-[#25563F] text-xs font-semibold text-white shadow-xs flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#A8C3A0]" />
                      <span>Resolver</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Detalhes SAC */}
      <Dialog open={modalDetalheAberto} onOpenChange={setModalDetalheAberto}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          {reclamacaoSelecionada && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="font-bold text-xl text-[#1D2B25] font-mono">
                      {reclamacaoSelecionada.numero_pedido || 'Ocorrência SAC'}
                    </DialogTitle>
                    <span className="text-xs text-[#5E6E64]">
                      Cliente: <strong>{reclamacaoSelecionada.cliente_nome}</strong>
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      reclamacaoSelecionada.status === 'Resolvida'
                        ? 'bg-[#EAF2E8] text-[#2F6B4F]'
                        : reclamacaoSelecionada.status === 'Em tratamento'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {reclamacaoSelecionada.status}
                  </span>
                </div>
              </DialogHeader>

              {/* Mover de Coluna direto no modal */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30 text-xs">
                <span className="text-[#5E6E64] font-medium">Estacionar na coluna:</span>
                <select
                  value={reclamacaoSelecionada.lista_quadro || 'RAFAEL - SAC'}
                  onChange={(e) => handleMoverParaLista(reclamacaoSelecionada.id, e.target.value)}
                  className="px-2 py-1 rounded bg-white border border-[#A8C3A0]/40 font-semibold text-[#2F6B4F]"
                >
                  {listasTrello.map((l) => (
                    <option key={l.id} value={l.nome}>
                      {l.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30 space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-[#5E6E64]">Loja:</span>
                    <p className="font-semibold text-[#1D2B25]">{reclamacaoSelecionada.loja}</p>
                  </div>
                  <div>
                    <span className="text-[#5E6E64]">Canal Origem:</span>
                    <p className="font-semibold text-[#1D2B25]">
                      {reclamacaoSelecionada.canal_origem}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#5E6E64]">Prazo Resolução (SLA):</span>
                    <div className="mt-0.5">
                      {reclamacaoSelecionada.prazo_resolucao ? (
                        <IndicadorSla
                          prazoResolucao={reclamacaoSelecionada.prazo_resolucao}
                          dataResolucao={reclamacaoSelecionada.data_resolucao}
                          status={reclamacaoSelecionada.status}
                          compacto={false}
                        />
                      ) : (
                        <p className="font-semibold text-[#1D2B25]">Não definido</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Com quem tratar */}
                {(reclamacaoSelecionada.contato_tratar_nome ||
                  reclamacaoSelecionada.contato_tratar_telefone ||
                  reclamacaoSelecionada.contato_tratar_email) && (
                  <div className="pt-2 border-t border-[#A8C3A0]/20 space-y-1">
                    <span className="text-[#5E6E64] font-semibold">Com quem tratar o SAC:</span>
                    <p className="text-[#1D2B25]">
                      Nome: {reclamacaoSelecionada.contato_tratar_nome || 'Não informado'} • Tel:{' '}
                      {reclamacaoSelecionada.contato_tratar_telefone || 'Não informado'} • E-mail:{' '}
                      {reclamacaoSelecionada.contato_tratar_email || 'Não informado'}
                    </p>
                  </div>
                )}

                {/* Descrição */}
                <div className="pt-2 border-t border-[#A8C3A0]/20 space-y-1">
                  <span className="text-[#5E6E64] font-semibold">Descrição da Ocorrência:</span>
                  <p className="text-[#1D2B25] whitespace-pre-line leading-relaxed">
                    {reclamacaoSelecionada.descricao}
                  </p>
                </div>

                {/* Produtos Envolvidos */}
                {reclamacaoSelecionada.produtos_envolvidos && (
                  <div className="pt-2 border-t border-[#A8C3A0]/20 space-y-1">
                    <span className="text-[#5E6E64] font-semibold">Produtos Envolvidos:</span>
                    <p className="text-[#1D2B25]">{reclamacaoSelecionada.produtos_envolvidos}</p>
                  </div>
                )}

                {/* Status do Material & Solicitação */}
                <div className="pt-2 border-t border-[#A8C3A0]/20 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[#5E6E64]">Status do Produto:</span>
                    <p className="font-semibold text-[#1D2B25]">
                      {reclamacaoSelecionada.status_produto || 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#5E6E64]">Produto já Instalado?</span>
                    <p className="font-semibold text-[#1D2B25]">
                      {reclamacaoSelecionada.produto_instalado || 'NÃO'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#5E6E64]">Solicitação / Desejo do Cliente:</span>
                    <p className="font-semibold text-[#2F6B4F]">
                      {reclamacaoSelecionada.solicitacao_desejo || 'Substituição do produto'}
                    </p>
                  </div>
                </div>

                {/* Anexos */}
                {reclamacaoSelecionada.anexos && reclamacaoSelecionada.anexos.length > 0 && (
                  <div className="pt-2 border-t border-[#A8C3A0]/20 space-y-1">
                    <span className="text-[#5E6E64] font-semibold flex items-center gap-1">
                      <Paperclip className="w-3 h-3 text-[#2F6B4F]" />
                      Anexos Comprobatórios ({reclamacaoSelecionada.anexos.length})
                    </span>
                    <div className="flex gap-2 flex-wrap pt-1">
                      {reclamacaoSelecionada.anexos.map((anexo, idx) => (
                        <a
                          key={idx}
                          href={getUrlAnexoReclamacao(reclamacaoSelecionada, anexo)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-[#A8C3A0]/40 text-[11px] text-[#2F6B4F] hover:bg-[#EAF2E8]"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Anexo {idx + 1}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rodapé Ações */}
              <div className="flex items-center justify-between pt-2 border-t border-[#EAF2E8]">
                {userInfo.isGestor ? (
                  <button
                    onClick={() => handleExcluir(reclamacaoSelecionada.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  {reclamacaoSelecionada.status !== 'Resolvida' && (
                    <button
                      onClick={() => handleResolverReclamacao(reclamacaoSelecionada)}
                      className="px-4 py-2 rounded-xl bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold"
                    >
                      Marcar como Resolvida
                    </button>
                  )}
                  <button
                    onClick={() => setModalDetalheAberto(false)}
                    className="px-4 py-2 rounded-xl bg-[#F7FAF5] text-xs font-semibold text-[#5E6E64]"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Configuração de SLA por Gravidade */}
      <ModalConfiguracaoSla
        open={modalSlaAberto}
        onOpenChange={setModalSlaAberto}
        onSalvo={carregarDados}
      />
    </div>
  )
}
