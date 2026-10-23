import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface ModalResolverCasoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tituloCaso?: string
  codigoCaso?: string
  desfechoInicial?: string
  onConfirmar: (desfecho: string) => Promise<void>
}

export function ModalResolverCaso({
  open,
  onOpenChange,
  tituloCaso,
  codigoCaso,
  desfechoInicial = '',
  onConfirmar,
}: ModalResolverCasoProps) {
  const [desfecho, setDesfecho] = useState(desfechoInicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const handleResolver = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!desfecho.trim()) {
      setErro('O preenchimento do desfecho é obrigatório para resolver a ocorrência.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      await onConfirmar(desfecho.trim())
      onOpenChange(false)
      setDesfecho('')
    } catch (err) {
      console.error(err)
      setErro(err instanceof Error ? err.message : 'Falha ao resolver ocorrência.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[#2F6B4F]">
            <CheckCircle2 className="w-5 h-5 text-[#2F6B4F]" />
            <DialogTitle className="font-semibold text-lg text-[#1D2B25]">
              Resolver Ocorrência
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleResolver} className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/30 text-xs text-[#1D2B25] space-y-1">
            <p className="font-semibold text-sm">
              {codigoCaso ? `${codigoCaso} — ` : ''}
              {tituloCaso || 'Caso selecionado'}
            </p>
            <p className="text-[11px] text-[#5E6E64]">
              Ao resolver a ocorrência, ela será movida para a coluna <strong>RESOLVIDO</strong> e
              terá o responsável pela finalização e data/hora gravados.
            </p>
            <p className="text-[11px] text-[#5E6E64] italic">
              Nota: o status de comunicação do cliente não é alterado automaticamente.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1D2B25] uppercase tracking-wider mb-1">
              Desfecho da Ocorrência *
            </label>
            <textarea
              required
              rows={4}
              value={desfecho}
              onChange={(e) => {
                setDesfecho(e.target.value)
                if (erro) setErro(null)
              }}
              placeholder="Descreva a solução acordada: substituição autorizada, nota de crédito emitida, laudo técnico entregue, devolução processada..."
              className="w-full px-3 py-2 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/50 text-xs sm:text-sm text-[#1D2B25] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
            />
            {erro && (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{erro}</span>
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-full border border-slate-200 text-xs font-semibold text-[#5E6E64] hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando || !desfecho.trim()}
              className="px-5 py-2 rounded-full bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              {salvando ? 'Salvando...' : 'Confirmar Resolução'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
