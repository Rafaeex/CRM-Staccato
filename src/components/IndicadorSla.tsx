import { Clock } from 'lucide-react'
import { obterStatusSla } from '@/services/sla'

interface IndicadorSlaProps {
  prazoResolucao: string
  dataResolucao?: string
  status?: string
  compacto?: boolean
}

export function IndicadorSla({
  prazoResolucao,
  dataResolucao,
  status,
  compacto = false,
}: IndicadorSlaProps) {
  const isResolvida = status === 'Resolvida'
  const info = obterStatusSla(prazoResolucao, dataResolucao, isResolvida)

  if (compacto) {
    if (info.estilo === 'critico') {
      return (
        <span
          title={`Prazo-alvo: ${prazoResolucao}`}
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200"
        >
          <Clock className="w-3 h-3 text-rose-700 shrink-0" />
          <span>{info.texto}</span>
        </span>
      )
    }

    if (info.estilo === 'atencao') {
      return (
        <span
          title={`Prazo-alvo: ${prazoResolucao}`}
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200"
        >
          <Clock className="w-3 h-3 text-amber-700 shrink-0" />
          <span>{info.texto}</span>
        </span>
      )
    }

    return (
      <span
        title={`Prazo-alvo: ${prazoResolucao}`}
        className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
      >
        <Clock className="w-3 h-3 text-slate-500 shrink-0" />
        <span>{info.texto}</span>
      </span>
    )
  }

  // Visual detalhado para card ou ficha
  if (info.estilo === 'critico') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold">
        <Clock className="w-3.5 h-3.5 text-rose-700 shrink-0" />
        <span>{info.texto}</span>
        <span className="text-[10px] font-normal text-rose-700/80">({prazoResolucao})</span>
      </div>
    )
  }

  if (info.estilo === 'atencao') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
        <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        <span>{info.texto}</span>
        <span className="text-[10px] font-normal text-amber-700/80">({prazoResolucao})</span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium">
      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <span>{info.texto}</span>
      <span className="text-[10px] text-slate-500 font-normal">({prazoResolucao})</span>
    </div>
  )
}
