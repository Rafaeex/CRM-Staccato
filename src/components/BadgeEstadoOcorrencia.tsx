export type EstadoOperacionalOcorrencia =
  | 'Resolvida'
  | 'Atrasada'
  | 'Urgente'
  | 'Aguardando'
  | 'Nova'
  | 'Em andamento'

export interface InfoEstadoOperacional {
  estado: EstadoOperacionalOcorrencia
  label: string
  classe: string
}

/**
 * Deriva o estado operacional da ocorrência a partir da sua situação real:
 * Precedência: Atrasada > Urgente > Aguardando > Nova > Em andamento (ou Resolvida)
 * - Atrasada: prazo de resolução já venceu e a ocorrência está em aberto (única em vermelho suave).
 * - Urgente: em aberto e vence hoje ou amanhã (tom âmbar sóbrio estático).
 * - Aguardando: status "Aguardando cliente" (tom frio/neutro).
 * - Nova: criada há pouco (últimos 2 dias) e ainda em aberto (tom frio/neutro).
 * - Resolvida: exibe "Resolvida" (verde suave).
 */
export function obterEstadoOperacional(ocorrencia: {
  status?: string
  prazo_resolucao?: string
  created?: string
}): InfoEstadoOperacional {
  const status = ocorrencia.status || 'Aberta'

  // Ocorrências resolvidas não mostram etiquetas de urgência/atraso
  if (status === 'Resolvida') {
    return {
      estado: 'Resolvida',
      label: 'Resolvida',
      classe: 'bg-[#EAF2E8] text-[#2F6B4F] border border-[#A8C3A0]/40 font-semibold',
    }
  }

  const hoje = new Date()
  const hojeStr = hoje.toISOString().split('T')[0]

  const amanha = new Date()
  amanha.setDate(amanha.getDate() + 1)
  const amanhaStr = amanha.toISOString().split('T')[0]

  const prazo = ocorrencia.prazo_resolucao || ''

  // 1. Atrasada — prazo já venceu e a ocorrência está em aberto (única em vermelho suave)
  if (prazo && prazo < hojeStr) {
    return {
      estado: 'Atrasada',
      label: 'Atrasada',
      classe: 'bg-rose-50 text-rose-800 border border-rose-200 font-semibold',
    }
  }

  // 2. Urgente — em aberto e vence hoje ou amanhã (tom âmbar sóbrio estático, sem animação)
  if (prazo && (prazo === hojeStr || prazo === amanhaStr)) {
    return {
      estado: 'Urgente',
      label: 'Urgente',
      classe: 'bg-amber-50 text-amber-800 border border-amber-200 font-semibold',
    }
  }

  // 3. Aguardando — status "Aguardando cliente" (tom frio/neutro)
  const statusLower = status.toLowerCase()
  if (status === 'Aguardando cliente' || statusLower.includes('aguardando')) {
    return {
      estado: 'Aguardando',
      label: 'Aguardando',
      classe: 'bg-slate-100 text-slate-700 border border-slate-200 font-medium',
    }
  }

  // 4. Nova — recém-aberta (criada há pouco, ex. últimos 2 dias, ainda em aberto)
  if (ocorrencia.created) {
    const dataCriacao = new Date(ocorrencia.created)
    if (!isNaN(dataCriacao.getTime())) {
      const diffMs = hoje.getTime() - dataCriacao.getTime()
      const diffDias = diffMs / (1000 * 60 * 60 * 24)
      if (diffDias <= 2.5) {
        return {
          estado: 'Nova',
          label: 'Nova',
          classe: 'bg-slate-100 text-slate-700 border border-slate-200 font-medium',
        }
      }
    }
  }

  // Em aberto regular sem se enquadrar nas anteriores (tom frio/neutro)
  return {
    estado: 'Em andamento',
    label: 'Em andamento',
    classe: 'bg-slate-100 text-slate-700 border border-slate-200 font-medium',
  }
}

export function BadgeEstadoOcorrencia({
  ocorrencia,
  className = '',
}: {
  ocorrencia: {
    status?: string
    prazo_resolucao?: string
    created?: string
  }
  className?: string
}) {
  const info = obterEstadoOperacional(ocorrencia)

  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full inline-flex items-center shrink-0 ${info.classe} ${className}`}
    >
      {info.label}
    </span>
  )
}
