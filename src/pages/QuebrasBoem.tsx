import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  FileWarning,
  Plus,
  Search,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UploadCloud,
  FileText,
  FileCheck2,
  Loader2,
  Download,
  Trash2,
  Paperclip,
  Kanban,
  ListFilter,
  Check,
  AlertCircle,
  HelpCircle,
  X,
  ChevronDown,
} from 'lucide-react'
import {
  listarQuebrasBoem,
  criarQuebraBoem,
  atualizarQuebraBoem,
  resolverQuebraBoem,
  excluirQuebraBoem,
  getUrlAnexoQuebra,
  buscarQuebraPorTrelloId,
} from '@/services/quebrasBoem'
import {
  listarReclamacoes,
  criarReclamacao,
  atualizarReclamacao,
  buscarReclamacaoPorTrelloId,
} from '@/services/reclamacoes'
import {
  listarTrelloListas,
  criarTrelloLista,
  garantirListasTrello,
  excluirTrelloLista,
} from '@/services/trelloListas'
import {
  parseTrelloJSON,
  type ResultadoParseTrello,
  type TrelloCardParsedGeral,
} from '@/services/trelloImporter'
import { listarClientes } from '@/services/clientes'
import { getUsuarioAtualInfo } from '@/services/permissoes'
import { LOJAS } from '@/data/boutiqueData'
import type {
  QuebraBoem,
  Cliente,
  StatusQuebra,
  ResponsabilidadeQuebra,
  ResultadoBoem,
  ItemProdutoQuebra,
  TrelloLista,
} from '@/types/crm'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const STATUS_LIST: StatusQuebra[] = ['Registro', 'Em análise', 'Resolvida']
const RESPONSABILIDADES: ResponsabilidadeQuebra[] = [
  'Transportadora',
  'Fábrica / Fornecedor',
  'Armazém / Expedição',
  'Cliente / Obra',
  'Instalação / Assentamento',
  'Em apuração',
]
const LOCAIS_OCORRENCIA = [
  'Produto já chegou avariado do fornecedor',
  'Movimentação no CD',
  'Identificado na entrega',
  'Identificado posterior a entrega',
]
const ACOES_ADOTADAS = ['Reposição de material', 'Crédito cliente gerado', 'Outro']
const RESULTADOS_BOEM: ResultadoBoem[] = [
  'Pendente',
  'Procedente (Reposição Autorizada)',
  'Procedente (Reembolso / Crédito)',
  'Improcedente',
  'Acordo Comercial',
]

// Checklist visual das evidências obrigatórias
const EVIDENCIAS_OBRIGATORIAS = [
  { id: 'etiqueta', label: 'Foto da etiqueta de identificação da caixa' },
  { id: 'lote', label: 'Foto do lote do produto (quando houver)' },
  { id: 'avaria_1', label: '1 foto aproximada da avaria' },
  { id: 'avaria_2', label: '1 foto distante mostrando o contexto (caixa / palete)' },
  { id: 'nf', label: 'Nota fiscal emitida ao consumidor' },
]

