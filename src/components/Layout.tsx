import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Kanban,
  Users,
  Headphones,
  CalendarDays,
  AlertTriangle,
  ClockAlert,
  LogOut,
  Building2,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  UserCheck,
  Sparkles,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { LOJAS } from '@/data/boutiqueData'
import { getUsuarioAtualInfo } from '@/services/permissoes'
import { carregarIndicadoresPorLoja, IndicadoresAtendimentoLoja } from '@/services/indicadoresLoja'

interface LayoutProps {
  children?: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [lojaSelecionada, setLojaSelecionada] = useState<string>('Todas as Lojas')
  const location = useLocation()
  const navigate = useNavigate()

  // Informações de autenticação e papel
  const userInfo = getUsuarioAtualInfo()
  const isAuth = pb.authStore.isValid
  const isLoginPage = location.pathname === '/login'

  // Estado dos indicadores de atendimento por loja
  const [indicadoresPorLoja, setIndicadoresPorLoja] = useState<
    Record<string, IndicadoresAtendimentoLoja>
  >({})
  const [loadingIndicadores, setLoadingIndicadores] = useState(false)

  // Lista de lojas a exibir na sidebar (atendente vê apenas sua unidade; gestor vê todas as 7)
  const lojasExibidas =
    userInfo.isAtendente && userInfo.loja
      ? LOJAS.filter(
          (l) =>
            l.nome.toLowerCase().includes(userInfo.loja.toLowerCase()) ||
            userInfo.loja.toLowerCase().includes(l.nome.toLowerCase()),
        )
      : LOJAS

  // Obter parâmetro loja atual da URL (caso esteja no dashboard ou navegado com filtro)
  const params = new URLSearchParams(location.search)
  const lojaParamAtual = params.get('loja')

  useEffect(() => {
    if (lojaParamAtual) {
      setLojaSelecionada(lojaParamAtual)
    } else {
      setLojaSelecionada('Todas as Lojas')
    }
  }, [lojaParamAtual])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Carrega contadores agregados por loja
  useEffect(() => {
    if (!isAuth || isLoginPage) return

    let cancelado = false
    const fetchIndicadores = async () => {
      setLoadingIndicadores(true)
      try {
        const nomes = LOJAS.map((l) => l.nome)
        const dados = await carregarIndicadoresPorLoja(nomes)
        if (!cancelado) {
          setIndicadoresPorLoja(dados)
        }
      } catch (err) {
        console.warn('Erro ao carregar indicadores:', err)
      } finally {
        if (!cancelado) setLoadingIndicadores(false)
      }
    }

    fetchIndicadores()

    return () => {
      cancelado = true
    }
  }, [isAuth, isLoginPage])

  const handleLogout = () => {
    pb.authStore.clear()
    navigate('/login')
  }

