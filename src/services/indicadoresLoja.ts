import pb from '@/lib/pocketbase/client'
import type { CartaoKanban, FollowUp, Reclamacao } from '@/types/crm'

export interface IndicadoresAtendimentoLoja {
  lojaNome: string
  // Cartões Kanban
  totalKanbanNaoResolvidos: number
  kanbanAtrasadosOuUrgentes: number
  // Follow-ups
  followUpsPendentes: number
  followUpsAtrasados: number
  // Reclamações
  reclamacoesAbertas: number
  reclamacoesAtrasadas: number
  // Flag de atenção geral
  temAlerta: boolean
}

// Compara nomes de loja flexivelmente ("Vila Olímpia (SP)" vs "Vila Olímpia", etc.)
export function correspondeLoja(nomeAlvo: string, lojaItem: string): boolean {
  if (!nomeAlvo || !lojaItem) return false
  const n1 = nomeAlvo.toLowerCase().trim()
  const n2 = lojaItem.toLowerCase().trim()
  return n1.includes(n2) || n2.includes(n1)
}

export async function carregarIndicadoresPorLoja(
  lojasNomes: string[],
): Promise<Record<string, IndicadoresAtendimentoLoja>> {
  const hoje = new Date().toISOString().split('T')[0]

  try {
    // Busca agrupada em 3 consultas com getFullList (evitando rajadas de requisições por loja)
    const [cartoes, followUps, reclamacoes] = await Promise.all([
      pb.collection('kanban_cartoes').getFullList<CartaoKanban>({
        filter: "coluna != 'Resolvido'",
        fields: 'id,loja,coluna,prioridade,data_limite',
      }),
      pb.collection('follow_ups').getFullList<FollowUp>({
        filter: "status = 'Pendente'",
        fields: 'id,loja,status,data_prevista',
      }),
      pb.collection('reclamacoes').getFullList<Reclamacao>({
        filter: "status != 'Resolvida'",
        fields: 'id,loja,status,prazo_resolucao,gravidade',
      }),
    ])

    const resultado: Record<string, IndicadoresAtendimentoLoja> = {}

    for (const nomeLoja of lojasNomes) {
      // Cartões kanban desta loja
      const cartoesDaLoja = cartoes.filter((c) => correspondeLoja(nomeLoja, c.loja))
      const totalKanbanNaoResolvidos = cartoesDaLoja.length
      const kanbanAtrasadosOuUrgentes = cartoesDaLoja.filter((c) => {
        const atrasado = c.data_limite && c.data_limite < hoje
        const urgente = c.prioridade === 'Alta' || c.prioridade === 'Urgente'
        return atrasado || urgente
      }).length

      // Follow-ups pendentes desta loja
      const followUpsDaLoja = followUps.filter((f) => correspondeLoja(nomeLoja, f.loja))
      const followUpsPendentes = followUpsDaLoja.length
      const followUpsAtrasados = followUpsDaLoja.filter(
        (f) => f.data_prevista && f.data_prevista < hoje,
      ).length

      // Reclamações abertas/em tratamento desta loja
      const reclamacoesDaLoja = reclamacoes.filter((r) => correspondeLoja(nomeLoja, r.loja))
      const reclamacoesAbertas = reclamacoesDaLoja.length
      const reclamacoesAtrasadas = reclamacoesDaLoja.filter(
        (r) => (r.prazo_resolucao && r.prazo_resolucao < hoje) || r.gravidade === 'Alta',
      ).length

      const temAlerta =
        kanbanAtrasadosOuUrgentes > 0 || followUpsAtrasados > 0 || reclamacoesAtrasadas > 0

      resultado[nomeLoja] = {
        lojaNome: nomeLoja,
        totalKanbanNaoResolvidos,
        kanbanAtrasadosOuUrgentes,
        followUpsPendentes,
        followUpsAtrasados,
        reclamacoesAbertas,
        reclamacoesAtrasadas,
        temAlerta,
      }
    }

    return resultado
  } catch (err) {
    console.warn('Falha ao carregar indicadores de atendimento por loja:', err)
    // Retorna fallback zerado para não quebrar a sidebar
    const fallback: Record<string, IndicadoresAtendimentoLoja> = {}
    for (const nome of lojasNomes) {
      fallback[nome] = {
        lojaNome: nome,
        totalKanbanNaoResolvidos: 0,
        kanbanAtrasadosOuUrgentes: 0,
        followUpsPendentes: 0,
        followUpsAtrasados: 0,
        reclamacoesAbertas: 0,
        reclamacoesAtrasadas: 0,
        temAlerta: false,
      }
    }
    return fallback
  }
}
