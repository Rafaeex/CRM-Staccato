import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Menu,
  X,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  Instagram,
  Facebook,
  ExternalLink,
} from 'lucide-react'
import { LOJAS, HORARIOS_ATENDIMENTO } from '@/data/boutiqueData'
import pb from '@/lib/pocketbase/client'

interface LayoutProps {
  children?: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const isAuth = pb.authStore.isValid

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Fechar menu mobile ao trocar de rota
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const navLinks = [
    { label: 'Início', href: '/' },
    { label: 'Lojas', href: '/#lojas' },
    { label: 'Serviços', href: '/servicos' },
    { label: 'Equipe', href: '/servicos#equipe' },
    { label: 'Pedidos', href: '/pedidos' },
  ]

  const isActive = (path: string) => {
    if (path.startsWith('/#')) {
      return location.pathname === '/' && location.hash === path.replace('/', '')
    }
    return location.pathname === path
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F7FAF5] text-[#1D2B25] font-sans antialiased selection:bg-[#A8C3A0]/40 selection:text-[#1D2B25]">
      {/* Top Banner Informativo Sutil */}
      <div className="bg-[#2F6B4F] text-white text-xs py-2 px-4 border-b border-[#2F6B4F]/20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#A8C3A0] animate-pulse"></span>
              Rede de 7 Boutiques em São Paulo e Região
            </span>
            <span className="hidden md:inline text-white/40">•</span>
            <span className="hidden md:inline text-white/80">
              Atendimento com horário exclusivo e consultoria especializada
            </span>
          </div>
          <div className="flex items-center gap-4 text-white/90">
            <a
              href="https://wa.me/5511984521134"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              <Phone className="w-3 h-3 text-[#A8C3A0]" />
              <span>(11) 98452-1134</span>
            </a>
            {isAuth && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-white/10 px-2 py-0.5 rounded-full text-[#A8C3A0]">
                <ShieldCheck className="w-3 h-3" />
                Painel Conectado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Header Fixo */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgba(47,107,79,0.08)] border-b border-[#A8C3A0]/30 py-3'
            : 'bg-white/70 backdrop-blur-sm border-b border-transparent py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo Monograma B */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#2F6B4F] to-[#1D2B25] flex items-center justify-center text-white shadow-md shadow-[#2F6B4F]/20 group-hover:scale-105 transition-transform duration-200 border-2 border-[#A8C3A0]/50">
              <span className="font-serif italic text-2xl font-bold leading-none tracking-tight text-[#F7FAF5]">
                B
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-semibold text-lg sm:text-xl tracking-tight text-[#1D2B25] leading-tight group-hover:text-[#2F6B4F] transition-colors">
                Boutique de Revestimentos
              </span>
              <span className="text-[11px] font-sans uppercase tracking-[0.2em] text-[#5E6E64] font-medium">
                Alto Padrão • São Paulo
              </span>
            </div>
          </Link>

          {/* Menu Desktop */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'text-[#2F6B4F] bg-[#EAF2E8] font-semibold'
                      : 'text-[#5E6E64] hover:text-[#1D2B25] hover:bg-[#EAF2E8]/60'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* CTA Agendar Visita Desktop */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              to="/agendar"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-sm font-medium shadow-sm hover:shadow-md hover:shadow-[#2F6B4F]/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <Calendar className="w-4 h-4 text-[#A8C3A0]" />
              <span>Agendar Visita</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-70" />
            </Link>
          </div>

          {/* Botão Hambúrguer Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-[#1D2B25] hover:bg-[#EAF2E8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay escuro translúcido */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Painel lateral deslizante */}
          <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-white shadow-2xl p-6 flex flex-col justify-between border-l border-[#A8C3A0]/30 animate-fade-in">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-[#EAF2E8]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#2F6B4F] flex items-center justify-center text-white">
                    <span className="font-serif italic text-lg font-bold">B</span>
                  </div>
                  <span className="font-serif font-semibold text-base text-[#1D2B25]">
                    Boutique
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-[#5E6E64] hover:bg-[#EAF2E8]"
                  aria-label="Fechar menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Links de navegação mobile */}
              <nav className="mt-6 flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-2xl text-base font-medium flex items-center justify-between ${
                      isActive(link.href)
                        ? 'bg-[#EAF2E8] text-[#2F6B4F] font-semibold'
                        : 'text-[#1D2B25] hover:bg-[#F7FAF5]'
                    }`}
                  >
                    <span>{link.label}</span>
                    <ArrowRight className="w-4 h-4 opacity-40" />
                  </Link>
                ))}
              </nav>

              <div className="mt-6 pt-6 border-t border-[#EAF2E8]">
                <Link
                  to="/agendar"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-[#2F6B4F] text-white text-base font-medium shadow-md shadow-[#2F6B4F]/20"
                >
                  <Calendar className="w-4 h-4 text-[#A8C3A0]" />
                  <span>Agendar Visita Agora</span>
                </Link>
              </div>
            </div>

            {/* Informações de contato no Drawer */}
            <div className="pt-6 border-t border-[#EAF2E8] text-xs text-[#5E6E64] space-y-2">
              <p className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#2F6B4F]" />
                <span>Seg. a Sáb., 9h às 18h</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#2F6B4F]" />
                <span>(11) 98452-1134 (WhatsApp)</span>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#2F6B4F]" />
                <span>7 Boutiques em SP e Região</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1">{children}</main>

      {/* Rodapé Global */}
      <footer className="bg-[#1D2B25] text-white pt-16 pb-12 border-t border-[#2F6B4F]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/10">
            {/* Coluna 1: Marca e Contato Central */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2F6B4F] flex items-center justify-center text-white border border-[#A8C3A0]/40">
                  <span className="font-serif italic text-xl font-bold">B</span>
                </div>
                <div>
                  <h3 className="font-serif font-bold text-xl text-white">
                    Boutique de Revestimentos
                  </h3>
                  <p className="text-xs text-[#A8C3A0] tracking-wider uppercase font-medium">
                    Alto Padrão & Acabamentos
                  </p>
                </div>
              </div>

              <p className="text-sm text-white/70 leading-relaxed max-w-sm">
                Rede exclusiva de 7 boutiques especializadas em porcelanatos de grandes formatos,
                mármores nobres e metais refinados para arquitetura de excelência em São Paulo.
              </p>

              <div className="space-y-2.5 pt-2 text-sm text-white/80">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#A8C3A0] mt-0.5 shrink-0" />
                  <span>Central de Atendimento: Vila Olímpia, São Paulo - SP</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#A8C3A0] shrink-0" />
                  <a
                    href="https://wa.me/5511984521134"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    (11) 98452-1134 (WhatsApp Geral)
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#A8C3A0] shrink-0" />
                  <a
                    href="mailto:contato@boutiquerevestimentos.com.br"
                    className="hover:text-white transition-colors"
                  >
                    contato@boutiquerevestimentos.com.br
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#A8C3A0] shrink-0" />
                  <span>
                    {HORARIOS_ATENDIMENTO.dias}, {HORARIOS_ATENDIMENTO.horario}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#2F6B4F] flex items-center justify-center text-white transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#2F6B4F] flex items-center justify-center text-white transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="https://wa.me/5511984521134"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#2F6B4F] flex items-center justify-center text-white transition-colors"
                  aria-label="WhatsApp"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Coluna 2: Nossas 7 Lojas */}
            <div className="lg:col-span-5 space-y-4">
              <h4 className="font-serif font-semibold text-lg text-white border-b border-white/10 pb-2">
                Nossas 7 Boutiques em SP e Região
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-white/75">
                {LOJAS.map((loja) => (
                  <div
                    key={loja.id}
                    className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors border border-white/5"
                  >
                    <p className="font-semibold text-white flex items-center justify-between">
                      <span>{loja.nome}</span>
                      <a
                        href={loja.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#A8C3A0] hover:text-white inline-flex items-center gap-0.5"
                        title="Ver no mapa"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                    <p className="text-white/60 line-clamp-1 mt-0.5">{loja.endereco}</p>
                    <p className="text-[#A8C3A0] font-mono mt-1">{loja.telefone}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Coluna 3: Links rápidos e Acesso */}
            <div className="lg:col-span-3 space-y-4">
              <h4 className="font-serif font-semibold text-lg text-white border-b border-white/10 pb-2">
                Acesso Rápido
              </h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li>
                  <Link
                    to="/"
                    className="hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <ArrowRight className="w-3 h-3 text-[#A8C3A0]" />
                    Página Inicial
                  </Link>
                </li>
                <li>
                  <Link
                    to="/servicos"
                    className="hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <ArrowRight className="w-3 h-3 text-[#A8C3A0]" />
                    Serviços e Catálogo
                  </Link>
                </li>
                <li>
                  <Link
                    to="/servicos#equipe"
                    className="hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <ArrowRight className="w-3 h-3 text-[#A8C3A0]" />
                    Especialistas & Equipe
                  </Link>
                </li>
                <li>
                  <Link
                    to="/agendar"
                    className="hover:text-white transition-colors flex items-center gap-1.5 font-medium text-[#A8C3A0]"
                  >
                    <ArrowRight className="w-3 h-3 text-[#A8C3A0]" />
                    Agendar Visita Exclusiva
                  </Link>
                </li>
                <li>
                  <Link
                    to="/pedidos"
                    className="hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <ArrowRight className="w-3 h-3 text-[#A8C3A0]" />
                    Painel de Solicitações
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="hover:text-white transition-colors flex items-center gap-1.5 text-xs text-white/50"
                  >
                    <ArrowRight className="w-3 h-3 text-white/40" />
                    Acesso da Equipe (Login)
                  </Link>
                </li>
              </ul>

              <div className="pt-2">
                <Link
                  to="/agendar"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#A8C3A0] hover:bg-[#8eaf85] text-[#1D2B25] text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Reservar Horário</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Linha de Copyright */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
            <p>
              © {new Date().getFullYear()} Boutique de Revestimentos de Alto Padrão. Todos os
              direitos reservados.
            </p>
            <p className="flex items-center gap-3">
              <span>São Paulo • Barueri • Santana de Parnaíba • Guarulhos</span>
              <span>•</span>
              <span className="text-[#A8C3A0]">Porcelanatos, Mármores e Metais Premium</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