  // Itens de navegação adaptáveis: se atendente, foco no fluxo operacional próprio
  const navItems = [
    {
      label: userInfo.isAtendente ? 'Meu Dia' : 'Painel de Gestão',
      href: '/',
      icon: LayoutDashboard,
      description: userInfo.isAtendente
        ? 'Seus clientes, pendências e tarefas'
        : 'KPIs consolidados das 7 lojas',
    },
    {
      label: 'Quadro Kanban',
      href: '/quadro',
      icon: Kanban,
      description: 'Fluxo com anexos de projetos',
    },
    {
      label: 'Clientes',
      href: '/clientes',
      icon: Users,
      description: 'Fichas e históricos',
    },
    {
      label: 'Follow-ups',
      href: '/follow-ups',
      icon: ClockAlert,
      description: 'Retornos e IA automática',
    },
    {
      label: 'Atendimentos',
      href: '/atendimentos',
      icon: Headphones,
      description: 'Registros e consultorias',
    },
    {
      label: 'Agenda',
      href: '/agenda',
      icon: CalendarDays,
      description: 'Visitas e horários',
    },
    {
      label: 'Reclamações',
      href: '/reclamacoes',
      icon: AlertTriangle,
      description: userInfo.isAtendente ? 'Minhas ocorrências' : 'Ocorrências da rede',
    },
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  // Se estiver na tela de login, renderiza apenas o contêiner de login limpo com estilo da marca
  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-[#F7FAF5] text-[#1D2B25] font-sans antialiased selection:bg-[#A8C3A0]/40 selection:text-[#1D2B25]">
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7FAF5] text-[#1D2B25] flex flex-col font-sans antialiased selection:bg-[#A8C3A0]/40 selection:text-[#1D2B25]">
      {/* Top Bar Operacional */}
      <header className="sticky top-0 z-40 bg-[#1D2B25] text-white border-b border-[#2F6B4F]/40 shadow-sm">
        <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              aria-label="Abrir navegação"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-full bg-[#2F6B4F] flex items-center justify-center text-white border border-[#A8C3A0]/40 group-hover:scale-105 transition-transform">
                <span className="font-serif italic text-base font-bold text-[#F7FAF5]">B</span>
              </div>
              <div className="flex flex-col">
                <span className="font-serif italic font-semibold text-base sm:text-lg leading-tight tracking-tight text-white">
                  Boutique de Revestimentos
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#A8C3A0] font-medium hidden sm:inline">
                  {userInfo.isAtendente
                    ? `Painel do Atendente • ${userInfo.loja || 'Minha Loja'}`
                    : 'Painel de Gestão • Rede 7 Lojas'}
                </span>
              </div>
            </Link>{' '}
          </div>

          {/* Filtro Rápido de Unidade & Perfil do Consultor */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden md:flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full text-xs text-white/90 border border-white/10">
              <Building2 className="w-3.5 h-3.5 text-[#A8C3A0]" />
              <select
                value={lojaSelecionada}
                onChange={(e) => {
                  const val = e.target.value
                  setLojaSelecionada(val)
                  if (val === 'Todas as Lojas') {
                    navigate('/')
                  } else {
                    navigate(`/?loja=${encodeURIComponent(val)}`)
                  }
                }}
                className="bg-transparent text-white focus:outline-none cursor-pointer text-xs pr-1"
              >
                <option value="Todas as Lojas" className="text-[#1D2B25] bg-white">
                  Rede Completa (7 Lojas)
                </option>
                {LOJAS.map((l) => (
                  <option key={l.id} value={l.nome} className="text-[#1D2B25] bg-white">
                    {l.nome}
                  </option>
                ))}
              </select>{' '}
            </div>

            {isAuth && (
              <div className="flex items-center gap-3 border-l border-white/15 pl-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#2F6B4F] text-[#A8C3A0] flex items-center justify-center text-xs font-semibold border border-[#A8C3A0]/30">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-white leading-none">
                        {userInfo.name}
                      </span>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-white/20 text-[#A8C3A0]">
                        {userInfo.role}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/60 leading-tight">
                      {userInfo.email}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sair do CRM"
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Corpo com Sidebar Interna e Área de Trabalho */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Sidebar Desktop */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0">
          <div className="bg-white rounded-2xl p-4 border border-[#A8C3A0]/30 shadow-sm sticky top-20 flex flex-col justify-between min-h-[calc(100vh-140px)]">
            <div className="space-y-6">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64] px-3 mb-2">
                  Navegação do CRM
                </p>
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const active = isActive(item.href)
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={`group flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                          active
                            ? 'bg-[#2F6B4F] text-white shadow-sm shadow-[#2F6B4F]/20 font-semibold'
                            : 'text-[#1D2B25] hover:bg-[#EAF2E8] hover:text-[#2F6B4F]'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            active ? 'text-[#A8C3A0]' : 'text-[#5E6E64] group-hover:text-[#2F6B4F]'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="leading-none text-sm">{item.label}</p>
                          <p
                            className={`text-[10px] truncate mt-1 ${
                              active ? 'text-white/80' : 'text-[#5E6E64]'
                            }`}
                          >
                            {item.description}
                          </p>
                        </div>
                        {active && <ChevronRight className="w-3.5 h-3.5 text-[#A8C3A0] shrink-0" />}
                      </Link>
                    )
                  })}
                </nav>
              </div>

              {/* Bloco de Unidades da Rede */}
              <div className="pt-4 border-t border-[#EAF2E8]">
                <div className="px-3 mb-2 flex items-center justify-between">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64] flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-[#2F6B4F]" />
                    <span>
                      {userInfo.isAtendente
                        ? 'Sua Unidade de Atendimento'
                        : `Unidades da Rede (${lojasExibidas.length})`}
                    </span>
                  </p>
                  {!userInfo.isAtendente && lojaParamAtual && (
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="text-[10px] text-[#2F6B4F] hover:underline font-semibold"
                      title="Ver todas as lojas"
                    >
                      Ver todas
                    </button>
                  )}
                </div>

                <div className="space-y-1 text-xs text-[#5E6E64]">
                  {lojasExibidas.map((l) => {
                    const stats = indicadoresPorLoja[l.nome] || {
                      totalKanbanNaoResolvidos: 0,
                      kanbanAtrasadosOuUrgentes: 0,
                      followUpsPendentes: 0,
                      followUpsAtrasados: 0,
                      reclamacoesAbertas: 0,
                      reclamacoesAtrasadas: 0,
                      temAlerta: false,
                    }

                    const isSelecionada =
                      lojaParamAtual &&
                      (lojaParamAtual.toLowerCase().includes(l.nome.toLowerCase()) ||
                        l.nome.toLowerCase().includes(lojaParamAtual.toLowerCase()))

                    const kanbanCount = stats.totalKanbanNaoResolvidos
                    const temAlertaKanban = stats.kanbanAtrasadosOuUrgentes > 0

                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          if (userInfo.isAtendente) {
                            navigate('/')
                          } else {
                            // Se já estiver selecionada, limpa para "todas"; senão filtra por ela
                            if (isSelecionada) {
                              navigate('/')
                            } else {
                              navigate(`/?loja=${encodeURIComponent(l.nome)}`)
                            }
                          }
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl transition-all group ${
                          isSelecionada
                            ? 'bg-[#EAF2E8] border border-[#A8C3A0]/60 shadow-xs'
                            : 'hover:bg-[#F7FAF5] border border-transparent'
                        }`}
                        title={`Clique para filtrar o dashboard por ${l.nome}`}
                      >
                        {/* Linha principal: Nome da Loja + Badge de Cartões do Kanban */}
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={`truncate text-xs font-medium transition-colors ${
                              isSelecionada
                                ? 'text-[#1D2B25] font-semibold'
                                : 'text-[#1D2B25] group-hover:text-[#2F6B4F]'
                            }`}
                          >
                            {l.nome}
                          </span>

                          {/* Badge discreta de cartões kanban pendentes */}
                          <div className="flex items-center gap-1 shrink-0">
                            {temAlertaKanban ? (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300/80"
                                title={`${kanbanCount} cartões pendentes (${stats.kanbanAtrasadosOuUrgentes} urgente ou atrasado)`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                                <span>{kanbanCount}</span>
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                                  kanbanCount > 0
                                    ? 'bg-[#EAF2E8] text-[#2F6B4F] border border-[#A8C3A0]/40'
                                    : 'bg-stone-100 text-stone-500'
                                }`}
                                title={`${kanbanCount} cartões pendentes no Kanban`}
                              >
                                {kanbanCount > 0 ? `${kanbanCount}` : '0'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Micro-resumo de atendimento: cartões, follow-ups e reclamações */}
                        <div className="flex items-center gap-1.5 text-[10px] text-[#5E6E64] mt-0.5 leading-tight">
                          <span>
                            {kanbanCount} {kanbanCount === 1 ? 'quadro' : 'quadros'}
                          </span>
                          <span className="text-[#A8C3A0]">•</span>
                          <span
                            className={
                              stats.followUpsAtrasados > 0
                                ? 'text-rose-700 font-semibold'
                                : undefined
                            }
                            title={
                              stats.followUpsAtrasados > 0
                                ? `${stats.followUpsAtrasados} atrasado(s)`
                                : undefined
                            }
                          >
                            {stats.followUpsPendentes} f-up
                            {stats.followUpsPendentes !== 1 ? 's' : ''}
                          </span>

                          {stats.reclamacoesAbertas > 0 && (
                            <>
                              <span className="text-[#A8C3A0]">•</span>
                              <span
                                className={
                                  stats.reclamacoesAtrasadas > 0
                                    ? 'text-rose-700 font-semibold inline-flex items-center gap-0.5'
                                    : 'text-amber-800 font-medium'
                                }
                              >
                                {stats.reclamacoesAbertas} rec
                              </span>
                            </>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Suporte Interno do CRM */}
            <div className="pt-4 border-t border-[#EAF2E8] text-xs text-[#5E6E64] space-y-2">
              <div className="p-3 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-[#1D2B25] text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2F6B4F]" />
                  <span>Atendimento Integrado</span>
                </div>
                <p className="text-[11px] text-[#5E6E64] leading-tight">
                  Painel unificado com disparos WhatsApp (wa.me) e histórico sincronizado.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Drawer Mobile */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-72 bg-white p-5 shadow-2xl flex flex-col justify-between border-r border-[#A8C3A0]/30">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[#EAF2E8]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#2F6B4F] flex items-center justify-center text-white">
                      <span className="font-serif italic font-bold">B</span>
                    </div>
                    <div>
                      <p className="font-serif italic font-semibold text-sm text-[#1D2B25]">
                        Boutique CRM
                      </p>
                      <p className="text-[10px] text-[#5E6E64]">Gestão de Atendimento</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-1 rounded-lg hover:bg-[#EAF2E8] text-[#5E6E64]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const active = isActive(item.href)
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                          active
                            ? 'bg-[#2F6B4F] text-white font-semibold'
                            : 'text-[#1D2B25] hover:bg-[#EAF2E8]'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </nav>

                {/* Bloco de Unidades da Rede no Mobile */}
                <div className="pt-4 border-t border-[#EAF2E8]">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64] px-1 mb-2 flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-[#2F6B4F]" />
                    <span>
                      {userInfo.isAtendente
                        ? 'Sua Unidade'
                        : `Unidades da Rede (${lojasExibidas.length})`}
                    </span>
                  </p>
                  <div className="space-y-1 text-xs">
                    {lojasExibidas.map((l) => {
                      const stats = indicadoresPorLoja[l.nome] || {
                        totalKanbanNaoResolvidos: 0,
                        kanbanAtrasadosOuUrgentes: 0,
                        followUpsPendentes: 0,
                        followUpsAtrasados: 0,
                        reclamacoesAbertas: 0,
                        reclamacoesAtrasadas: 0,
                        temAlerta: false,
                      }

                      const kanbanCount = stats.totalKanbanNaoResolvidos
                      const temAlerta = stats.kanbanAtrasadosOuUrgentes > 0

                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            setMobileOpen(false)
                            if (userInfo.isAtendente) {
                              navigate('/')
                            } else {
                              navigate(`/?loja=${encodeURIComponent(l.nome)}`)
                            }
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F7FAF5] transition-colors flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-xs text-[#1D2B25] truncate">{l.nome}</p>
                            <p className="text-[10px] text-[#5E6E64]">
                              {kanbanCount} quadros • {stats.followUpsPendentes} f-ups
                              {stats.reclamacoesAbertas > 0
                                ? ` • ${stats.reclamacoesAbertas} rec`
                                : ''}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold shrink-0 ml-2 ${
                              temAlerta
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-[#EAF2E8] text-[#2F6B4F]'
                            }`}
                          >
                            {kanbanCount}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#EAF2E8]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Área Central / Conteúdo Principal */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Rodapé Operacional Interno do CRM */}
      <footer className="mt-auto bg-[#1D2B25] text-white py-4 border-t border-[#2F6B4F]/40 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-white/70">
          <div className="flex items-center gap-2">
            <span className="font-serif italic font-semibold text-white">
              Boutique de Revestimentos
            </span>
            <span>•</span>
            <span className="text-[11px] text-[#A8C3A0]">
              CRM Interno de Atendimento às 7 Lojas
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>
              Vila Olímpia • Higienópolis • Moema • Tatuapé • Alphaville • Santana • Guarulhos
            </span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline text-white/50">v2.0 CRM</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
