import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  FileWarning,
  Plus,
  Search,
  Filter,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UploadCloud,
  FileText,
  FileCheck2,
  ExternalLink,
  ChevronRight,
  Loader2,
  Download,
  Info,
  Trash2,
  ArrowUpDown,
  Paperclip,
} from 'lucide-react'
import {
  listarQuebrasBoem,
  criarQuebraBoem,
  atualizarQuebraBoem,
  resolverQuebraBoem,
  excluirQuebraBoem,
  getUrlAnexoQuebra,
} from '@/services/quebrasBoem'
import { listarClientes } from '@/services/clientes'
import { getUsuarioAtualInfo } from '@/services/permissoes'
import { LOJAS } from '@/data/boutiqueData'
import type {
  QuebraBoem,
  QuebraBoemInput,
  Cliente,
  StatusQuebra,
  ResponsabilidadeQuebra,
  ResultadoBoem,
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
const RESULTADOS: ResultadoBoem[] = [
  'Pendente',
  'Procedente (Reposição Autorizada)',
  'Procedente (Reembolso / Crédito)',
  'Improcedente',
  'Acordo Comercial',
]

interface TrelloCardParsed {
  id: string
  name: string
  desc: string
  closed: boolean
  numero_pedido: string
  nf_saida: string
  cliente_nome: string
  produtos_envolvidos: string
  responsabilidade: string
  acao_adotada: string
  resultado_boem: string
  statusSugerido: StatusQuebra
  valido: boolean
  motivoInvalido?: string
}

export default function QuebrasBoemPage() {
  const { toast } = useToast()
  const userInfo = getUsuarioAtualInfo()
  const location = useLocation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [quebras, setQuebras] = useState<QuebraBoem[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroLoja, setFiltroLoja] = useState<string>(
    userInfo.isAtendente && userInfo.loja ? userInfo.loja : 'todas',
  )
  const [filtroResponsabilidade, setFiltroResponsabilidade] = useState<string>('todas')

  // Modais
  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [modalImportadorAberto, setModalImportadorAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [quebraSelecionada, setQuebraSelecionada] = useState<QuebraBoem | null>(null)
  const [modalDetalheAberto, setModalDetalheAberto] = useState(false)

  // Formulário Nova Quebra
  const [form, setForm] = useState<{
    numero_pedido: string
    nf_saida: string
    cliente: string
    cliente_nome: string
    loja: string
    produtos_envolvidos: string
    responsabilidade_apurada: ResponsabilidadeQuebra
    acao_adotada: string
    resultado_boem: ResultadoBoem
    status: StatusQuebra
    responsavel: string
    data_ocorrencia: string
    descricao_detalhada: string
    anexos: File[]
  }>({
    numero_pedido: '',
    nf_saida: '',
    cliente: '',
    cliente_nome: '',
    loja: userInfo.loja || LOJAS[0].nome,
    produtos_envolvidos: '',
    responsabilidade_apurada: 'Em apuração',
    acao_adotada: '',
    resultado_boem: 'Pendente',
    status: 'Registro',
    responsavel: userInfo.name,
    data_ocorrencia: new Date().toISOString().split('T')[0],
    descricao_detalhada: '',
    anexos: [],
  })

  // Estado do Importador Trello
  const [importando, setImportando] = useState(false)
  const [previewImportacao, setPreviewImportacao] = useState<{
    totalCards: number
    aptos: TrelloCardParsed[]
    manuais: TrelloCardParsed[]
    arquivoNome: string
  } | null>(null)

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [qList, cList] = await Promise.all([listarQuebrasBoem(), listarClientes()])
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

  // Auto-selecionar filtro ou abrir modal via query param ?novo=true
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

  const handleCriarQuebra = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.numero_pedido || !form.cliente_nome) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o número do pedido e o cliente.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const criada = await criarQuebraBoem({
        numero_pedido: form.numero_pedido.trim(),
        nf_saida: form.nf_saida.trim() || undefined,
        cliente: form.cliente || undefined,
        cliente_nome: form.cliente_nome.trim(),
        loja: form.loja,
        produtos_envolvidos: form.produtos_envolvidos.trim() || undefined,
        responsabilidade_apurada: form.responsabilidade_apurada,
        acao_adotada: form.acao_adotada.trim() || undefined,
        resultado_boem: form.resultado_boem,
        status: form.status,
        responsavel: form.responsavel,
        data_ocorrencia: form.data_ocorrencia,
        descricao_detalhada: form.descricao_detalhada.trim() || undefined,
        anexos: form.anexos.length > 0 ? form.anexos : undefined,
      })

      setQuebras((prev) => [criada, ...prev])
      setModalNovoAberto(false)
      // reset form
      setForm({
        numero_pedido: '',
        nf_saida: '',
        cliente: '',
        cliente_nome: '',
        loja: userInfo.loja || LOJAS[0].nome,
        produtos_envolvidos: '',
        responsabilidade_apurada: 'Em apuração',
        acao_adotada: '',
        resultado_boem: 'Pendente',
        status: 'Registro',
        responsavel: userInfo.name,
        data_ocorrencia: new Date().toISOString().split('T')[0],
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
        description: 'Verifique se os dados estão preenchidos corretamente.',
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
        quebra.acao_adotada || 'Ocorrência concluída e conferida pela equipe.',
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

  const handleMudarStatus = async (id: string, novoStatus: StatusQuebra) => {
    try {
      const atualizada = await atualizarQuebraBoem(id, {
        status: novoStatus,
        data_resolucao:
          novoStatus === 'Resolvida' ? new Date().toISOString().split('T')[0] : undefined,
      })
      setQuebras((prev) => prev.map((q) => (q.id === id ? atualizada : q)))
      if (quebraSelecionada?.id === id) {
        setQuebraSelecionada(atualizada)
      }
      toast({
        title: 'Status atualizado',
        description: `Quebra alterada para "${novoStatus}".`,
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao atualizar status',
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

  // PARSER DO JSON EXPORTADO DO TRELLO
  const handleSelecionarArquivoTrello = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const jsonText = event.target?.result as string
        const trelloData = JSON.parse(jsonText)

        const cardsRaw = Array.isArray(trelloData?.cards) ? trelloData.cards : []

        const aptos: TrelloCardParsed[] = []
        const manuais: TrelloCardParsed[] = []

        cardsRaw.forEach((c: any) => {
          const nome: string = (c.name || '').trim()
          const desc: string = (c.desc || '').trim()
          const isClosed: boolean = Boolean(c.closed || c.dueComplete)

          // Extrair campos de texto estruturado conforme formato do Trello
          // **PEDIDO:** LOJA-123456
          // **CLIENTE:** ...
          // **NF DE SAÍDA:** ...
          const matchPedido =
            desc.match(/(?:PEDIDO|Nº DO PEDIDO|NUMERO PEDIDO)[:\s*]+([^\n\r*]+)/i) ||
            nome.match(/([A-Z0-9\-_/]{4,25})/i)
          const matchCliente = desc.match(/(?:CLIENTE|NOME DO CLIENTE)[:\s*]+([^\n\r*]+)/i)
          const matchNF = desc.match(/(?:NF DE SAÍDA|NF SAIDA|NOTA FISCAL|NF)[:\s*]+([^\n\r*]+)/i)
          const matchProdutos = desc.match(
            /(?:PRODUTOS ENVOLVIDOS|PRODUTOS|PRODUTO)[:\s*]+([^\n\r*]+)/i,
          )
          const matchResp = desc.match(
            /(?:RESPONSABILIDADE APURADA|RESPONSABILIDADE)[:\s*]+([^\n\r*]+)/i,
          )
          const matchAcao = desc.match(/(?:AÇÃO ADOTADA|ACAO ADOTADA|AÇÃO)[:\s*]+([^\n\r*]+)/i)
          const matchResultado = desc.match(
            /(?:RESULTADO DO BOEM|RESULTADO BOEM|RESULTADO)[:\s*]+([^\n\r*]+)/i,
          )

          const numero_pedido = (matchPedido ? matchPedido[1] : nome).replace(/[*_]/g, '').trim()
          const cliente_nome = (matchCliente ? matchCliente[1] : '').replace(/[*_]/g, '').trim()
          const nf_saida = (matchNF ? matchNF[1] : '').replace(/[*_]/g, '').trim()
          const produtos_envolvidos = (matchProdutos ? matchProdutos[1] : '')
            .replace(/[*_]/g, '')
            .trim()
          const responsabilidade = (matchResp ? matchResp[1] : '').replace(/[*_]/g, '').trim()
          const acao_adotada = (matchAcao ? matchAcao[1] : '').replace(/[*_]/g, '').trim()
          const resultado_boem = (matchResultado ? matchResultado[1] : '')
            .replace(/[*_]/g, '')
            .trim()

          // Se for cartão de modelo explicativo, ignora
          const isCardModelo =
            nome.toUpperCase().includes('MODELO COMPLETO') ||
            nome.toUpperCase().includes('MODELO OPERACIONAL') ||
            nome.toUpperCase().includes('FORMULÁRIO PADRÃO')

          const statusSugerido: StatusQuebra = isClosed
            ? 'Resolvida'
            : resultado_boem.toLowerCase().includes('autorizada') ||
                resultado_boem.toLowerCase().includes('crédito')
              ? 'Em análise'
              : 'Registro'

          const parsed: TrelloCardParsed = {
            id: c.id,
            name: nome,
            desc,
            closed: isClosed,
            numero_pedido: numero_pedido || nome,
            nf_saida,
            cliente_nome: cliente_nome || (nome.includes('-') ? nome.split('-')[0].trim() : ''),
            produtos_envolvidos,
            responsabilidade,
            acao_adotada,
            resultado_boem,
            statusSugerido,
            valido: !isCardModelo && Boolean(numero_pedido),
            motivoInvalido: isCardModelo
              ? 'Cartão de instrução/modelo (não é ocorrência de cliente)'
              : !numero_pedido
                ? 'Número do pedido ausente'
                : undefined,
          }

          if (parsed.valido) {
            aptos.push(parsed)
          } else {
            manuais.push(parsed)
          }
        })

        setPreviewImportacao({
          totalCards: cardsRaw.length,
          aptos,
          manuais,
          arquivoNome: file.name,
        })
      } catch (err) {
        console.error('Erro ao ler JSON:', err)
        toast({
          title: 'Arquivo JSON inválido',
          description: 'Certifique-se de que é o export JSON original do Trello.',
          variant: 'destructive',
        })
      }
    }
    reader.readAsText(file)
  }

  // Executar a importação dos cartões aptos
  const handleConfirmarImportacao = async () => {
    if (!previewImportacao || previewImportacao.aptos.length === 0) return

    setImportando(true)
    let importadosCount = 0

    try {
      for (const card of previewImportacao.aptos) {
        // Encontrar cliente existente mais próximo pelo nome
        const clienteCorrespondente = clientes.find((c) =>
          card.cliente_nome
            ? c.nome.toLowerCase().includes(card.cliente_nome.toLowerCase())
            : false,
        )

        // Determinar loja a partir do prefixo do pedido (ex LOJA-123456 ou HIG-123456)
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

        // Mapear responsabilidade
        let respApurada: ResponsabilidadeQuebra = 'Em apuração'
        const respUpper = card.responsabilidade.toUpperCase()
        if (respUpper.includes('TRANS')) respApurada = 'Transportadora'
        else if (respUpper.includes('FABRIC') || respUpper.includes('FORNEC'))
          respApurada = 'Fábrica / Fornecedor'
        else if (respUpper.includes('ARMA') || respUpper.includes('EXPED'))
          respApurada = 'Armazém / Expedição'
        else if (respUpper.includes('CLIENT') || respUpper.includes('OBRA'))
          respApurada = 'Cliente / Obra'
        else if (respUpper.includes('INSTAL') || respUpper.includes('ASSENT'))
          respApurada = 'Instalação / Assentamento'

        // Mapear resultado do BOEM
        let resBoem: ResultadoBoem = 'Pendente'
        const resUpper = card.resultado_boem.toUpperCase()
        if (resUpper.includes('AUTORIZ') || resUpper.includes('REPOSI'))
          resBoem = 'Procedente (Reposição Autorizada)'
        else if (resUpper.includes('REEMBOL') || resUpper.includes('CREDIT'))
          resBoem = 'Procedente (Reembolso / Crédito)'
        else if (resUpper.includes('IMPROC')) resBoem = 'Improcedente'
        else if (resUpper.includes('ACORDO')) resBoem = 'Acordo Comercial'

        await criarQuebraBoem({
          numero_pedido: card.numero_pedido,
          nf_saida: card.nf_saida || undefined,
          cliente: clienteCorrespondente?.id || undefined,
          cliente_nome: card.cliente_nome || clienteCorrespondente?.nome || card.numero_pedido,
          loja: lojaSugerida,
          produtos_envolvidos: card.produtos_envolvidos || undefined,
          responsabilidade_apurada: respApurada,
          acao_adotada: card.acao_adotada || undefined,
          resultado_boem: resBoem,
          status: card.statusSugerido,
          responsavel: userInfo.name,
          data_ocorrencia: new Date().toISOString().split('T')[0],
          descricao_detalhada: card.desc ? card.desc.substring(0, 1000) : undefined,
          origem_trello_id: card.id,
        })

        importadosCount++
      }

      toast({
        title: 'Importação concluída com sucesso!',
        description: `${importadosCount} cartões do Trello foram transformados em registros de Quebras & BOEM.`,
      })

      setModalImportadorAberto(false)
      setPreviewImportacao(null)
      carregarDados()
    } catch (err) {
      console.error('Falha na importação:', err)
      toast({
        title: 'Falha durante importação',
        description: `Importados ${importadosCount} registros antes de falhar.`,
        variant: 'destructive',
      })
    } finally {
      setImportando(false)
    }
  }

  // Filtragem e regras de acesso
  const quebrasFiltradas = useMemo(() => {
    return quebras.filter((q) => {
      // Regra de papel comercial: vê apenas as que ele próprio registrou ou todas da sua unidade
      if (userInfo.isComercial) {
        // Se cadastrou ou é responsável
        const cadastradoPorEle =
          q.responsavel?.toLowerCase().includes(userInfo.name.toLowerCase()) ||
          userInfo.name.toLowerCase().includes(q.responsavel?.toLowerCase() || '')
        const mesmaLoja =
          userInfo.loja && q.loja.toLowerCase().includes(userInfo.loja.toLowerCase())
        if (!cadastradoPorEle && !mesmaLoja) return false
      }

      // Regra de papel atendente: somente leitura das quebras da sua loja
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
  }, [quebras, userInfo, filtroLoja, filtroStatus, filtroResponsabilidade, busca])

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
            Módulo Operacional de Quebras & BOEM
          </span>
          <h1 className="font-semibold text-2xl sm:text-3xl text-[#1D2B25] tracking-tight mt-1">
            Gestão de Quebras, Avarias & BOEM
          </h1>
          <p className="text-xs sm:text-sm text-[#5E6E64] mt-0.5">
            Fluxo simplificado (Registro → Em análise → Resolvida) estruturado com base nos
            cards-modelo do Trello.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Botão Importador Trello (discreto, ação administrativa/gestão) */}
          {(userInfo.isGestor || userInfo.isComercial) && (
            <button
              onClick={() => setModalImportadorAberto(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#EAF2E8] hover:bg-[#A8C3A0]/30 text-[#2F6B4F] text-xs font-semibold border border-[#2F6B4F]/20 transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Importar Trello JSON</span>
            </button>
          )}

          {/* Botão Nova Quebra */}
          <Dialog open={modalNovoAberto} onOpenChange={setModalNovoAberto}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]">
                <Plus className="w-4 h-4 text-[#A8C3A0]" />
                <span>Nova Quebra / BOEM</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-semibold text-xl text-[#1D2B25]">
                  Registrar Quebra / BOEM
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCriarQuebra} className="space-y-4 pt-2">
                <div className="p-3 rounded-xl bg-[#EAF2E8]/60 border border-[#A8C3A0]/40 text-xs text-[#2F6B4F]">
                  Preencha com os dados reais do pedido e da nota fiscal, conforme o padrão
                  operacional da Boutique.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Nº do Pedido *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: LOJA-123456"
                      value={form.numero_pedido}
                      onChange={(e) => setForm({ ...form, numero_pedido: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      NF de Saída
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: NF-048291"
                      value={form.nf_saida}
                      onChange={(e) => setForm({ ...form, nf_saida: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Vincular Cliente *
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
                      placeholder="Nome completo igual ao sistema"
                      value={form.cliente_nome}
                      onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                      Unidade / Loja
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

                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Produtos Envolvidos
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Porcelanato Calacatta Oro 120x240cm (4 lâminas)"
                    value={form.produtos_envolvidos}
                    onChange={(e) => setForm({ ...form, produtos_envolvidos: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                      {RESULTADOS.map((res) => (
                        <option key={res} value={res}>
                          {res}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Ação Adotada
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Abertura de BOEM de avaria na descarga, solicitada reposição urgente com fábrica."
                    value={form.acao_adotada}
                    onChange={(e) => setForm({ ...form, acao_adotada: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Descrição Detalhada da Ocorrência
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Descreva as avarias, peças quebradas, estado da embalagem na entrega..."
                    value={form.descricao_detalhada}
                    onChange={(e) => setForm({ ...form, descricao_detalhada: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Anexos Obrigatórios (Fotos da Avaria / Canhoto / Laudo) - até 20MB
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files) {
                        setForm({ ...form, anexos: Array.from(e.target.files) })
                      }
                    }}
                    className="w-full text-xs text-[#5E6E64] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#EAF2E8] file:text-[#2F6B4F] hover:file:bg-[#A8C3A0]/30"
                  />
                  {form.anexos.length > 0 && (
                    <p className="text-[11px] text-[#2F6B4F] mt-1 font-medium">
                      {form.anexos.length} arquivo(s) selecionado(s) para upload
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
                    className="px-5 py-2 rounded-xl bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold shadow-sm disabled:opacity-50 flex items-center gap-2"
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

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#A8C3A0]/30 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-[#5E6E64] tracking-wider">
            Total em Aberto
          </span>
          <p className="text-2xl font-semibold text-[#1D2B25] mt-1">{totalEmAberto}</p>
          <span className="text-[11px] text-[#2F6B4F] font-medium flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            Pendentes de resolução
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
          <span className="text-[11px] text-amber-700/80 mt-0.5">BOEM em tratativa</span>
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
              placeholder="Buscar por nº pedido, cliente, nota fiscal ou produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
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

      {/* Lista de Quebras & BOEM */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#A8C3A0]/30">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#2F6B4F]" />
          <p className="text-xs text-[#5E6E64] mt-2">Carregando registros de Quebras & BOEM...</p>
        </div>
      ) : quebrasFiltradas.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#A8C3A0]/30 space-y-3">
          <FileCheck2 className="w-10 h-10 mx-auto text-[#A8C3A0]" />
          <h3 className="font-semibold text-[#1D2B25] text-base">Nenhuma ocorrência encontrada</h3>
          <p className="text-xs text-[#5E6E64] max-w-sm mx-auto">
            Não há registros de quebras correspondentes aos filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {quebrasFiltradas.map((q) => {
            const isAberta = q.status !== 'Resolvida'
            return (
              <div
                key={q.id}
                className={`bg-white rounded-2xl p-5 border transition-all ${
                  isAberta
                    ? 'border-amber-200/80 hover:border-amber-400 bg-amber-50/15'
                    : 'border-[#A8C3A0]/30 hover:border-[#2F6B4F]/40'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-sm text-[#1D2B25] tracking-tight">
                        {q.numero_pedido}
                      </span>
                      {q.nf_saida && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#F7FAF5] text-[#5E6E64] border border-[#A8C3A0]/40">
                          {q.nf_saida}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          q.status === 'Resolvida'
                            ? 'bg-[#EAF2E8] text-[#2F6B4F]'
                            : q.status === 'Em análise'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {q.status}
                      </span>
                      {isAberta && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Em aberto
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#5E6E64] flex-wrap">
                      <span className="font-semibold text-[#1D2B25]">
                        {q.cliente ? (
                          <Link
                            to={`/clientes/${q.cliente}`}
                            className="hover:text-[#2F6B4F] hover:underline"
                          >
                            {q.cliente_nome}
                          </Link>
                        ) : (
                          q.cliente_nome
                        )}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-[#2F6B4F]" />
                        {q.loja}
                      </span>
                      {q.responsabilidade_apurada && (
                        <>
                          <span>•</span>
                          <span className="text-[#1D2B25] bg-[#EAF2E8] px-2 py-0.5 rounded text-[11px]">
                            Resp: {q.responsabilidade_apurada}
                          </span>
                        </>
                      )}
                    </div>

                    {q.produtos_envolvidos && (
                      <p className="text-xs text-[#1D2B25] font-medium">
                        Produtos:{' '}
                        <span className="text-[#5E6E64] font-normal">{q.produtos_envolvidos}</span>
                      </p>
                    )}

                    {q.acao_adotada && (
                      <p className="text-xs text-[#5E6E64] line-clamp-1 italic">
                        "{q.acao_adotada}"
                      </p>
                    )}
                  </div>

                  {/* Ações Rápidas */}
                  <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                    <button
                      onClick={() => {
                        setQuebraSelecionada(q)
                        setModalDetalheAberto(true)
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#F7FAF5] hover:bg-[#EAF2E8] text-xs font-semibold text-[#2F6B4F] border border-[#A8C3A0]/40 transition-colors"
                    >
                      Ver Detalhes
                    </button>

                    {isAberta && (
                      <button
                        onClick={() => handleResolverQuebra(q)}
                        className="px-3 py-1.5 rounded-xl bg-[#2F6B4F] hover:bg-[#25563F] text-xs font-semibold text-white shadow-sm flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#A8C3A0]" />
                        <span>Resolver</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Detalhes da Ocorrência */}
      <Dialog open={modalDetalheAberto} onOpenChange={setModalDetalheAberto}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          {quebraSelecionada && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="font-semibold text-xl text-[#1D2B25]">
                    Pedido: {quebraSelecionada.numero_pedido}
                  </DialogTitle>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      quebraSelecionada.status === 'Resolvida'
                        ? 'bg-[#EAF2E8] text-[#2F6B4F]'
                        : quebraSelecionada.status === 'Em análise'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {quebraSelecionada.status}
                  </span>
                </div>
              </DialogHeader>

              <div className="p-4 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[#5E6E64]">Cliente:</span>
                    <p className="font-semibold text-[#1D2B25] text-sm">
                      {quebraSelecionada.cliente ? (
                        <Link
                          to={`/clientes/${quebraSelecionada.cliente}`}
                          className="hover:text-[#2F6B4F] underline"
                        >
                          {quebraSelecionada.cliente_nome}
                        </Link>
                      ) : (
                        quebraSelecionada.cliente_nome
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#5E6E64]">Loja / Unidade:</span>
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

                <div className="pt-2 border-t border-[#A8C3A0]/20 space-y-1">
                  <span className="text-[#5E6E64]">Produtos Envolvidos:</span>
                  <p className="font-medium text-[#1D2B25]">
                    {quebraSelecionada.produtos_envolvidos || 'Não especificado'}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#A8C3A0]/20 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[#5E6E64]">Responsabilidade Apurada:</span>
                    <p className="font-semibold text-[#1D2B25]">
                      {quebraSelecionada.responsabilidade_apurada || 'Em apuração'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#5E6E64]">Resultado do BOEM:</span>
                    <p className="font-semibold text-[#1D2B25]">
                      {quebraSelecionada.resultado_boem || 'Pendente'}
                    </p>
                  </div>
                </div>

                {quebraSelecionada.acao_adotada && (
                  <div className="pt-2 border-t border-[#A8C3A0]/20 space-y-1">
                    <span className="text-[#5E6E64]">Ação Adotada:</span>
                    <p className="text-[#1D2B25]">{quebraSelecionada.acao_adotada}</p>
                  </div>
                )}

                {quebraSelecionada.descricao_detalhada && (
                  <div className="pt-2 border-t border-[#A8C3A0]/20 space-y-1">
                    <span className="text-[#5E6E64]">Descrição Detalhada:</span>
                    <p className="text-[#1D2B25] whitespace-pre-wrap">
                      {quebraSelecionada.descricao_detalhada}
                    </p>
                  </div>
                )}

                {/* Anexos */}
                {quebraSelecionada.anexos && quebraSelecionada.anexos.length > 0 && (
                  <div className="pt-2 border-t border-[#A8C3A0]/20 space-y-1">
                    <span className="text-[#5E6E64] flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5 text-[#2F6B4F]" />
                      Anexos ({quebraSelecionada.anexos.length}):
                    </span>
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
                            <span>Anexo {idx + 1}</span>
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Ações no modal de detalhes */}
              <div className="flex items-center justify-between pt-2 border-t border-[#EAF2E8]">
                {userInfo.isGestor ? (
                  <button
                    onClick={() => handleExcluir(quebraSelecionada.id)}
                    className="p-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-1"
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

      {/* Modal do Importador Trello */}
      <Dialog open={modalImportadorAberto} onOpenChange={setModalImportadorAberto}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-semibold text-xl text-[#1D2B25] flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-[#2F6B4F]" />
              Importar Cartões do Trello ("BOT IA")
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <p className="text-xs text-[#5E6E64] leading-relaxed">
              Carregue o arquivo JSON exportado do quadro Trello para converter os cards de
              quebra/BOEM em registros nativos da base de dados sem necessidade de redigitação
              manual.
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
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#A8C3A0]/60 text-xs font-semibold text-[#2F6B4F] hover:bg-[#EAF2E8] shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Selecionar arquivo JSON do Trello</span>
              </label>
              <p className="text-[11px] text-[#5E6E64]">
                {previewImportacao
                  ? `Arquivo: ${previewImportacao.arquivoNome} (${previewImportacao.totalCards} cards totais)`
                  : 'Formato esperado: exportação JSON de quadro Trello'}
              </p>
            </div>

            {/* Resumo da Importação */}
            {previewImportacao && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#EAF2E8] border border-[#2F6B4F]/30 text-[#2F6B4F]">
                    <span className="font-bold text-sm block">
                      {previewImportacao.aptos.length} cards aptos
                    </span>
                    <span>Campos essenciais mapeados para importação imediata.</span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                    <span className="font-bold text-sm block">
                      {previewImportacao.manuais.length} cards ignorados / manuais
                    </span>
                    <span>Cards de instrução ou modelos de exemplo.</span>
                  </div>
                </div>

                {previewImportacao.aptos.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#1D2B25] uppercase tracking-wider">
                      Prévia dos cartões a importar:
                    </h4>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 border border-[#A8C3A0]/30 rounded-xl p-2 bg-[#F7FAF5] text-xs">
                      {previewImportacao.aptos.map((card, i) => (
                        <div
                          key={i}
                          className="p-2 bg-white rounded-lg border border-[#A8C3A0]/20 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-[#1D2B25]">
                              {card.numero_pedido}
                            </span>
                            <span className="text-[11px] text-[#5E6E64] ml-2">
                              {card.cliente_nome || 'Cliente do pedido'}
                            </span>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-[#2F6B4F] bg-[#EAF2E8] px-2 py-0.5 rounded">
                            {card.statusSugerido}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {previewImportacao.manuais.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#5E6E64]">
                      Cards manuais / modelos (preservados para conferência):
                    </span>
                    <ul className="text-[11px] text-[#5E6E64] space-y-0.5 list-disc pl-4">
                      {previewImportacao.manuais.map((m, idx) => (
                        <li key={idx}>
                          {m.name}: <span className="italic">{m.motivoInvalido}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

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
                    disabled={importando || previewImportacao.aptos.length === 0}
                    onClick={handleConfirmarImportacao}
                    className="px-5 py-2 rounded-xl bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    {importando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      Confirmar Importação de {previewImportacao.aptos.length} Ocorrências
                    </span>
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
