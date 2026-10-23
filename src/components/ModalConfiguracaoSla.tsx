import { useState, useEffect } from 'react'
import { SlidersHorizontal, Clock, CheckCircle2, AlertCircle, Save, RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  listarConfiguracoesSla,
  atualizarConfiguracaoSla,
  SLA_PADRAO_DIAS_UTEIS,
  ORDEM_GRAVIDADES,
} from '@/services/sla'
import type { ConfiguracaoSla, GravidadeReclamacao } from '@/types/crm'
import { useToast } from '@/hooks/use-toast'

interface ModalConfiguracaoSlaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSalvo?: () => void
}

export function ModalConfiguracaoSla({ open, onOpenChange, onSalvo }: ModalConfiguracaoSlaProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [configs, setConfigs] = useState<ConfiguracaoSla[]>([])
  const [valoresEditados, setValoresEditados] = useState<
    Record<GravidadeReclamacao, { dias: number; descricao: string }>
  >({
    Urgente: { dias: 1, descricao: '' },
    Alta: { dias: 3, descricao: '' },
    Média: { dias: 5, descricao: '' },
    Baixa: { dias: 10, descricao: '' },
  })

  const carregar = async () => {
    setLoading(true)
    try {
      const lista = await listarConfiguracoesSla()
      setConfigs(lista)

      const mapa: Record<GravidadeReclamacao, { dias: number; descricao: string }> = {
        Urgente: { dias: 1, descricao: '' },
        Alta: { dias: 3, descricao: '' },
        Média: { dias: 5, descricao: '' },
        Baixa: { dias: 10, descricao: '' },
      }

      lista.forEach((item) => {
        if (mapa[item.gravidade]) {
          mapa[item.gravidade] = {
            dias: item.dias_uteis,
            descricao: item.descricao || '',
          }
        }
      })

      setValoresEditados(mapa)
    } catch (err) {
      console.error('Falha ao carregar SLA:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      carregar()
    }
  }, [open])

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    try {
      for (const item of configs) {
        const editado = valoresEditados[item.gravidade]
        if (editado && (editado.dias !== item.dias_uteis || editado.descricao !== item.descricao)) {
          await atualizarConfiguracaoSla(item.id, {
            dias_uteis: Number(editado.dias),
            descricao: editado.descricao,
          })
        }
      }

      toast({
        title: 'SLAs atualizados',
        description: 'Os novos prazos em dias úteis serão aplicados às próximas ocorrências.',
      })

      onSalvo?.()
      onOpenChange(false)
    } catch (err) {
      console.error('Erro ao salvar SLAs:', err)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível persistir as alterações de SLA.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleRestaurarPadroes = () => {
    setValoresEditados({
      Urgente: {
        dias: SLA_PADRAO_DIAS_UTEIS.Urgente,
        descricao: 'Casos críticos com impacto imediato ou risco para a obra',
      },
      Alta: {
        dias: SLA_PADRAO_DIAS_UTEIS.Alta,
        descricao: 'Falta de material, avarias graves ou atrasos em andamento',
      },
      Média: {
        dias: SLA_PADRAO_DIAS_UTEIS.Média,
        descricao: 'Dúvidas de assentamento, trocas simples ou pendências de lote',
      },
      Baixa: {
        dias: SLA_PADRAO_DIAS_UTEIS.Baixa,
        descricao: 'Documentações, orientações técnicas e certificados',
      },
    })
    toast({
      title: 'Valores padrão restaurados na tela',
      description: 'Clique em "Salvar Parâmetros" para confirmar a gravação.',
    })
  }

  const getBadgeGravidade = (g: GravidadeReclamacao) => {
    switch (g) {
      case 'Urgente':
        return 'bg-rose-50 text-rose-800 border-rose-200'
      case 'Alta':
        return 'bg-amber-50 text-amber-800 border-amber-200'
      case 'Média':
        return 'bg-slate-100 text-slate-700 border-slate-200'
      case 'Baixa':
        return 'bg-[#EAF2E8] text-[#2F6B4F] border-[#A8C3A0]/40'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EAF2E8] text-[#2F6B4F] flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="font-semibold text-lg text-[#1D2B25]">
                Configuração de SLAs por Gravidade
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5E6E64] mt-0.5">
                Defina o prazo de resolução em dias úteis (segunda a sexta) para cada nível de
                gravidade das ocorrências.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-xs text-[#5E6E64]">
            Carregando parâmetros de SLA...
          </div>
        ) : (
          <form onSubmit={handleSalvar} className="space-y-4 pt-2">
            <div className="space-y-3">
              {ORDEM_GRAVIDADES.map((gravidade) => {
                const item = valoresEditados[gravidade]
                return (
                  <div
                    key={gravidade}
                    className="p-3.5 rounded-2xl bg-[#F7FAF5] border border-[#A8C3A0]/30 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${getBadgeGravidade(
                            gravidade,
                          )}`}
                        >
                          {gravidade}
                        </span>
                        <span className="text-[11px] text-[#5E6E64]">
                          Padrão original: {SLA_PADRAO_DIAS_UTEIS[gravidade]} dia
                          {SLA_PADRAO_DIAS_UTEIS[gravidade] > 1 ? 's úteis' : ' útil'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] text-[#5E6E64] font-medium">Prazo:</label>
                        <input
                          type="number"
                          min={1}
                          max={90}
                          required
                          value={item.dias}
                          onChange={(e) =>
                            setValoresEditados({
                              ...valoresEditados,
                              [gravidade]: {
                                ...item,
                                dias: Math.max(1, parseInt(e.target.value) || 1),
                              },
                            })
                          }
                          className="w-16 px-2.5 py-1 rounded-xl bg-white border border-[#A8C3A0]/50 text-xs font-semibold text-[#1D2B25] text-center focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                        />
                        <span className="text-[11px] text-[#1D2B25] font-medium">
                          dia{item.dias > 1 ? 's úteis' : ' útil'}
                        </span>
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder={`Descrição operacional para gravidade ${gravidade.toLowerCase()}...`}
                      value={item.descricao}
                      onChange={(e) =>
                        setValoresEditados({
                          ...valoresEditados,
                          [gravidade]: {
                            ...item,
                            descricao: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#A8C3A0]/30 text-[11px] text-[#1D2B25] focus:outline-none focus:ring-2 focus:ring-[#2F6B4F]"
                    />
                  </div>
                )
              })}
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-[11px] text-stone-600 space-y-1">
              <p className="font-semibold text-stone-700">Regra de cálculo automático:</p>
              <p>
                Ao abrir uma nova ocorrência ou alterar sua gravidade, o sistema calcula a data alvo
                a partir da data de abertura somando os dias úteis (sábados e domingos são
                desconsiderados). O responsável ainda pode ajustar o prazo manualmente se
                necessário.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#EAF2E8]">
              <button
                type="button"
                onClick={handleRestaurarPadroes}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-[#5E6E64] hover:text-[#1D2B25] hover:bg-[#F7FAF5] flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#5E6E64]" />
                <span>Restaurar Padrões</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5E6E64] hover:bg-[#F7FAF5]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 rounded-xl bg-[#2F6B4F] hover:bg-[#25563F] text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-[#A8C3A0]" />
                  <span>{salvando ? 'Salvando...' : 'Salvar Parâmetros'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
