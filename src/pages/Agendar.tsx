import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Phone,
  Mail,
  User,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { LOJAS, SERVICOS, HORARIOS_SLOTS } from '@/data/boutiqueData'
import { SolicitacaoInput, Solicitacao } from '@/types/boutique'
import { criarSolicitacao, buildWhatsAppLink } from '@/services/solicitacoes'
import { useToast } from '@/hooks/use-toast'

interface FormErrors {
  servico?: string
  loja?: string
  data_preferida?: string
  horario_preferido?: string
  cliente_nome?: string
  telefone?: string
  email?: string
}

export default function AgendarPage() {
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  // Valores padrão / query params
  const paramServico = searchParams.get('servico') || ''
  const paramLoja = searchParams.get('loja') || ''

  // Obter data mínima (amanhã no formato YYYY-MM-DD)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  const [formData, setFormData] = useState<SolicitacaoInput>({
    servico: paramServico || SERVICOS[0].titulo,
    loja: paramLoja || LOJAS[0].nome,
    data_preferida: minDate,
    horario_preferido: '10:00',
    cliente_nome: '',
    telefone: '',
    email: '',
    mensagem: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pedidoConfirmado, setPedidoConfirmado] = useState<Solicitacao | null>(null)
  const [whatsAppLink, setWhatsAppLink] = useState<string>('')

  // Atualizar quando mudar query params
  useEffect(() => {
    if (paramServico) {
      setFormData((prev) => ({ ...prev, servico: paramServico }))
    }
    if (paramLoja) {
      setFormData((prev) => ({ ...prev, loja: paramLoja }))
    }
  }, [paramServico, paramLoja])

  // Máscara brasileira para telefone: (11) 9XXXX-XXXX
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    if (numbers.length <= 2) {
      return numbers.length ? `(${numbers}` : ''
    }
    if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    }
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const formatted = formatPhone(raw)
    setFormData((prev) => ({ ...prev, telefone: formatted }))
    if (errors.telefone) {
      setErrors((prev) => ({ ...prev, telefone: undefined }))
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.servico.trim()) {
      newErrors.servico = 'Por favor, selecione o serviço desejado.'
    }

    if (!formData.loja.trim()) {
      newErrors.loja = 'Por favor, selecione uma das nossas 7 lojas.'
    }

    if (!formData.data_preferida) {
      newErrors.data_preferida = 'Selecione uma data para o agendamento.'
    } else {
      const selected = new Date(formData.data_preferida + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selected <= today) {
        newErrors.data_preferida = 'A data deve ser a partir de amanhã.'
      }
    }

    if (!formData.horario_preferido.trim()) {
      newErrors.horario_preferido = 'Selecione um horário preferido.'
    }

    if (!formData.cliente_nome.trim() || formData.cliente_nome.trim().length < 3) {
      newErrors.cliente_nome = 'Informe seu nome completo (mínimo de 3 caracteres).'
    }

    // Telefone celular BR válido: no mínimo 10 ou 11 dígitos
    const phoneDigits = formData.telefone.replace(/\D/g, '')
    if (!formData.telefone.trim() || phoneDigits.length < 10) {
      newErrors.telefone = 'Informe um telefone/WhatsApp válido com DDD: (11) 9XXXX-XXXX.'
    }

    // E-mail regex simples
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Informe um e-mail válido (ex.: seu.nome@email.com).'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      toast({
        title: 'Verifique os campos do formulário',
        description: 'Por favor, corrija os erros indicados abaixo de cada campo.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const record = await criarSolicitacao(formData)

      // Montar link do WhatsApp
      const waLink = buildWhatsAppLink({
        telefone: formData.telefone,
        cliente_nome: formData.cliente_nome,
        servico: formData.servico,
        loja: formData.loja,
        data_preferida: formData.data_preferida,
        horario_preferido: formData.horario_preferido,
      })

      setWhatsAppLink(waLink)
      setPedidoConfirmado(record)

      toast({
        title: 'Agendamento solicitado com sucesso!',
        description: 'Redirecionando para confirmação no WhatsApp...',
      })

      // Tentar abrir nova aba automaticamente
      try {
        const opened = window.open(waLink, '_blank', 'noopener,noreferrer')
        if (!opened) {
          // Bloqueador de pop-ups impediu
          console.warn('Popup blocked, fallback available on screen.')
        }
      } catch (err) {
        console.warn('Could not auto-open WhatsApp tab:', err)
      }
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error)
      toast({
        title: 'Erro ao registrar agendamento',
        description: 'Ocorreu uma instabilidade ao salvar sua solicitação. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // TELA DE SUCESSO (Bloco 4: Confirmação pelo WhatsApp)
  if (pedidoConfirmado) {
    const [ano, mes, dia] = pedidoConfirmado.data_preferida.includes('-')
      ? pedidoConfirmado.data_preferida.split('-')
      : ['', '', pedidoConfirmado.data_preferida]
    const dataBr = dia ? `${dia}/${mes}/${ano}` : pedidoConfirmado.data_preferida

    return (
      <div className="min-h-[85vh] bg-gradient-to-b from-[#EAF2E8]/60 via-[#F7FAF5] to-[#F7FAF5] py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white rounded-[24px] p-8 sm:p-12 border border-[#A8C3A0]/40 shadow-xl shadow-[#2F6B4F]/5 text-center animate-fade-in-up">
          {/* Ícone de Sucesso */}
          <div className="w-20 h-20 rounded-full bg-[#EAF2E8] border-2 border-[#A8C3A0]/60 flex items-center justify-center text-[#2F6B4F] mx-auto mb-6 shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <span className="text-xs uppercase font-bold tracking-[0.25em] text-[#2F6B4F]">
            Solicitação Registrada
          </span>

          <h1 className="font-serif italic font-semibold text-3xl sm:text-4xl text-[#1D2B25] mt-2">
            Agendamento Quase Pronto!
          </h1>

          <p className="mt-3 text-base text-[#5E6E64] max-w-lg mx-auto">
            Seu pedido foi registrado em nossa rede sob o status{' '}
            <span className="font-semibold text-[#D9A441] bg-[#F5C84C]/20 px-2 py-0.5 rounded-full text-xs">
              Pendente
            </span>
            . Para garantir o horário e notificar a equipe da loja, confirme via WhatsApp.
          </p>

          {/* Resumo do Pedido */}
          <div className="mt-8 p-6 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/30 text-left space-y-3">
            <h3 className="font-serif font-bold text-lg text-[#1D2B25] border-b border-[#EAF2E8] pb-2">
              Resumo da Visita
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-[#5E6E64] block">Cliente:</span>
                <span className="font-medium text-[#1D2B25]">{pedidoConfirmado.cliente_nome}</span>
              </div>
              <div>
                <span className="text-xs text-[#5E6E64] block">WhatsApp:</span>
                <span className="font-medium text-[#1D2B25]">{pedidoConfirmado.telefone}</span>
              </div>
              <div>
                <span className="text-xs text-[#5E6E64] block">Serviço:</span>
                <span className="font-medium text-[#2F6B4F]">{pedidoConfirmado.servico}</span>
              </div>
              <div>
                <span className="text-xs text-[#5E6E64] block">Loja Escolhida:</span>
                <span className="font-medium text-[#1D2B25]">{pedidoConfirmado.loja}</span>
              </div>
              <div>
                <span className="text-xs text-[#5E6E64] block">Data:</span>
                <span className="font-medium text-[#1D2B25]">{dataBr}</span>
              </div>
              <div>
                <span className="text-xs text-[#5E6E64] block">Horário:</span>
                <span className="font-medium text-[#1D2B25]">
                  {pedidoConfirmado.horario_preferido}
                </span>
              </div>
            </div>

            {pedidoConfirmado.mensagem && (
              <div className="pt-2 border-t border-[#EAF2E8] text-xs">
                <span className="text-[#5E6E64] block font-medium">Observações:</span>
                <p className="italic text-[#1D2B25] mt-0.5">{pedidoConfirmado.mensagem}</p>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-base font-semibold shadow-lg shadow-[#2F6B4F]/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Phone className="w-5 h-5 text-[#A8C3A0]" />
              <span>Abrir WhatsApp para Confirmar</span>
              <ExternalLink className="w-4 h-4 text-white/80" />
            </a>

            <Link
              to="/pedidos"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-[#EAF2E8] hover:bg-[#A8C3A0]/30 text-[#2F6B4F] text-sm font-semibold transition-colors"
            >
              <span>Ir para o Painel de Pedidos</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="mt-4 text-xs text-[#5E6E64]">
            * Caso a janela do WhatsApp não tenha aberto automaticamente, clique no botão verde
            acima.
          </p>
        </div>
      </div>
    )
  }

  // TELA DO FORMULÁRIO (Bloco 3)
  return (
    <div className="min-h-screen bg-[#F7FAF5] py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Cabeçalho do Agendamento */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EAF2E8] border border-[#A8C3A0]/50 text-xs font-semibold tracking-wider text-[#2F6B4F] uppercase mb-3">
            <Calendar className="w-3.5 h-3.5 text-[#2F6B4F]" />
            <span>Consultoria Sob Medida</span>
          </div>
          <h1 className="font-serif italic font-semibold text-3xl sm:text-5xl text-[#1D2B25] tracking-tight">
            Agendar Visita
          </h1>
          <p className="mt-4 text-base text-[#5E6E64] leading-relaxed">
            Selecione a loja e o horário ideal. Nossos consultores preparam a vitrine e as amostras
            exclusivas antes de você chegar.
          </p>
        </div>

        {/* Formulário em 2 Colunas no Desktop / 1 Coluna no Mobile */}
        <div className="bg-white rounded-[24px] p-6 sm:p-10 lg:p-12 border border-[#A8C3A0]/35 shadow-xl shadow-[#2F6B4F]/5">
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {/* COLUNA ESQUERDA: Detalhes da Visita */}
              <div className="space-y-6">
                <div className="border-b border-[#EAF2E8] pb-3">
                  <h2 className="font-serif font-bold text-xl text-[#1D2B25] flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#2F6B4F]" />
                    <span>1. Preferências da Visita</span>
                  </h2>
                  <p className="text-xs text-[#5E6E64] mt-1">
                    Escolha o tipo de projeto e a loja mais conveniente.
                  </p>
                </div>

                {/* 1. Serviço desejado */}
                <div>
                  <label
                    htmlFor="servico"
                    className="block text-sm font-semibold text-[#1D2B25] mb-1.5"
                  >
                    Serviço Desejado <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="servico"
                    name="servico"
                    value={formData.servico}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-2xl bg-[#F7FAF5] border text-sm text-[#1D2B25] transition-all focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] ${
                      errors.servico ? 'border-red-500 bg-red-50/20' : 'border-[#A8C3A0]/50'
                    }`}
                  >
                    {SERVICOS.map((s) => (
                      <option key={s.id} value={s.titulo}>
                        {s.titulo} ({s.destaque})
                      </option>
                    ))}
                  </select>
                  {errors.servico && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.servico}</span>
                    </p>
                  )}
                </div>

                {/* 2. Loja de preferência */}
                <div>
                  <label
                    htmlFor="loja"
                    className="block text-sm font-semibold text-[#1D2B25] mb-1.5"
                  >
                    Loja de Preferência <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="loja"
                    name="loja"
                    value={formData.loja}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-2xl bg-[#F7FAF5] border text-sm text-[#1D2B25] transition-all focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] ${
                      errors.loja ? 'border-red-500 bg-red-50/20' : 'border-[#A8C3A0]/50'
                    }`}
                  >
                    {LOJAS.map((l) => (
                      <option key={l.id} value={l.nome}>
                        {l.nome} — {l.cidade}
                      </option>
                    ))}
                  </select>
                  {errors.loja && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.loja}</span>
                    </p>
                  )}
                </div>

                {/* 3. Data preferida e 4. Horário preferido */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="data_preferida"
                      className="block text-sm font-semibold text-[#1D2B25] mb-1.5"
                    >
                      Data Preferida <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        id="data_preferida"
                        name="data_preferida"
                        min={minDate}
                        value={formData.data_preferida}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-2xl bg-[#F7FAF5] border text-sm text-[#1D2B25] transition-all focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] ${
                          errors.data_preferida
                            ? 'border-red-500 bg-red-50/20'
                            : 'border-[#A8C3A0]/50'
                        }`}
                      />
                    </div>
                    {errors.data_preferida && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.data_preferida}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="horario_preferido"
                      className="block text-sm font-semibold text-[#1D2B25] mb-1.5"
                    >
                      Horário <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="horario_preferido"
                      name="horario_preferido"
                      value={formData.horario_preferido}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-2xl bg-[#F7FAF5] border text-sm text-[#1D2B25] transition-all focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] ${
                        errors.horario_preferido
                          ? 'border-red-500 bg-red-50/20'
                          : 'border-[#A8C3A0]/50'
                      }`}
                    >
                      {HORARIOS_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                    {errors.horario_preferido && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.horario_preferido}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#EAF2E8]/60 border border-[#A8C3A0]/30 text-xs text-[#5E6E64] space-y-1">
                  <div className="flex items-center gap-2 font-medium text-[#2F6B4F]">
                    <Clock className="w-4 h-4" />
                    <span>Intervalos de 30 minutos (9h às 18h)</span>
                  </div>
                  <p>
                    Cada sessão conta com sala de especificação exclusiva e apresentação física de
                    lâminas e revestimentos.
                  </p>
                </div>
              </div>

              {/* COLUNA DIREITA: Dados de Contato e Mensagem */}
              <div className="space-y-6">
                <div className="border-b border-[#EAF2E8] pb-3">
                  <h2 className="font-serif font-bold text-xl text-[#1D2B25] flex items-center gap-2">
                    <User className="w-5 h-5 text-[#2F6B4F]" />
                    <span>2. Seus Dados de Contato</span>
                  </h2>
                  <p className="text-xs text-[#5E6E64] mt-1">
                    Enviaremos a confirmação e a rota da boutique para seu WhatsApp.
                  </p>
                </div>

                {/* 5. Nome Completo */}
                <div>
                  <label
                    htmlFor="cliente_nome"
                    className="block text-sm font-semibold text-[#1D2B25] mb-1.5"
                  >
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="cliente_nome"
                      name="cliente_nome"
                      placeholder="Ex.: Mariana Alcântara"
                      value={formData.cliente_nome}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-2xl bg-[#F7FAF5] border text-sm text-[#1D2B25] placeholder:text-[#5E6E64]/50 transition-all focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] ${
                        errors.cliente_nome ? 'border-red-500 bg-red-50/20' : 'border-[#A8C3A0]/50'
                      }`}
                    />
                  </div>
                  {errors.cliente_nome && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.cliente_nome}</span>
                    </p>
                  )}
                </div>

                {/* 6. Telefone/WhatsApp com máscara */}
                <div>
                  <label
                    htmlFor="telefone"
                    className="block text-sm font-semibold text-[#1D2B25] mb-1.5"
                  >
                    Telefone / WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      id="telefone"
                      name="telefone"
                      placeholder="(11) 98765-4321"
                      value={formData.telefone}
                      onChange={handlePhoneChange}
                      className={`w-full px-4 py-3 rounded-2xl bg-[#F7FAF5] border text-sm text-[#1D2B25] placeholder:text-[#5E6E64]/50 transition-all focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] font-mono ${
                        errors.telefone ? 'border-red-500 bg-red-50/20' : 'border-[#A8C3A0]/50'
                      }`}
                    />
                  </div>
                  {errors.telefone && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.telefone}</span>
                    </p>
                  )}
                </div>

                {/* 7. E-mail com validação */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-[#1D2B25] mb-1.5"
                  >
                    E-mail <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="seu.nome@exemplo.com.br"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-2xl bg-[#F7FAF5] border text-sm text-[#1D2B25] placeholder:text-[#5E6E64]/50 transition-all focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] ${
                        errors.email ? 'border-red-500 bg-red-50/20' : 'border-[#A8C3A0]/50'
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>

                {/* 8. Mensagem opcional */}
                <div>
                  <label
                    htmlFor="mensagem"
                    className="block text-sm font-semibold text-[#1D2B25] mb-1.5 flex items-center justify-between"
                  >
                    <span>Mensagem ou Projeto (Opcional)</span>
                    <span className="text-xs text-[#5E6E64] font-normal">
                      Ex.: área externa, 120m²
                    </span>
                  </label>
                  <textarea
                    id="mensagem"
                    name="mensagem"
                    rows={3}
                    placeholder="Conte um pouco sobre seu projeto: tipo de ambiente, metragem ou se já possui arquiteto responsável..."
                    value={formData.mensagem}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-sm text-[#1D2B25] placeholder:text-[#5E6E64]/50 transition-all focus:outline-none focus:ring-2 focus:ring-[#2F6B4F] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Rodapé do Formulário e Botão de Envio */}
            <div className="mt-10 pt-8 border-t border-[#EAF2E8] flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3 text-xs text-[#5E6E64]">
                <ShieldCheck className="w-5 h-5 text-[#2F6B4F] shrink-0" />
                <span>
                  Seus dados estão protegidos. Após o envio, você será direcionado ao WhatsApp com o
                  agendamento pré-formatado.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-4 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-base font-semibold shadow-lg shadow-[#2F6B4F]/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Gravando Agendamento...</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-5 h-5 text-[#A8C3A0]" />
                    <span>Confirmar Agendamento</span>
                    <ArrowRight className="w-4 h-4 text-white/80" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
