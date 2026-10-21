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
              <div className="w-8 h-8 rounded-lg bg-[#2F6B4F] flex items-center justify-center text-white border border-[#A8C3A0]/40 group-hover:bg-[#25563f] transition-colors">
                <span className="font-bold text-sm text-[#F7FAF5] tracking-wider">B</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-base sm:text-lg leading-tight tracking-tight text-white">
                  Boutique de Revestimentos
                </span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#A8C3A0] font-medium hidden sm:inline">
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
                <div className="px-3 mb-2">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64] flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-[#2F6B4F]" />
                    <span>
                      {userInfo.isAtendente
                        ? 'Sua Unidade de Atendimento'
                        : `Unidades da Rede (${lojasExibidas.length})`}
                    </span>
                  </p>
                </div>

                <ul className="space-y-1 text-xs text-[#5E6E64]">
                  {lojasExibidas.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg text-[#1D2B25] hover:bg-[#F7FAF5] transition-colors"
                    >
                      <span className="truncate font-medium">{l.nome}</span>
                      <span className="text-[10px] text-[#5E6E64]/70 shrink-0 ml-2">SP</span>
                    </li>
                  ))}
                </ul>
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
                    <div className="w-8 h-8 rounded-lg bg-[#2F6B4F] flex items-center justify-center text-white font-bold text-sm">
                      <span>B</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#1D2B25]">Boutique CRM</p>
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
                    {lojasExibidas.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-[#1D2B25] hover:bg-[#F7FAF5] transition-colors"
                      >
                        <span className="font-medium text-xs text-[#1D2B25] truncate">
                          {l.nome}
                        </span>
                        <span className="text-[10px] text-[#5E6E64] shrink-0">SP</span>
                      </div>
                    ))}
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
            <span className="font-semibold text-white text-xs sm:text-sm">
              Boutique de Revestimentos
            </span>
            <span>•</span>
            <span className="text-[11px] text-[#A8C3A0]">CRM Interno de Atendimento • 7 Lojas</span>
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
