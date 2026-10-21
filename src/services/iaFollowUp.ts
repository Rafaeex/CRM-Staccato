import pb from '@/lib/pocketbase/client'
import type { UrgenciaFollowUp } from '@/types/crm'

export interface SugestaoFollowUpIA {
  assunto: string
  mensagem_sugerida: string
  canal: 'WhatsApp' | 'Telefone' | 'E-mail' | 'Presencial'
  urgencia: UrgenciaFollowUp
  data_prevista: string
  horario_previsto: string
  justificativa: string
}

export interface RespostaFollowUpIA {
  sucesso: boolean
  cliente_id: string
  cliente_nome: string
  cliente_telefone: string
  loja: string
  resposta_completa_ia: string
  sugestao: SugestaoFollowUpIA
  error?: string
}

/**
 * Chama o hook nativo do PocketBase com o Agente de IA para analisar o histórico
 * de atendimento do cliente e gerar recomendação automática de follow-up.
 */
export async function gerarFollowUpComIA(clienteId: string): Promise<RespostaFollowUpIA> {
  const token = pb.authStore.token
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''

  const res = await fetch(`${baseUrl}/backend/v1/gerar-followup-ia`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({ cliente_id: clienteId }),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData?.error || `Falha na requisição de IA (HTTP ${res.status})`)
  }

  const data: RespostaFollowUpIA = await res.json()
  return data
}
