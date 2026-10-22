import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Search,
  Filter,
  Plus,
  Building2,
  ChevronRight,
  Loader2,
  Mail,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { listarClientes, criarCliente } from '@/services/clientes'
import type { Cliente, ClienteInput, StatusCliente } from '@/types/crm'
import { LOJAS } from '@/data/boutiqueData'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { gerarLinkWhatsApp } from '@/services/followUps'

const STATUS_CLIENTE_LIST: StatusCliente[] = [
  'Novo',
  'Em atendimento',
  'Aguardando cliente',
  'Atendimento concluído',
]

export default function ClientesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [filtroLoja, setFiltroLoja] = useState<string>('todas')
  const [filtroStatus, setFiltroStatus] = useState<string>('todas')
  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Formulário de novo cliente
  const [novoCliente, setNovoCliente] = useState<ClienteInput>({
    nome: '',
    telefone: '',
    email: '',
    loja_origem: LOJAS[0].nome,
    status_atendimento: 'Novo',
    interesse_principal: '',
    arquiteto_parceiro: '',
    notas_internas: '',
    cidade: 'São Paulo',
  })

  const carregarClientes = async () => {
    setLoading(true)
    try {
      const data = await listarClientes()
      setClientes(data)
    } catch (err) {
      console.error('Falha ao carregar clientes:', err)
      toast({
        title: 'Erro ao carregar clientes',
        description: 'Tente recarregar a página.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarClientes()
  }, [])

  const handleCriarCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoCliente.nome || !novoCliente.telefone) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome e o telefone do cliente.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const criado = await criarCliente(novoCliente)
      setClientes((prev) => [criado, ...prev])
      setModalNovoAberto(false)
      setNovoCliente({
        nome: '',
        telefone: '',
        email: '',
        loja_origem: LOJAS[0].nome,
        status_atendimento: 'Novo',
        interesse_principal: '',
        arquiteto_parceiro: '',
        notas_internas: '',
        cidade: 'São Paulo',
      })
      toast({
        title: 'Cliente cadastrado com sucesso!',
        description: `${criado.nome} foi adicionado à base.`,
      })
    } catch (err) {
      console.error('Erro ao criar cliente:', err)
      toast({
        title: 'Erro ao salvar cliente',
        description: 'Verifique os dados informados.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Filtragem
  const clientesFiltrados = clientes.filter((c) => {
    const statusAtual = c.status_atendimento || c.etapa_funil || 'Novo'
    const matchBusca =
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone.includes(busca) ||
      (c.email && c.email.toLowerCase().includes(busca.toLowerCase())) ||
      (c.interesse_principal &&
        c.interesse_principal.toLowerCase().includes(busca.toLowerCase())) ||
      (c.arquiteto_parceiro && c.arquiteto_parceiro.toLowerCase().includes(busca.toLowerCase()))

    const matchLoja =
      filtroLoja === 'todas' || c.loja_origem.toLowerCase().includes(filtroLoja.toLowerCase())
    const matchStatus = filtroStatus === 'todas' || statusAtual === filtroStatus

    return matchBusca && matchLoja && matchStatus
  })

  const getStatusBadge = (status: StatusCliente) => {
    switch (status) {
      case 'Novo':
        return 'bg-slate-100 text-slate-700 border border-slate-200'
      case 'Em atendimento':
        return 'bg-blue-50 text-blue-700 border border-blue-200'
      case 'Aguardando cliente':
        return 'bg-stone-100 text-stone-700 border border-stone-200'
      case 'Atendimento concluído':
        return 'bg-slate-100 text-slate-600 border border-slate-200'
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Topo: Título + Botão Novo Cliente */}
      <div className="bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2F6B4F] flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Controle de Clientes & Atendimento
          </span>
          <h1 className="font-semibold text-2xl sm:text-3xl text-[#1D2B25] tracking-tight mt-1">
            Gestão de Clientes
          </h1>
          <p className="text-xs sm:text-sm text-[#5E6E64] mt-0.5">
            Controle de clientes, contatos e histórico de atendimento das 7 boutiques da rede.
          </p>
        </div>

        <Dialog open={modalNovoAberto} onOpenChange={setModalNovoAberto}>
          <DialogTrigger asChild>
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]">
              <Plus className="w-4 h-4 text-[#A8C3A0]" />
              <span>Novo Cliente</span>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-semibold text-xl text-[#1D2B25]">
                Cadastrar Novo Cliente
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCriarCliente} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={novoCliente.nome}
                    onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                    placeholder="Ex.: Mariana Alcantara"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={novoCliente.telefone}
                    onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                    placeholder="Ex.: 11984521134"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={novoCliente.email}
                    onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
                    placeholder="cliente@email.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Cidade / Bairro
                  </label>
                  <input
                    type="text"
                    value={novoCliente.cidade}
                    onChange={(e) => setNovoCliente({ ...novoCliente, cidade: e.target.value })}
                    placeholder="Ex.: São Paulo / Itaim Bibi"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                    Loja de Origem
                  </label>
                  <select
                    value={novoCliente.loja_origem}
                    onChange={(e) =>
                      setNovoCliente({ ...novoCliente, loja_origem: e.target.value })
                    }
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
                    Status de Atendimento
                  </label>
                  <select
                    value={novoCliente.status_atendimento}
                    onChange={(e) =>
                      setNovoCliente({
                        ...novoCliente,
                        status_atendimento: e.target.value as StatusCliente,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                  >
                    {STATUS_CLIENTE_LIST.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Arquiteto / Designer Parceiro
                </label>
                <input
                  type="text"
                  value={novoCliente.arquiteto_parceiro}
                  onChange={(e) =>
                    setNovoCliente({ ...novoCliente, arquiteto_parceiro: e.target.value })
                  }
                  placeholder="Ex.: Studio Arthur Casas, Arq. Juliana..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Interesse Principal (Revestimentos, Mármores, Metais)
                </label>
                <input
                  type="text"
                  value={novoCliente.interesse_principal}
                  onChange={(e) =>
                    setNovoCliente({ ...novoCliente, interesse_principal: e.target.value })
                  }
                  placeholder="Ex.: Porcelanato 120x240cm Calacatta, Metais escovados..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
                  Notas Internas
                </label>
                <textarea
                  rows={2}
                  value={novoCliente.notas_internas}
                  onChange={(e) =>
                    setNovoCliente({ ...novoCliente, notas_internas: e.target.value })
                  }
                  placeholder="Detalhes sobre a obra, preferências, histórico de contatos..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
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
                  className="px-5 py-2 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-2xl p-4 border border-[#A8C3A0]/30 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#5E6E64] absolute left-3.5 top-3" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone, arquiteto ou material..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/40 text-xs sm:text-sm text-[#1D2B25] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-[#F7FAF5] border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs w-full md:w-auto">
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

          <div className="flex items-center gap-1.5 bg-[#F7FAF5] border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs w-full md:w-auto">
            <Filter className="w-3.5 h-3.5 text-[#2F6B4F]" />
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="bg-transparent text-xs text-[#1D2B25] focus:outline-none cursor-pointer"
            >
              <option value="todas">Todos os Status</option>
              {STATUS_CLIENTE_LIST.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Clientes */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#2F6B4F]" />
          <span className="text-xs font-medium text-[#5E6E64]">Carregando base de clientes...</span>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="bg-white rounded-[24px] p-12 text-center border border-[#A8C3A0]/30 shadow-sm space-y-3">
          <Users className="w-10 h-10 text-[#5E6E64] mx-auto opacity-50" />
          <h3 className="font-semibold text-base sm:text-lg text-[#1D2B25]">
            Nenhum cliente encontrado
          </h3>
          <p className="text-xs text-[#5E6E64] max-w-sm mx-auto">
            Tente mudar o termo da busca ou os filtros de loja e status de atendimento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientesFiltrados.map((cli) => {
            const statusAtual = cli.status_atendimento || cli.etapa_funil || 'Novo'
            const waLink = gerarLinkWhatsApp(
              cli.telefone,
              `Olá ${cli.nome}, aqui é da equipe de atendimento da Boutique de Revestimentos.`,
            )
            return (
              <div
                key={cli.id}
                className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 hover:border-[#2F6B4F]/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg text-[#1D2B25] leading-snug">
                        {cli.nome}
                      </h3>{' '}
                      <p className="text-xs text-[#5E6E64] flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-[#2F6B4F]" />
                        <span>{cli.loja_origem}</span>
                      </p>
                    </div>

                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${getStatusBadge(
                        statusAtual,
                      )}`}
                    >
                      {statusAtual}
                    </span>
                  </div>

                  {cli.interesse_principal && (
                    <div className="mt-3 p-2.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/20 text-xs text-[#1D2B25]">
                      <span className="font-semibold text-[#2F6B4F] block text-[11px] uppercase tracking-wider mb-0.5">
                        Interesse:
                      </span>
                      <p className="line-clamp-2 leading-relaxed">{cli.interesse_principal}</p>
                    </div>
                  )}

                  {cli.arquiteto_parceiro && (
                    <p className="text-xs text-[#5E6E64] mt-2 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-[#2F6B4F]" />
                      <span>
                        Arquiteto:{' '}
                        <strong className="text-[#1D2B25]">{cli.arquiteto_parceiro}</strong>
                      </span>
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#EAF2E8] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      title="Abrir WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                    {cli.email && (
                      <a
                        href={`mailto:${cli.email}`}
                        className="p-1.5 rounded-lg bg-[#F7FAF5] text-[#5E6E64] hover:text-[#2F6B4F] transition-colors"
                        title="Enviar E-mail"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <span className="font-mono text-[11px] text-[#5E6E64]">{cli.telefone}</span>
                  </div>

                  <Link
                    to={`/clientes/${cli.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#EAF2E8] hover:bg-[#2F6B4F] text-[#2F6B4F] hover:text-white font-semibold text-xs transition-colors"
                  >
                    <span>Ficha</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
