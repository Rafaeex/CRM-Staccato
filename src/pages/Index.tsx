import { Link } from 'react-router-dom'
import {
  Calendar,
  MapPin,
  ExternalLink,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Gem,
  Award,
  Layers,
  ChevronDown,
  Phone,
} from 'lucide-react'
import { LOJAS, HORARIOS_ATENDIMENTO } from '@/data/boutiqueData'

export default function Index() {
  const scrollToLojas = () => {
    const el = document.getElementById('lojas')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. HERO EM TELA CHEIA */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        {/* Imagem de fundo mármore claro premium via Curling CDN */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
          style={{
            backgroundImage: `url('https://img.usecurling.com/p/1920/1080?q=white%20marble%20stone%20texture&color=light')`,
          }}
        />

        {/* Gradiente sobreposto verde-claro suave e translúcido */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#F7FAF5]/85 via-[#EAF2E8]/75 to-[#F7FAF5]" />

        {/* Elemento de iluminação e brilho orgânico */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#A8C3A0]/25 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center flex flex-col items-center">
          {/* Badge Orgânico */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-[#A8C3A0]/60 shadow-sm text-xs font-semibold tracking-wider text-[#2F6B4F] uppercase mb-6 backdrop-blur-sm animate-fade-in-down">
            <Sparkles className="w-3.5 h-3.5 text-[#C9A063]" />
            <span>Rede Exclusiva • 7 Boutiques em SP</span>
          </div>

          {/* Título Grande em Serifa Itálica */}
          <h1 className="font-serif italic font-medium text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-[#1D2B25] tracking-tight leading-[1.15] max-w-4xl animate-fade-in">
            Revestimentos de Alto Padrão para Projetos Sofisticados
          </h1>

          {/* Subtítulo */}
          <p className="mt-6 text-lg sm:text-xl text-[#5E6E64] max-w-2xl font-light leading-relaxed">
            Rede de 7 boutiques em São Paulo e região — porcelanatos de grandes formatos, mármores
            nobres, pedras naturais e metais premium para residências de distinção.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link
              to="/agendar"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-base font-semibold shadow-lg shadow-[#2F6B4F]/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <Calendar className="w-5 h-5 text-[#A8C3A0]" />
              <span>Agendar Visita</span>
              <ArrowRight className="w-4 h-4 text-white/80" />
            </Link>

            <button
              type="button"
              onClick={scrollToLojas}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white/85 hover:bg-white text-[#1D2B25] text-base font-semibold border-2 border-[#A8C3A0]/60 hover:border-[#2F6B4F] shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 backdrop-blur-sm"
            >
              <MapPin className="w-5 h-5 text-[#2F6B4F]" />
              <span>Conhecer Lojas</span>
            </button>
          </div>

          {/* Destaque rápido no rodapé do Hero */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-[#5E6E64] font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#2F6B4F]" /> Atendimento personalizado com hora
              marcada
            </span>
            <span className="hidden sm:inline text-[#A8C3A0]">•</span>
            <span className="flex items-center gap-1.5">
              <Gem className="w-4 h-4 text-[#C9A063]" /> Marcas nacionais e internacionais de
              referência
            </span>
          </div>

          {/* Ícone de scroll com bounce suave */}
          <div className="mt-14 animate-bounce">
            <button
              onClick={scrollToLojas}
              className="p-2 rounded-full text-[#5E6E64] hover:text-[#2F6B4F] transition-colors focus:outline-none"
              aria-label="Rolar para ver mais"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. SEÇÃO "SOBRE A REDE" COM DESTAQUES */}
      <section className="py-20 bg-white border-y border-[#A8C3A0]/25 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase font-bold tracking-[0.25em] text-[#2F6B4F]">
              Tradição e Curadoria
            </span>
            <h2 className="font-serif italic font-semibold text-3xl sm:text-4xl text-[#1D2B25] mt-2">
              A Essência da Boutique de Revestimentos
            </h2>
            <p className="mt-4 text-[#5E6E64] text-base leading-relaxed">
              Com presença consolidada nos principais polos de arquitetura e design do Estado de São
              Paulo, nossas boutiques oferecem uma experiência sensorial completa: iluminação
              técnica especializada, salas de paginação privada e assessoria integral de engenheiros
              e designers.
            </p>
          </div>

          {/* Grid de Destaques Numéricos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#F7FAF5] p-8 rounded-[24px] border border-[#A8C3A0]/30 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#EAF2E8] flex items-center justify-center text-[#2F6B4F] mb-4">
                <MapPin className="w-7 h-7" />
              </div>
              <span className="font-serif font-bold text-4xl sm:text-5xl text-[#2F6B4F] tracking-tight">
                7 Lojas
              </span>
              <h3 className="font-serif text-lg font-semibold text-[#1D2B25] mt-2">
                Presença Estratégica
              </h3>
              <p className="text-sm text-[#5E6E64] mt-2">
                Unidades em bairros nobres da capital (Vila Olímpia, Higienópolis, Moema, Tatuapé) e
                regiões de Alphaville, Santana de Parnaíba e Guarulhos.
              </p>
            </div>

            <div className="bg-[#F7FAF5] p-8 rounded-[24px] border border-[#A8C3A0]/30 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#EAF2E8] flex items-center justify-center text-[#C9A063] mb-4">
                <Gem className="w-7 h-7" />
              </div>
              <span className="font-serif font-bold text-4xl sm:text-5xl text-[#2F6B4F] tracking-tight">
                +500 Materiais
              </span>
              <h3 className="font-serif text-lg font-semibold text-[#1D2B25] mt-2">
                Acervo Premium
              </h3>
              <p className="text-sm text-[#5E6E64] mt-2">
                Grandes formatos até 160x320cm, lâminas ultracompactas, mármores selecionados em
                jazida e metais com acabamentos escovados e PVD.
              </p>
            </div>

            <div className="bg-[#F7FAF5] p-8 rounded-[24px] border border-[#A8C3A0]/30 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#EAF2E8] flex items-center justify-center text-[#2F6B4F] mb-4">
                <Award className="w-7 h-7" />
              </div>
              <span className="font-serif font-bold text-4xl sm:text-5xl text-[#2F6B4F] tracking-tight">
                +15 Anos
              </span>
              <h3 className="font-serif text-lg font-semibold text-[#1D2B25] mt-2">
                Experiência e Confiança
              </h3>
              <p className="text-sm text-[#5E6E64] mt-2">
                Mais de 15 anos transformando projetos de arquitetos, designers de renome e clientes
                exigentes em ambientes memoráveis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SEÇÃO "NOSSAS LOJAS" (Cards das 7 Lojas) */}
      <section id="lojas" className="py-24 bg-[#F7FAF5] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
            <div>
              <span className="text-xs uppercase font-bold tracking-[0.25em] text-[#2F6B4F]">
                Rede de Atendimento
              </span>
              <h2 className="font-serif italic font-semibold text-3xl sm:text-4xl text-[#1D2B25] mt-2">
                Nossas 7 Boutiques em SP e Região
              </h2>
              <p className="mt-3 text-[#5E6E64] text-base max-w-xl">
                Escolha a unidade mais conveniente para o seu agendamento. Todas as lojas contam com
                estacionamento privativo com manobrista e salas de especificação técnica.
              </p>
            </div>

            <Link
              to="/agendar"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2F6B4F] text-white text-sm font-semibold hover:bg-[#25563F] shadow-sm transition-all shrink-0 self-start md:self-auto"
            >
              <Calendar className="w-4 h-4 text-[#A8C3A0]" />
              <span>Agendar na Loja Ideal</span>
            </Link>
          </div>

          {/* Grid dos 7 Cards de Lojas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {LOJAS.map((loja, idx) => (
              <div
                key={loja.id}
                className="bg-white rounded-[24px] p-6 border border-[#A8C3A0]/35 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-lg hover:border-[#2F6B4F]/50 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-7 h-7 rounded-full bg-[#EAF2E8] text-[#2F6B4F] text-xs font-bold flex items-center justify-center font-serif">
                      0{idx + 1}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[#F7FAF5] text-[#5E6E64] font-medium border border-[#A8C3A0]/30">
                      {loja.cidade}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-xl text-[#1D2B25] group-hover:text-[#2F6B4F] transition-colors">
                    {loja.nome}
                  </h3>

                  <div className="mt-3 flex items-start gap-2 text-sm text-[#5E6E64]">
                    <MapPin className="w-4 h-4 text-[#2F6B4F] mt-0.5 shrink-0" />
                    <p className="line-clamp-2 leading-relaxed">{loja.endereco}</p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#EAF2E8] space-y-1 text-xs text-[#5E6E64]">
                    <p className="flex items-center gap-1.5 font-mono text-[#1D2B25]">
                      <Phone className="w-3.5 h-3.5 text-[#2F6B4F]" />
                      <span>{loja.telefone}</span>
                    </p>
                    <p className="text-[11px] text-[#5E6E64]">
                      {HORARIOS_ATENDIMENTO.dias}, 9h–18h
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#EAF2E8] flex items-center justify-between gap-2">
                  <a
                    href={loja.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2F6B4F] hover:text-[#1D2B25] hover:underline transition-colors"
                  >
                    <span>Ver no mapa</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <Link
                    to={`/agendar?loja=${encodeURIComponent(loja.nome)}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#EAF2E8] hover:bg-[#2F6B4F] text-[#2F6B4F] hover:text-white text-xs font-medium transition-all"
                  >
                    <span>Agendar nesta</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}

            {/* Card Decorativo de Resumo da Rede */}
            <div className="bg-gradient-to-br from-[#2F6B4F] to-[#1D2B25] text-white rounded-[24px] p-6 shadow-md flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#A8C3A0] mb-4">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-serif italic font-semibold text-2xl text-white">
                  Consultoria sem Espera
                </h3>
                <p className="mt-3 text-sm text-white/80 leading-relaxed">
                  Agende sua visita com antecedência. Ao chegar, seu consultor dedicado já terá
                  preparado amostras selecionadas de acordo com as preferências do seu projeto.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/15">
                <Link
                  to="/agendar"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-[#A8C3A0] hover:bg-[#92b589] text-[#1D2B25] text-xs font-bold uppercase tracking-wider transition-all"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Escolher Unidade</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SEÇÃO "HORÁRIOS" COM CTA REPETIDO */}
      <section className="py-20 bg-gradient-to-br from-[#EAF2E8]/60 via-white to-[#EAF2E8]/50 border-t border-[#A8C3A0]/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-[24px] p-8 sm:p-12 border border-[#A8C3A0]/40 shadow-lg shadow-[#2F6B4F]/5 relative overflow-hidden">
            {/* Ornamento de fundo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A8C3A0]/15 rounded-full blur-2xl pointer-events-none" />

            <div className="w-16 h-16 rounded-full bg-[#EAF2E8] flex items-center justify-center text-[#2F6B4F] mx-auto mb-6 shadow-inner">
              <Clock className="w-8 h-8" />
            </div>

            <span className="text-xs uppercase font-bold tracking-[0.25em] text-[#2F6B4F]">
              Disponibilidade e Horários
            </span>

            <h2 className="font-serif italic font-semibold text-3xl sm:text-4xl text-[#1D2B25] mt-2">
              Horário de Funcionamento da Rede
            </h2>

            <div className="mt-6 inline-flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 px-6 py-3 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/30 text-[#1D2B25]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#2F6B4F]" />
                <span className="font-semibold">{HORARIOS_ATENDIMENTO.dias}</span>
              </div>
              <span className="hidden sm:inline text-[#A8C3A0]">•</span>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2F6B4F]" />
                <span className="font-semibold text-[#2F6B4F]">{HORARIOS_ATENDIMENTO.horario}</span>
              </div>
            </div>

            <p className="mt-5 text-[#5E6E64] text-sm max-w-lg mx-auto leading-relaxed">
              {HORARIOS_ATENDIMENTO.descricao} Atendemos também com agendamentos exclusivos aos
              sábados para famílias e escritórios de arquitetura.
            </p>

            {/* CTA Repetido */}
            <div className="mt-8 pt-6 border-t border-[#EAF2E8] flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/agendar"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-base font-semibold shadow-lg shadow-[#2F6B4F]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Calendar className="w-5 h-5 text-[#A8C3A0]" />
                <span>Agendar Minha Visita Agora</span>
              </Link>

              <Link
                to="/servicos"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-transparent hover:bg-[#EAF2E8] text-[#1D2B25] text-sm font-semibold transition-colors"
              >
                <span>Ver Serviços & Profissionais</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
