import { Link } from 'react-router-dom'
import {
  Sparkles,
  LayoutGrid,
  Gem,
  Wrench,
  PackageCheck,
  Compass,
  Calendar,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  Phone,
} from 'lucide-react'
import { SERVICOS, PROFISSIONAIS } from '@/data/boutiqueData'

export default function ServicosPage() {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="w-6 h-6 text-[#2F6B4F]" />
      case 'LayoutGrid':
        return <LayoutGrid className="w-6 h-6 text-[#2F6B4F]" />
      case 'Gem':
        return <Gem className="w-6 h-6 text-[#C9A063]" />
      case 'Wrench':
        return <Wrench className="w-6 h-6 text-[#2F6B4F]" />
      case 'PackageCheck':
        return <PackageCheck className="w-6 h-6 text-[#2F6B4F]" />
      case 'Compass':
        return <Compass className="w-6 h-6 text-[#2F6B4F]" />
      default:
        return <Sparkles className="w-6 h-6 text-[#2F6B4F]" />
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header da Página */}
      <section className="bg-gradient-to-b from-[#EAF2E8]/70 via-[#F7FAF5] to-[#F7FAF5] pt-14 pb-16 border-b border-[#A8C3A0]/25">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#A8C3A0]/60 shadow-sm text-xs font-semibold tracking-wider text-[#2F6B4F] uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#C9A063]" />
            <span>Excelência em Cada Detalhe</span>
          </div>

          <h1 className="font-serif italic font-semibold text-4xl sm:text-5xl md:text-6xl text-[#1D2B25] tracking-tight">
            Serviços e Profissionais
          </h1>

          <p className="mt-5 text-lg sm:text-xl text-[#5E6E64] max-w-2xl mx-auto leading-relaxed font-light">
            Da paginação técnica à escolha de materiais raros: oferecemos assessoria completa com
            especialistas para garantir precisão e elegância ao seu projeto arquitetônico.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <Link
              to="/agendar"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-sm font-semibold shadow-md shadow-[#2F6B4F]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Calendar className="w-4 h-4 text-[#A8C3A0]" />
              <span>Agendar com um Especialista</span>
              <ArrowRight className="w-3.5 h-3.5 text-white/80" />
            </Link>
          </div>
        </div>
      </section>

      {/* SEÇÃO 1: GRADE DE 6 SERVIÇOS */}
      <section className="py-20 bg-[#F7FAF5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs uppercase font-bold tracking-[0.25em] text-[#2F6B4F]">
              Nossa Curadoria
            </span>
            <h2 className="font-serif italic font-semibold text-3xl sm:text-4xl text-[#1D2B25] mt-2">
              Soluções Sob Medida para Seu Projeto
            </h2>
            <p className="mt-3 text-sm text-[#5E6E64]">
              Conheça os 6 serviços especializados disponíveis em todas as nossas 7 boutiques.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {SERVICOS.map((servico, index) => (
              <div
                key={servico.id}
                className="bg-white rounded-[24px] p-8 border border-[#A8C3A0]/35 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-xl hover:border-[#2F6B4F]/50 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-13 h-13 p-3.5 rounded-2xl bg-[#EAF2E8] group-hover:bg-[#2F6B4F]/10 transition-colors">
                      {getIcon(servico.icone)}
                    </div>
                    <span className="text-xs font-mono font-bold text-[#5E6E64]/60">
                      0{index + 1}
                    </span>
                  </div>

                  <span className="inline-block text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full bg-[#EAF2E8] text-[#2F6B4F] mb-3">
                    {servico.destaque}
                  </span>

                  <h3 className="font-serif font-bold text-xl text-[#1D2B25] group-hover:text-[#2F6B4F] transition-colors">
                    {servico.titulo}
                  </h3>

                  <p className="mt-3 text-sm text-[#5E6E64] leading-relaxed">{servico.descricao}</p>

                  <div className="mt-6 pt-4 border-t border-[#EAF2E8] space-y-2 text-xs text-[#5E6E64]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B4F]" />
                      <span>Atendimento exclusivo em sala técnica</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B4F]" />
                      <span>Integração direta com o cronograma da obra</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-[#EAF2E8]">
                  <Link
                    to={`/agendar?servico=${encodeURIComponent(servico.titulo)}`}
                    className="inline-flex items-center justify-between w-full text-xs font-semibold text-[#2F6B4F] hover:text-[#1D2B25] group/btn transition-colors"
                  >
                    <span>Solicitar este serviço</span>
                    <span className="w-6 h-6 rounded-full bg-[#EAF2E8] flex items-center justify-center group-hover/btn:bg-[#2F6B4F] group-hover/btn:text-white transition-colors">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: EQUIPE DE PROFISSIONAIS */}
      <section id="equipe" className="py-24 bg-white border-t border-[#A8C3A0]/30 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase font-bold tracking-[0.25em] text-[#2F6B4F]">
              Corpo Técnico
            </span>
            <h2 className="font-serif italic font-semibold text-3xl sm:text-4xl text-[#1D2B25] mt-2">
              Nossa Equipe de Especialistas
            </h2>
            <p className="mt-3 text-base text-[#5E6E64]">
              Profissionais experientes prontos para orientar a paginação, resistência e harmonia
              dos materiais para o seu projeto.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {PROFISSIONAIS.map((prof) => (
              <div
                key={prof.id}
                className="bg-[#F7FAF5] rounded-[24px] overflow-hidden border border-[#A8C3A0]/35 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Foto Ilustrativa */}
                  <div className="relative h-64 overflow-hidden bg-[#EAF2E8]">
                    <img
                      src={prof.foto}
                      alt={prof.nome}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 text-white">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
                        {prof.experiencia}
                      </span>
                    </div>
                  </div>

                  {/* Detalhes */}
                  <div className="p-6">
                    <h3 className="font-serif font-bold text-xl text-[#1D2B25]">{prof.nome}</h3>
                    <p className="text-xs font-semibold text-[#2F6B4F] mt-1">{prof.cargo}</p>

                    {prof.lojaBase && (
                      <p className="text-[11px] text-[#5E6E64] mt-2 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-[#A8C3A0]" />
                        <span>Base: {prof.lojaBase}</span>
                      </p>
                    )}

                    <p className="mt-4 text-xs text-[#5E6E64] leading-relaxed">{prof.bio}</p>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <Link
                    to="/agendar"
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full bg-white hover:bg-[#2F6B4F] text-[#2F6B4F] hover:text-white border border-[#A8C3A0]/40 text-xs font-semibold transition-all shadow-sm"
                  >
                    <span>Agendar Consulta</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Banner de Atendimento Sob Medida */}
          <div className="mt-16 bg-gradient-to-r from-[#2F6B4F] to-[#1D2B25] text-white rounded-[24px] p-8 sm:p-10 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="font-serif italic font-semibold text-2xl sm:text-3xl">
                Precisa de auxílio técnico na sua obra?
              </h3>
              <p className="text-white/80 text-sm max-w-xl">
                Nossos consultores visitam o local da obra para avaliar prumo, luminosidade e pontos
                hidráulicos antes da especificação final.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <Link
                to="/agendar"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#A8C3A0] hover:bg-[#8eb384] text-[#1D2B25] text-xs font-bold uppercase tracking-wider transition-all"
              >
                <Calendar className="w-4 h-4" />
                <span>Agendar com Especialista</span>
              </Link>
              <a
                href="https://wa.me/5511984521134"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/20"
              >
                <Phone className="w-3.5 h-3.5 text-[#A8C3A0]" />
                <span>Falar no WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