export default function QuebrasBoemPage() {
  const { toast } = useToast()
  const userInfo = getUsuarioAtualInfo()
  const location = useLocation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [quebras, setQuebras] = useState<QuebraBoem[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [listasQuadro, setListasQuadro] = useState<TrelloLista[]>([])

  // Visualização: Kanban por Listas do Trello (pessoas/áreas) vs Tabela/Lista
  const [modoVisualizacao, setModoVisualizacao] = useState<'kanban' | 'lista'>('kanban')

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroLista, setFiltroLista] = useState<string>('todas')
  const [filtroLoja, setFiltroLoja] = useState<string>(
    userInfo.isAtendente && userInfo.loja ? userInfo.loja : 'todas',
  )
  const [filtroResponsabilidade, setFiltroResponsabilidade] = useState<string>('todas')

  // Modais
  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [modalImportadorAberto, setModalImportadorAberto] = useState(false)
  const [modalGerenciarListas, setModalGerenciarListas] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [quebraSelecionada, setQuebraSelecionada] = useState<QuebraBoem | null>(null)
  const [modalDetalheAberto, setModalDetalheAberto] = useState(false)
  const [novaListaNome, setNovaListaNome] = useState('')

  // Drag & drop no kanban
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [dragOverLista, setDragOverLista] = useState<string | null>(null)

  // Formulário Nova Quebra (com campos exatos do modelo)
  const [form, setForm] = useState<{
    numero_pedido: string
    nf_saida: string
    cliente: string
    cliente_nome: string
    loja: string
    data_ocorrencia: string
    lista_quadro: string
    itens_produtos: ItemProdutoQuebra[]
    entrega_entregador: string
    entrega_recebedor: string
    local_ocorrencia: string
    responsabilidade_apurada: ResponsabilidadeQuebra
    acao_adotada: string
    resultado_boem: ResultadoBoem
    status: StatusQuebra
    responsavel: string
    descricao_detalhada: string
    anexos: File[]
  }>({
    numero_pedido: '',
    nf_saida: '',
    cliente: '',
    cliente_nome: '',
    loja: userInfo.loja || LOJAS[0].nome,
    data_ocorrencia: new Date().toISOString().split('T')[0],
    lista_quadro: 'RAFAEL - SAC',
    itens_produtos: [
      {
        id: '1',
        codigo: '',
        descricao: '',
        lote: '',
        qtd_total: '',
        qtd_quebrada: '',
      },
    ],
    entrega_entregador: '',
    entrega_recebedor: '',
    local_ocorrencia: 'Identificado na entrega',
    responsabilidade_apurada: 'Em apuração',
    acao_adotada: 'Reposição de material',
    resultado_boem: 'Pendente',
    status: 'Registro',
    responsavel: userInfo.name,
    descricao_detalhada: '',
    anexos: [],
  })

  // Estado do Importador Trello
  const [importando, setImportando] = useState(false)
  const [previewImportacao, setPreviewImportacao] = useState<{
    arquivoNome: string
    resultado: ResultadoParseTrello
    quebrasJaExistentes: number
    sacJaExistentes: number
  } | null>(null)

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [qList, cList, lList] = await Promise.all([
        listarQuebrasBoem(),
        listarClientes(),
        listarTrelloListas(),
      ])

      // Se não houver listas salvas ainda, inicializar com as duas obrigatórias
      if (lList.length === 0) {
        const iniciadas = await garantirListasTrello(['RAFAEL - SAC', 'ALEXANDRE - DIRETORIA'])
        setListasQuadro(iniciadas)
      } else {
        setListasQuadro(lList)
      }

      setQuebras(qList)
      setClientes(cList)
    } catch (err) {
      console.error('Falha ao carregar dados:', err)
      toast({
        title: 'Erro ao carregar Quebras & BOEM',
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
        loja: sel.loja_origem || prev.loja,
      }))
    }
  }

  // Adicionar e remover linhas de produtos na ocorrência
  const handleAdicionarItemProduto = () => {
    setForm((prev) => ({
      ...prev,
      itens_produtos: [
        ...prev.itens_produtos,
        {
          id: String(Date.now()),
          codigo: '',
          descricao: '',
          lote: '',
          qtd_total: '',
          qtd_quebrada: '',
        },
      ],
    }))
  }

  const handleRemoverItemProduto = (index: number) => {
    if (form.itens_produtos.length <= 1) return
    setForm((prev) => ({
      ...prev,
      itens_produtos: prev.itens_produtos.filter((_, i) => i !== index),
    }))
  }

  const handleAtualizarItemProduto = (
    index: number,
    campo: keyof ItemProdutoQuebra,
    valor: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      itens_produtos: prev.itens_produtos.map((item, i) =>
        i === index ? { ...item, [campo]: valor } : item,
      ),
    }))
  }

  const handleCriarQuebra = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.numero_pedido.trim() || !form.cliente_nome.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o número do pedido e o cliente.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      // Resumo em texto dos produtos para compatibilidade
      const produtosResumo = form.itens_produtos
        .filter((p) => p.codigo || p.descricao)
        .map(
          (p) =>
            `${p.codigo ? `[${p.codigo}] ` : ''}${p.descricao || 'Item'}${
              p.qtd_quebrada ? ` (${p.qtd_quebrada} quebradas de ${p.qtd_total || '?'})` : ''
            }${p.lote ? ` - Lote: ${p.lote}` : ''}`,
        )
        .join('; ')

      const criada = await criarQuebraBoem({
        numero_pedido: form.numero_pedido.trim(),
        nf_saida: form.nf_saida.trim() || undefined,
        cliente: form.cliente || undefined,
        cliente_nome: form.cliente_nome.trim(),
        loja: form.loja,
        produtos_envolvidos: produtosResumo || undefined,
        produtos_itens_json: JSON.stringify(form.itens_produtos),
        entrega_entregador: form.entrega_entregador.trim() || undefined,
        entrega_recebedor: form.entrega_recebedor.trim() || undefined,
        local_ocorrencia: form.local_ocorrencia || undefined,
        responsabilidade_apurada: form.responsabilidade_apurada,
        acao_adotada: form.acao_adotada.trim() || undefined,
        resultado_boem: form.resultado_boem,
        status: form.status,
        lista_quadro: form.lista_quadro || 'RAFAEL - SAC',
        responsavel: form.responsavel,
        data_ocorrencia: form.data_ocorrencia,
        descricao_detalhada: form.descricao_detalhada.trim() || undefined,
        anexos: form.anexos.length > 0 ? form.anexos : undefined,
      })

      setQuebras((prev) => [criada, ...prev])
      setModalNovoAberto(false)

      // Reset
      setForm({
        numero_pedido: '',
        nf_saida: '',
        cliente: '',
        cliente_nome: '',
        loja: userInfo.loja || LOJAS[0].nome,
        data_ocorrencia: new Date().toISOString().split('T')[0],
        lista_quadro: listasQuadro[0]?.nome || 'RAFAEL - SAC',
        itens_produtos: [
          {
            id: '1',
            codigo: '',
            descricao: '',
            lote: '',
            qtd_total: '',
            qtd_quebrada: '',
          },
        ],
        entrega_entregador: '',
        entrega_recebedor: '',
        local_ocorrencia: 'Identificado na entrega',
        responsabilidade_apurada: 'Em apuração',
        acao_adotada: 'Reposição de material',
        resultado_boem: 'Pendente',
        status: 'Registro',
        responsavel: userInfo.name,
        descricao_detalhada: '',
        anexos: [],
      })

      toast({
        title: 'Quebra / BOEM registrada',
        description: `Ocorrência do pedido ${criada.numero_pedido} salva com sucesso.`,
      })
    } catch (err) {
      console.error('Falha ao criar quebra:', err)
      toast({
        title: 'Erro ao registrar',
        description: 'Verifique se os dados estão corretos.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleResolverQuebra = async (quebra: QuebraBoem) => {
    try {
      const atualizada = await resolverQuebraBoem(
        quebra.id,
        quebra.acao_adotada || 'Reposição de material concluída.',
        quebra.resultado_boem || 'Procedente (Reposição Autorizada)',
      )
      setQuebras((prev) => prev.map((q) => (q.id === quebra.id ? atualizada : q)))
      if (quebraSelecionada?.id === quebra.id) {
        setQuebraSelecionada(atualizada)
      }
      toast({
        title: 'Quebra resolvida!',
        description: `Pedido ${quebra.numero_pedido} marcado como Resolvido.`,
      })
    } catch (err) {
      console.error('Erro ao resolver:', err)
      toast({
        title: 'Erro ao resolver ocorrência',
        variant: 'destructive',
      })
    }
  }

  const handleMoverParaLista = async (quebraId: string, novaLista: string) => {
    try {
      const atualizada = await atualizarQuebraBoem(quebraId, { lista_quadro: novaLista })
      setQuebras((prev) => prev.map((q) => (q.id === quebraId ? atualizada : q)))
      if (quebraSelecionada?.id === quebraId) {
        setQuebraSelecionada(atualizada)
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
    if (!confirm('Deseja realmente excluir este registro de quebra/BOEM?')) return
    const ok = await excluirQuebraBoem(id)
    if (ok) {
      setQuebras((prev) => prev.filter((q) => q.id !== id))
      setModalDetalheAberto(false)
      toast({
        title: 'Registro excluído',
      })
    }
  }

  const handleCriarNovaLista = async () => {
    if (!novaListaNome.trim()) return
    try {
      const criada = await criarTrelloLista(novaListaNome.trim())
      setListasQuadro((prev) => [...prev, criada])
      setNovaListaNome('')
      toast({
        title: 'Lista adicionada ao Quadro',
        description: `Coluna "${criada.nome}" criada com sucesso.`,
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao criar lista',
        variant: 'destructive',
      })
    }
  }

  const handleExcluirLista = async (listaId: string) => {
    if (listasQuadro.length <= 1) {
      toast({
        title: 'Quadro precisa ter ao menos uma lista',
        variant: 'destructive',
      })
      return
    }
    if (!confirm('Deseja remover esta coluna do quadro?')) return
    const ok = await excluirTrelloLista(listaId)
    if (ok) {
      setListasQuadro((prev) => prev.filter((l) => l.id !== listaId))
      toast({ title: 'Coluna removida' })
    }
  }

  // LEITURA DO JSON TRELLO COM IDEMPOTÊNCIA
  const handleSelecionarArquivoTrello = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const jsonText = event.target?.result as string
        const trelloData = JSON.parse(jsonText)
        const resultado = parseTrelloJSON(trelloData)

        // Verificar cartões já existentes para exibir na prévia
        let quebrasExistentesCount = 0
        let sacExistentesCount = 0

        for (const q of resultado.quebras) {
          const jaTem = quebras.some(
            (item) =>
              (item.origem_trello_id && item.origem_trello_id === q.id) ||
              item.numero_pedido === q.numero_pedido,
          )
          if (jaTem) quebrasExistentesCount++
        }

        setPreviewImportacao({
          arquivoNome: file.name,
          resultado,
          quebrasJaExistentes: quebrasExistentesCount,
          sacJaExistentes: sacExistentesCount,
        })
      } catch (err) {
        console.error('Erro ao ler JSON:', err)
        toast({
          title: 'Arquivo JSON inválido',
          description: 'Certifique-se de que é o arquivo original do Trello.',
          variant: 'destructive',
        })
      }
    }
    reader.readAsText(file)
  }

  // CONFIRMAÇÃO DA IMPORTAÇÃO IDEMPOTENTE
  const handleConfirmarImportacao = async () => {
    if (!previewImportacao) return
    setImportando(true)

    let quebrasCriadas = 0
    let quebrasAtualizadas = 0
    let sacCriados = 0
    let sacAtualizados = 0

    try {
      // 1. Garantir que as listas do Trello existam no CRM
      const nomesListas = previewImportacao.resultado.listasEncontradas
        .map((l) => l.name)
        .filter((n) => !n.toUpperCase().includes('EXEMPLO'))
      if (nomesListas.length > 0) {
        const listasAtualizadas = await garantirListasTrello(nomesListas)
        setListasQuadro(listasAtualizadas)
      }

      // 2. Importar / Atualizar Quebras
      for (const card of previewImportacao.resultado.quebras) {
        const clienteCorrespondente = clientes.find((c) =>
          card.cliente_nome
            ? c.nome.toLowerCase().includes(card.cliente_nome.toLowerCase())
            : false,
        )

        let lojaSugerida = userInfo.loja || LOJAS[0].nome
        if (clienteCorrespondente?.loja_origem) {
          lojaSugerida = clienteCorrespondente.loja_origem
        } else {
          const pedUpper = card.numero_pedido.toUpperCase()
          const lojaMatch = LOJAS.find(
            (l) =>
              pedUpper.includes(l.cidade.toUpperCase()) ||
              l.nome.toUpperCase().includes(pedUpper.slice(0, 4)),
          )
          if (lojaMatch) lojaSugerida = lojaMatch.nome
        }

        // Checar idempotência no banco por trello_id ou numero_pedido
        const existente = await buscarQuebraPorTrelloId(card.id)

        if (existente) {
          // Atualiza dados
          await atualizarQuebraBoem(existente.id, {
            numero_pedido: card.numero_pedido,
            nf_saida: card.nf_saida || existente.nf_saida,
            cliente_nome: card.cliente_nome || existente.cliente_nome,
            produtos_envolvidos: card.produtos_envolvidos || existente.produtos_envolvidos,
            produtos_itens_json: card.produtos_itens
              ? JSON.stringify(card.produtos_itens)
              : existente.produtos_itens_json,
            entrega_entregador: card.entrega_entregador || existente.entrega_entregador,
            entrega_recebedor: card.entrega_recebedor || existente.entrega_recebedor,
            local_ocorrencia: card.local_ocorrencia || existente.local_ocorrencia,
            responsabilidade_apurada:
              card.responsabilidade_apurada || existente.responsabilidade_apurada,
            acao_adotada: card.acao_adotada || existente.acao_adotada,
            resultado_boem: card.resultado_boem || existente.resultado_boem,
            lista_quadro: card.nomeLista || existente.lista_quadro,
            status: card.statusSugeridoQuebra || existente.status,
          })
          quebrasAtualizadas++
        } else {
          // Cria novo
          await criarQuebraBoem({
            numero_pedido: card.numero_pedido,
            nf_saida: card.nf_saida || undefined,
            cliente: clienteCorrespondente?.id || undefined,
            cliente_nome: card.cliente_nome || card.numero_pedido,
            loja: lojaSugerida,
            produtos_envolvidos: card.produtos_envolvidos || undefined,
            produtos_itens_json: card.produtos_itens
              ? JSON.stringify(card.produtos_itens)
              : undefined,
            entrega_entregador: card.entrega_entregador || undefined,
            entrega_recebedor: card.entrega_recebedor || undefined,
            local_ocorrencia: card.local_ocorrencia || undefined,
            responsabilidade_apurada: card.responsabilidade_apurada || 'Em apuração',
            acao_adotada: card.acao_adotada || undefined,
            resultado_boem: card.resultado_boem || 'Pendente',
            status: card.statusSugeridoQuebra || 'Registro',
            lista_quadro: card.nomeLista || 'RAFAEL - SAC',
            responsavel: userInfo.name,
            data_ocorrencia: card.data_ocorrencia || new Date().toISOString().split('T')[0],
            descricao_detalhada: card.desc ? card.desc.substring(0, 1000) : undefined,
            origem_trello_id: card.id,
          })
          quebrasCriadas++
        }
      }

      // 3. Importar / Atualizar Ocorrências SAC
      for (const card of previewImportacao.resultado.sac) {
        const clienteCorrespondente = clientes.find((c) =>
          card.cliente_nome
            ? c.nome.toLowerCase().includes(card.cliente_nome.toLowerCase())
            : false,
        )

        let lojaSugerida = userInfo.loja || LOJAS[0].nome
        if (clienteCorrespondente?.loja_origem) {
          lojaSugerida = clienteCorrespondente.loja_origem
        }

        const existenteSac = await buscarReclamacaoPorTrelloId(card.id)

        if (existenteSac) {
          await atualizarReclamacao(existenteSac.id, {
            numero_pedido: card.numero_pedido,
            cliente_nome: card.cliente_nome || existenteSac.cliente_nome,
            contato_tratar_nome: card.contato_tratar_nome || existenteSac.contato_tratar_nome,
            contato_tratar_telefone:
              card.contato_tratar_telefone || existenteSac.contato_tratar_telefone,
            contato_tratar_email: card.contato_tratar_email || existenteSac.contato_tratar_email,
            descricao: card.descricao_sac || existenteSac.descricao,
            produtos_envolvidos: card.produtos_envolvidos || existenteSac.produtos_envolvidos,
            status_produto: card.status_produto || existenteSac.status_produto,
            produto_instalado: card.produto_instalado || existenteSac.produto_instalado,
            solicitacao_desejo: card.solicitacao_desejo || existenteSac.solicitacao_desejo,
            lista_quadro: card.nomeLista || existenteSac.lista_quadro,
          })
          sacAtualizados++
        } else {
          await criarReclamacao({
            cliente: clienteCorrespondente?.id || undefined,
            cliente_nome: card.cliente_nome || card.numero_pedido,
            cliente_telefone: card.contato_tratar_telefone || undefined,
            loja: lojaSugerida,
            canal_origem: 'WhatsApp',
            categoria: 'Produto com defeito',
            gravidade: 'Média',
            descricao: card.descricao_sac || card.desc || 'Ocorrência SAC via Trello',
            responsavel: userInfo.name,
            prazo_resolucao: new Date().toISOString().split('T')[0],
            status: card.statusSugeridoSac || 'Aberta',
            numero_pedido: card.numero_pedido,
            contato_tratar_nome: card.contato_tratar_nome,
            contato_tratar_telefone: card.contato_tratar_telefone,
            contato_tratar_email: card.contato_tratar_email,
            produtos_envolvidos: card.produtos_envolvidos,
            status_produto: card.status_produto,
            produto_instalado: card.produto_instalado,
            solicitacao_desejo: card.solicitacao_desejo,
            lista_quadro: card.nomeLista || 'RAFAEL - SAC',
            origem_trello_id: card.id,
          })
          sacCriados++
        }
      }

      toast({
        title: 'Importação idempotente concluída!',
        description: `Quebras: ${quebrasCriadas} criadas, ${quebrasAtualizadas} atualizadas. SAC: ${sacCriados} criadas, ${sacAtualizados} atualizadas.`,
      })

      setModalImportadorAberto(false)
      setPreviewImportacao(null)
      carregarDados()
    } catch (err) {
      console.error('Falha na importação:', err)
      toast({
        title: 'Erro na importação',
        description: 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setImportando(false)
    }
  }

  // Filtragem
  const quebrasFiltradas = useMemo(() => {
    return quebras.filter((q) => {
      if (userInfo.isComercial) {
        const cadastradoPorEle =
          q.responsavel?.toLowerCase().includes(userInfo.name.toLowerCase()) ||
          userInfo.name.toLowerCase().includes(q.responsavel?.toLowerCase() || '')
        const mesmaLoja =
          userInfo.loja && q.loja.toLowerCase().includes(userInfo.loja.toLowerCase())
        if (!cadastradoPorEle && !mesmaLoja) return false
      }

      if (userInfo.isAtendente && userInfo.loja) {
        if (!q.loja.toLowerCase().includes(userInfo.loja.toLowerCase())) {
          return false
        }
      } else if (filtroLoja !== 'todas') {
        if (!q.loja.toLowerCase().includes(filtroLoja.toLowerCase())) {
          return false
        }
      }

      if (filtroStatus !== 'todos' && q.status !== filtroStatus) return false
      if (filtroLista !== 'todas' && q.lista_quadro !== filtroLista) return false
      if (
        filtroResponsabilidade !== 'todas' &&
        q.responsabilidade_apurada !== filtroResponsabilidade
      )
        return false

      if (busca) {
        const b = busca.toLowerCase()
        const matchPedido = q.numero_pedido.toLowerCase().includes(b)
        const matchCliente = q.cliente_nome.toLowerCase().includes(b)
        const matchNF = q.nf_saida?.toLowerCase().includes(b) || false
        const matchProd = q.produtos_envolvidos?.toLowerCase().includes(b) || false
        if (!matchPedido && !matchCliente && !matchNF && !matchProd) return false
      }

      return true
    })
  }, [quebras, userInfo, filtroLoja, filtroStatus, filtroLista, filtroResponsabilidade, busca])

  // Drag and drop para mover card entre listas do Trello
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCardId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, listaNome: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverLista !== listaNome) {
      setDragOverLista(listaNome)
    }
  }

  const handleDrop = async (e: React.DragEvent, listaDestino: string) => {
    e.preventDefault()
    setDragOverLista(null)
    const cardId = draggedCardId || e.dataTransfer.getData('text/plain')
    if (!cardId) return

    const card = quebras.find((q) => q.id === cardId)
    if (!card || card.lista_quadro === listaDestino) return

    await handleMoverParaLista(cardId, listaDestino)
    setDraggedCardId(null)
  }

  // Métricas
  const totalEmAberto = quebras.filter((q) => q.status !== 'Resolvida').length
  const totalRegistro = quebras.filter((q) => q.status === 'Registro').length
  const totalEmAnalise = quebras.filter((q) => q.status === 'Em análise').length
  const totalResolvidas = quebras.filter((q) => q.status === 'Resolvida').length

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2F6B4F] flex items-center gap-1.5">
            <FileWarning className="w-4 h-4" />
            Módulo Quebras & BOEM • Espelho Trello
          </span>
          <h1 className="font-semibold text-2xl sm:text-3xl text-[#1D2B25] tracking-tight mt-1">
            Gestão de Quebras, Avarias & BOEM
          </h1>
          <p className="text-xs sm:text-sm text-[#5E6E64] mt-0.5">
            Colunas nomeadas por responsável/área (ex: "RAFAEL - SAC", "ALEXANDRE - DIRETORIA") e
            título no formato LOJA-123456.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Alternar Visualização: Quadro vs Lista */}
          <div className="inline-flex rounded-xl bg-[#F7FAF5] p-1 border border-[#A8C3A0]/40 text-xs">
            <button
              onClick={() => setModoVisualizacao('kanban')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                modoVisualizacao === 'kanban'
                  ? 'bg-[#2F6B4F] text-white shadow-xs'
                  : 'text-[#5E6E64] hover:text-[#1D2B25]'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Quadro (Listas)</span>
            </button>
            <button
              onClick={() => setModoVisualizacao('lista')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                modoVisualizacao === 'lista'
                  ? 'bg-[#2F6B4F] text-white shadow-xs'
                  : 'text-[#5E6E64] hover:text-[#1D2B25]'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Lista / Tabela</span>
            </button>
          </div>

          {/* Gerenciar Listas do Quadro */}
          {(userInfo.isGestor || userInfo.isComercial) && (
            <button
              onClick={() => setModalGerenciarListas(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F7FAF5] hover:bg-[#EAF2E8] text-[#2F6B4F] text-xs font-semibold border border-[#A8C3A0]/50 transition-colors"
            >
              <span>Gerenciar Colunas ({listasQuadro.length})</span>
            </button>
          )}

          {/* Botão Importar Trello */}
          {(userInfo.isGestor || userInfo.isComercial) && (
            <button
              onClick={() => setModalImportadorAberto(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EAF2E8] hover:bg-[#A8C3A0]/30 text-[#2F6B4F] text-xs font-semibold border border-[#2F6B4F]/20 transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Importar Trello JSON</span>
            </button>
          )}

          {/* Botão Nova Quebra */}
          <Dialog open={modalNovoAberto} onOpenChange={setModalNovoAberto}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors">
                <Plus className="w-4 h-4 text-[#A8C3A0]" />
                <span>Nova Quebra</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-semibold text-xl text-[#1D2B25]">
                  Registrar Quebra / BOEM (Modelo Trello)
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCriarQuebra} className="space-y-4 pt-1">
                <div className="p-3 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/40 text-xs text-[#5E6E64] flex items-center justify-between">
                  <span>
                    Título do registro = <strong>Número do Pedido (formato LOJA-123456)</strong>
                  </span>
                  <span className="text-[11px] text-amber-700 font-medium">
                    Sem duplicidade financeira
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Nº do Pedido (Título) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: LOJA-123456"
                      value={form.numero_pedido}
                      onChange={(e) => setForm({ ...form, numero_pedido: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      NF de Saída
                    </label>
                    <input
                      type="text"
                      placeholder="Número da NF gerada ao cliente"
                      value={form.nf_saida}
                      onChange={(e) => setForm({ ...form, nf_saida: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Data da Ocorrência
                    </label>
                    <input
                      type="date"
                      value={form.data_ocorrencia}
                      onChange={(e) => setForm({ ...form, data_ocorrencia: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Vincular Cliente
                    </label>
                    <select
                      value={form.cliente}
                      onChange={(e) => handleClienteChange(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    >
                      <option value="">Selecione da base...</option>
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

                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Coluna / Lista do Trello
                    </label>
                    <select
                      value={form.lista_quadro}
                      onChange={(e) => setForm({ ...form, lista_quadro: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm font-semibold text-[#2F6B4F] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    >
                      {listasQuadro.map((l) => (
                        <option key={l.id} value={l.nome}>
                          {l.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bloco de Produtos Envolvidos (Múltiplos produtos por ocorrência) */}
                <div className="p-3.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#1D2B25]">
                      Produtos Envolvidos (Código, Descrição, Lote, Quantidades)
                    </span>
                    <button
                      type="button"
                      onClick={handleAdicionarItemProduto}
                      className="text-xs font-semibold text-[#2F6B4F] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Item</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {form.itens_produtos.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="grid grid-cols-12 gap-2 p-2 bg-white rounded-lg border border-[#A8C3A0]/30 items-center text-xs"
                      >
                        <div className="col-span-3">
                          <input
                            type="text"
                            placeholder="Código sistema"
                            value={item.codigo}
                            onChange={(e) =>
                              handleAtualizarItemProduto(idx, 'codigo', e.target.value)
                            }
                            className="w-full px-2 py-1.5 rounded bg-[#F7FAF5] border border-[#A8C3A0]/40 text-xs font-mono"
                          />
                        </div>
                        <div className="col-span-4">
                          <input
                            type="text"
                            placeholder="Descrição igual sistema"
                            value={item.descricao}
                            onChange={(e) =>
                              handleAtualizarItemProduto(idx, 'descricao', e.target.value)
                            }
                            className="w-full px-2 py-1.5 rounded bg-[#F7FAF5] border border-[#A8C3A0]/40 text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Lote"
                            value={item.lote}
                            onChange={(e) =>
                              handleAtualizarItemProduto(idx, 'lote', e.target.value)
                            }
                            className="w-full px-2 py-1.5 rounded bg-[#F7FAF5] border border-[#A8C3A0]/40 text-xs"
                          />
                        </div>
                        <div className="col-span-1">
                          <input
                            type="text"
                            placeholder="Total"
                            title="Quantidade total do item no pedido"
                            value={item.qtd_total}
                            onChange={(e) =>
                              handleAtualizarItemProduto(idx, 'qtd_total', e.target.value)
                            }
                            className="w-full px-1.5 py-1.5 rounded bg-[#F7FAF5] border border-[#A8C3A0]/40 text-xs text-center"
                          />
                        </div>
                        <div className="col-span-1">
                          <input
                            type="text"
                            placeholder="Quebrada"
                            title="Quantidade quebrada nesta ocorrência"
                            value={item.qtd_quebrada}
                            onChange={(e) =>
                              handleAtualizarItemProduto(idx, 'qtd_quebrada', e.target.value)
                            }
                            className="w-full px-1.5 py-1.5 rounded bg-amber-50 border border-amber-300 text-xs text-center font-bold text-amber-900"
                          />
                        </div>
                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            disabled={form.itens_produtos.length === 1}
                            onClick={() => handleRemoverItemProduto(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Informações da Entrega */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Quem Entregou (Nome e/ou CPF/RG)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Motorista Carlos (RG: 12.345.678-9)"
                      value={form.entrega_entregador}
                      onChange={(e) => setForm({ ...form, entrega_entregador: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Quem Recebeu (Nome e/ou CPF/RG)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Encarregado da obra José"
                      value={form.entrega_recebedor}
                      onChange={(e) => setForm({ ...form, entrega_recebedor: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    />
                  </div>
                </div>

                {/* Local da Ocorrência & Responsabilidade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Local da Ocorrência (Marcar uma)
                    </label>
                    <select
                      value={form.local_ocorrencia}
                      onChange={(e) => setForm({ ...form, local_ocorrencia: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    >
                      {LOCAIS_OCORRENCIA.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Responsabilidade Apurada
                    </label>
                    <select
                      value={form.responsabilidade_apurada}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          responsabilidade_apurada: e.target.value as ResponsabilidadeQuebra,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    >
                      {RESPONSABILIDADES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Ação Adotada & Resultado BOEM */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Ação Adotada
                    </label>
                    <select
                      value={form.acao_adotada}
                      onChange={(e) => setForm({ ...form, acao_adotada: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    >
                      {ACOES_ADOTADAS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Resultado do BOEM
                    </label>
                    <select
                      value={form.resultado_boem}
                      onChange={(e) =>
                        setForm({ ...form, resultado_boem: e.target.value as ResultadoBoem })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    >
                      {RESULTADOS_BOEM.map((res) => (
                        <option key={res} value={res}>
                          {res}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Status da Esteira
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as StatusQuebra })}
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

                {/* Descrição Detalhada */}
                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Descrição Detalhada da Ocorrência
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Descreva detalhes da avaria, como as caixas foram descarregadas, etc."
                    value={form.descricao_detalhada}
                    onChange={(e) => setForm({ ...form, descricao_detalhada: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                  />
                </div>

                {/* Checklist Visual de Anexos Obrigatórios */}
                <div className="p-3.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30 space-y-2 text-xs">
                  <span className="font-semibold uppercase tracking-wider text-[#1D2B25] block">
                    Checklist de Evidências Obrigatórias (Anexos até 20MB)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#5E6E64]">
                    {EVIDENCIAS_OBRIGATORIAS.map((ev) => (
                      <div key={ev.id} className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded border border-[#A8C3A0] flex items-center justify-center text-[10px] text-[#2F6B4F]">
                          •
                        </span>
                        <span>{ev.label}</span>
                      </div>
                    ))}
                  </div>

                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files) {
                        setForm({ ...form, anexos: Array.from(e.target.files) })
                      }
                    }}
                    className="w-full text-xs text-[#5E6E64] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#EAF2E8] file:text-[#2F6B4F]"
                  />
                  {form.anexos.length > 0 && (
                    <p className="text-[11px] text-[#2F6B4F] font-medium">
                      {form.anexos.length} anexo(s) selecionado(s)
                    </p>
                  )}
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
                    <span>Registrar Quebra</span>
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#A8C3A0]/30 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#5E6E64] tracking-wider">
            Total em Aberto
          </span>
          <p className="text-2xl font-semibold text-[#1D2B25] mt-1">{totalEmAberto}</p>
          <span className="text-[11px] text-[#2F6B4F] font-medium flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            Pendentes
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#A8C3A0]/30 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#5E6E64] tracking-wider">
            1. Registro
          </span>
          <p className="text-2xl font-semibold text-[#1D2B25] mt-1">{totalRegistro}</p>
          <span className="text-[11px] text-[#5E6E64] mt-0.5">Aberturas recentes</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#A8C3A0]/30 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#5E6E64] tracking-wider">
            2. Em Análise
          </span>
          <p className="text-2xl font-semibold text-amber-700 mt-1">{totalEmAnalise}</p>
          <span className="text-[11px] text-amber-700/80 mt-0.5">Em apuração de BOEM</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#A8C3A0]/30 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#5E6E64] tracking-wider">
            3. Resolvidas
          </span>
          <p className="text-2xl font-semibold text-[#2F6B4F] mt-1">{totalResolvidas}</p>
          <span className="text-[11px] text-[#2F6B4F] mt-0.5">Reposições concluídas</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-2xl p-4 border border-[#A8C3A0]/30 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#5E6E64]" />
            <input
              type="text"
              placeholder="Buscar por nº pedido (LOJA-123456), cliente, NF ou produto..."
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
              <option value="todas">Todas as Colunas (Pessoas)</option>
              {listasQuadro.map((l) => (
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
              <option value="todos">Todos os status</option>
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
              value={filtroResponsabilidade}
              onChange={(e) => setFiltroResponsabilidade(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs text-[#1D2B25] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
            >
              <option value="todas">Todas as responsabilidades</option>
              {RESPONSABILIDADES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Conteúdo: MODO KANBAN (Espelho das listas Trello por Pessoa/Área) */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#A8C3A0]/30">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#2F6B4F]" />
          <p className="text-xs text-[#5E6E64] mt-2">Carregando quadro operacional...</p>
        </div>
      ) : modoVisualizacao === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {listasQuadro.map((col) => {
            const cardsNaColuna = quebrasFiltradas.filter(
              (q) => (q.lista_quadro || 'RAFAEL - SAC') === col.nome,
            )
            const isOver = dragOverLista === col.nome

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.nome)}
                onDragLeave={() => setDragOverLista(null)}
                onDrop={(e) => handleDrop(e, col.nome)}
                className={`bg-white/90 backdrop-blur-xs rounded-[20px] p-3.5 border transition-all flex flex-col min-h-[460px] shadow-xs ${
                  isOver
                    ? 'border-[#2F6B4F] bg-[#EAF2E8]/40 ring-2 ring-[#2F6B4F]/20'
                    : 'border-[#A8C3A0]/30'
                }`}
              >
                {/* Cabeçalho da Lista do Trello */}
                <div className="flex items-center justify-between pb-3 px-1 border-b border-[#EAF2E8]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#1D2B25] uppercase tracking-wide">
                      {col.nome}
                    </span>
                    <span className="w-5 h-5 rounded-full bg-[#F7FAF5] border border-[#A8C3A0]/40 text-[#2F6B4F] text-[10px] font-bold flex items-center justify-center">
                      {cardsNaColuna.length}
                    </span>
                  </div>
                </div>

                {/* Cards na Lista */}
                <div className="space-y-3 pt-3 flex-1">
                  {cardsNaColuna.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-[#A8C3A0]/30 rounded-xl flex items-center justify-center text-[11px] text-[#5E6E64] text-center p-3">
                      Arraste um pedido para esta coluna
                    </div>
                  ) : (
                    cardsNaColuna.map((q) => {
                      const totalAnexos = Array.isArray(q.anexos) ? q.anexos.length : 0
                      const anexosPendentes = totalAnexos < 3 && q.status === 'Em análise'

                      return (
                        <div
                          key={q.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, q.id)}
                          onClick={() => {
                            setQuebraSelecionada(q)
                            setModalDetalheAberto(true)
                          }}
                          className={`group bg-white rounded-xl p-3.5 border shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-2 ${
                            anexosPendentes
                              ? 'border-rose-300 bg-rose-50/20'
                              : q.status === 'Resolvida'
                                ? 'border-[#A8C3A0]/30 opacity-90'
                                : 'border-[#A8C3A0]/40 hover:border-[#2F6B4F]'
                          }`}
                        >
                          {/* Título do Card: SOMENTE o número do pedido no formato LOJA-123456 */}
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-bold text-sm text-[#1D2B25] group-hover:text-[#2F6B4F] transition-colors font-mono tracking-tight">
                              {q.numero_pedido}
                            </span>
                            {/* Etiqueta interna de status operacional */}
                            <span
                              className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                                q.status === 'Resolvida'
                                  ? 'bg-[#EAF2E8] text-[#2F6B4F]'
                                  : q.status === 'Em análise'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {q.status}
                            </span>
                          </div>

                          {/* Cliente e Loja */}
                          <div className="text-xs text-[#5E6E64] flex items-center justify-between">
                            <span className="font-medium text-[#1D2B25] truncate max-w-[140px]">
                              {q.cliente_nome}
                            </span>
                            <span className="text-[10px] text-[#5E6E64]">
                              {q.loja.replace(' (SP)', '')}
                            </span>
                          </div>

                          {/* Resumo de produtos */}
                          {q.produtos_envolvidos && (
                            <p className="text-[11px] text-[#5E6E64] line-clamp-1 italic">
                              {q.produtos_envolvidos}
                            </p>
                          )}

                          {/* Rodapé do Card */}
                          <div className="pt-2 border-t border-[#EAF2E8] flex items-center justify-between text-[10px] text-[#5E6E64]">
                            <span className="bg-[#F7FAF5] px-1.5 py-0.5 rounded border border-[#A8C3A0]/30 text-[#2F6B4F] font-medium">
                              Resp: {q.responsabilidade_apurada || 'Em apuração'}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {anexosPendentes && (
                                <span
                                  className="text-rose-700 bg-rose-50 px-1 py-0.5 rounded text-[9px] font-semibold border border-rose-200"
                                  title="Ocorrência em análise sem as evidências mínimas"
                                >
                                  Evidências pendentes
                                </span>
                              )}
                              <span className="flex items-center gap-0.5 text-[#5E6E64]">
                                <Paperclip className="w-3 h-3 text-[#2F6B4F]" />
                                <span>{totalAnexos}</span>
                              </span>
                            </div>
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
      ) : (
        /* MODO LISTA TRADICIONAL */
        <div className="space-y-3">
          {quebrasFiltradas.map((q) => {
            const isAberta = q.status !== 'Resolvida'
            return (
              <div
                key={q.id}
                className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 hover:border-[#2F6B4F]/40 shadow-xs transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-sm text-[#1D2B25] font-mono">
                      {q.numero_pedido}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      Coluna: {q.lista_quadro || 'RAFAEL - SAC'}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        q.status === 'Resolvida'
                          ? 'bg-[#EAF2E8] text-[#2F6B4F]'
                          : q.status === 'Em análise'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#5E6E64] flex-wrap">
                    <span className="font-semibold text-[#1D2B25]">{q.cliente_nome}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-[#2F6B4F]" />
                      {q.loja}
                    </span>
                    {q.nf_saida && (
                      <>
                        <span>•</span>
                        <span>NF: {q.nf_saida}</span>
                      </>
                    )}
                    <span>•</span>
                    <span className="text-[#2F6B4F]">Resp: {q.responsabilidade_apurada}</span>
                  </div>

                  {q.produtos_envolvidos && (
                    <p className="text-xs text-[#1D2B25]">
                      Produtos: <span className="text-[#5E6E64]">{q.produtos_envolvidos}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                  <button
                    onClick={() => {
                      setQuebraSelecionada(q)
                      setModalDetalheAberto(true)
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#F7FAF5] hover:bg-[#EAF2E8] text-xs font-semibold text-[#2F6B4F] border border-[#A8C3A0]/40"
                  >
                    Ver Detalhes
                  </button>
                  {isAberta && (
                    <button
                      onClick={() => handleResolverQuebra(q)}
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

      {/* Modal de Detalhes da Ocorrência */}
      <Dialog open={modalDetalheAberto} onOpenChange={setModalDetalheAberto}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          {quebraSelecionada && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="font-bold text-xl text-[#1D2B25] font-mono">
                      {quebraSelecionada.numero_pedido}
                    </DialogTitle>
                    <span className="text-xs text-[#5E6E64]">
                      Coluna atual:{' '}
                      <strong>{quebraSelecionada.lista_quadro || 'RAFAEL - SAC'}</strong>
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      quebraSelecionada.status === 'Resolvida'
                        ? 'bg-[#EAF2E8] text-[#2F6B4F]'
                        : quebraSelecionada.status === 'Em análise'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {quebraSelecionada.status}
                  </span>
                </div>
              </DialogHeader>

              {/* Mover de Coluna direto no modal */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30 text-xs">
                <span className="text-[#5E6E64] font-medium">Estacionar na coluna:</span>
                <select
                  value={quebraSelecionada.lista_quadro || 'RAFAEL - SAC'}
                  onChange={(e) => handleMoverParaLista(quebraSelecionada.id, e.target.value)}
                  className="px-2 py-1 rounded bg-white border border-[#A8C3A0]/40 font-semibold text-[#2F6B4F]"
                >
                  {listasQuadro.map((l) => (
                    <option key={l.id} value={l.nome}>
                      {l.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30 space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-[#5E6E64]">Cliente:</span>
                    <p className="font-semibold text-[#1D2B25]">{quebraSelecionada.cliente_nome}</p>
                  </div>
                  <div>
                    <span className="text-[#5E6E64]">Loja:</span>
                    <p className="font-semibold text-[#1D2B25]">{quebraSelecionada.loja}</p>
                  </div>
                  <div>
                    <span className="text-[#5E6E64]">NF de Saída:</span>
                    <p className="font-semibold text-[#1D2B25]">
                      {quebraSelecionada.nf_saida || 'Não informada'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#5E6E64]">Data Ocorrência:</span>
                    <p className="font-semibold text-[#1D2B25]">
                      {quebraSelecionada.data_ocorrencia || 'Sem data'}
                    </p>
                  </div>
                </div>

                {/* Informações da Entrega */}
                {(quebraSelecionada.entrega_entregador || quebraSelecionada.entrega_recebedor) && (
                  <div className="pt-2 border-t border-[#A8C3A0]/20 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[#5E6E64]">Quem Entregou:</span>
                      <p className="font-medium text-[#1D2B25]">
                        {quebraSelecionada.entrega_entregador || 'Não informado'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#5E6E64]">Quem Recebeu:</span>
                      <p className="font-medium text-[#1D2B25]">
                        {quebraSelecionada.entrega_recebedor || 'Não informado'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Local & Responsabilidade */}
                <div className="pt-2 border-t border-[#A8C3A0]/20 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[#5E6E64]">Local da Ocorrência:</span>
                    <p className="font-semibold text-[#1D2B25]">
                      {quebraSelecionada.local_ocorrencia || 'Identificado na entrega'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#5E6E64]">Responsabilidade Apurada:</span>
                    <p className="font-semibold text-[#1D2B25]">
                      {quebraSelecionada.responsabilidade_apurada || 'Em apuração'}
                    </p>
                  </div>
                </div>

                {/* Ação e BOEM */}
                <div className="pt-2 border-t border-[#A8C3A0]/20 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[#5E6E64]">Ação Adotada:</span>
                    <p className="font-medium text-[#1D2B25]">
                      {quebraSelecionada.acao_adotada || 'Reposição de material'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#5E6E64]">Resultado do BOEM:</span>
                    <p className="font-semibold text-[#1D2B25]">
                      {quebraSelecionada.resultado_boem || 'Pendente'}
                    </p>
                  </div>
                </div>

                {/* Produtos Envolvidos */}
                {quebraSelecionada.produtos_envolvidos && (
                  <div className="pt-2 border-t border-[#A8C3A0]/20 space-y-1">
                    <span className="text-[#5E6E64]">Produtos Envolvidos:</span>
                    <p className="font-medium text-[#1D2B25]">
                      {quebraSelecionada.produtos_envolvidos}
                    </p>
                  </div>
                )}

                {/* Anexos e Checklist Visual */}
                <div className="pt-2 border-t border-[#A8C3A0]/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#5E6E64] flex items-center gap-1 font-semibold">
                      <Paperclip className="w-3.5 h-3.5 text-[#2F6B4F]" />
                      Anexos Salvos ({quebraSelecionada.anexos?.length || 0})
                    </span>
                    {(!quebraSelecionada.anexos || quebraSelecionada.anexos.length === 0) && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Aguardando fotos da etiqueta e avaria
                      </span>
                    )}
                  </div>

                  {quebraSelecionada.anexos && quebraSelecionada.anexos.length > 0 ? (
                    <div className="flex gap-2 flex-wrap pt-1">
                      {quebraSelecionada.anexos.map((anexo, idx) => {
                        const url = getUrlAnexoQuebra(quebraSelecionada, anexo)
                        return (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-[#A8C3A0]/40 text-[11px] text-[#2F6B4F] hover:bg-[#EAF2E8]"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Evidência {idx + 1}</span>
                          </a>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[#5E6E64] italic">
                      Nenhum anexo foi carregado ainda. Sem fotos da caixa e da avaria a ocorrência
                      não é analisada.
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#A8C3A0]/20 text-[11px] text-[#5E6E64] italic">
                  * Observação: O controle financeiro das quebras (valores de ressarcimento e
                  resultado financeiro) é gerido exclusivamente na planilha do setor administrativo.
                </div>
              </div>

              {/* Rodapé Ações */}
              <div className="flex items-center justify-between pt-2 border-t border-[#EAF2E8]">
                {userInfo.isGestor ? (
                  <button
                    onClick={() => handleExcluir(quebraSelecionada.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  {quebraSelecionada.status !== 'Resolvida' && (
                    <button
                      onClick={() => handleResolverQuebra(quebraSelecionada)}
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

      {/* Modal Gerenciar Listas / Colunas do Trello */}
      <Dialog open={modalGerenciarListas} onOpenChange={setModalGerenciarListas}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg text-[#1D2B25]">
              Colunas / Listas do Quadro Trello
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <p className="text-[#5E6E64]">
              No Trello, as colunas representam pessoas ou diretorias responsáveis onde os cards são
              estacionados.
            </p>

            <div className="space-y-2">
              {listasQuadro.map((lista) => (
                <div
                  key={lista.id}
                  className="flex items-center justify-between p-2.5 bg-[#F7FAF5] rounded-xl border border-[#A8C3A0]/30"
                >
                  <span className="font-semibold text-[#1D2B25]">{lista.nome}</span>
                  <button
                    type="button"
                    onClick={() => handleExcluirLista(lista.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Excluir coluna"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#EAF2E8] flex gap-2">
              <input
                type="text"
                placeholder="Nome da nova lista (ex: JULIANA - QUALIDADE)"
                value={novaListaNome}
                onChange={(e) => setNovaListaNome(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/40 text-xs"
              />
              <button
                type="button"
                onClick={handleCriarNovaLista}
                className="px-3.5 py-2 rounded-xl bg-[#2F6B4F] text-white text-xs font-semibold"
              >
                Adicionar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Importador Trello JSON */}
      <Dialog open={modalImportadorAberto} onOpenChange={setModalImportadorAberto}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-semibold text-xl text-[#1D2B25] flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-[#2F6B4F]" />
              Importar Trello JSON ("BOT IA") • Idempotente
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <p className="text-xs text-[#5E6E64] leading-relaxed">
              O importador analisa o JSON oficial do Trello, separa automaticamente os cards entre{' '}
              <strong>Quebras & BOEM</strong> e <strong>Ocorrências (SAC)</strong>, cria as colunas
              do quadro ("RAFAEL - SAC", "ALEXANDRE - DIRETORIA") e{' '}
              <strong>atualiza sem duplicar registros</strong> caso reimportado.
            </p>

            <div className="p-4 rounded-2xl bg-[#F7FAF5] border border-dashed border-[#A8C3A0] text-center space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleSelecionarArquivoTrello}
                className="hidden"
                id="trello-json-input"
              />
              <label
                htmlFor="trello-json-input"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#A8C3A0]/60 text-xs font-semibold text-[#2F6B4F] hover:bg-[#EAF2E8] shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Selecionar arquivo JSON do Trello</span>
              </label>
              <p className="text-[11px] text-[#5E6E64]">
                {previewImportacao
                  ? `Arquivo: ${previewImportacao.arquivoNome} (${previewImportacao.resultado.totalCards} cards totais)`
                  : 'Selecione o arquivo de exportação JSON do Trello'}
              </p>
            </div>

            {previewImportacao && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#EAF2E8] border border-[#2F6B4F]/30 text-[#2F6B4F]">
                    <span className="font-bold text-sm block">
                      {previewImportacao.resultado.quebras.length} Quebras
                    </span>
                    <span className="text-[11px]">
                      {previewImportacao.quebrasJaExistentes > 0
                        ? `${previewImportacao.quebrasJaExistentes} já na base (serão atualizadas)`
                        : 'Novas para importação'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                    <span className="font-bold text-sm block">
                      {previewImportacao.resultado.sac.length} SAC / Ocorrências
                    </span>
                    <span className="text-[11px]">Direcionadas para o módulo Ocorrências</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
                    <span className="font-bold text-sm block">
                      {previewImportacao.resultado.ignorados.length} Modelos Ignorados
                    </span>
                    <span className="text-[11px]">Cards de instrução da lista "EXEMPLOS"</span>
                  </div>
                </div>

                {/* Listas que serão sincronizadas */}
                <div className="p-2.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30 text-xs">
                  <span className="font-semibold text-[#1D2B25] block mb-1">
                    Colunas do Trello identificadas:
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    {previewImportacao.resultado.listasEncontradas.map((l) => (
                      <span
                        key={l.id}
                        className="px-2 py-0.5 rounded bg-white border border-[#A8C3A0]/40 text-[#2F6B4F] text-[11px] font-medium"
                      >
                        {l.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#EAF2E8]">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewImportacao(null)
                      setModalImportadorAberto(false)
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5E6E64]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={importando}
                    onClick={handleConfirmarImportacao}
                    className="px-5 py-2 rounded-xl bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    {importando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Executar Importação Idempotente</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
