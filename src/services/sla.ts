import pb from '@/lib/pocketbase/client'
import type { ConfiguracaoSla, ConfiguracaoSlaInput, GravidadeReclamacao } from '@/types/crm'

export const SLA_PADRAO_DIAS_UTEIS: Record<GravidadeReclamacao, number> = {
  Urgente: 1,
  Alta: 3,
  Média: 5,
  Baixa: 10,
}

export const ORDEM_GRAVIDADES: GravidadeReclamacao[] = ['Urgente', 'Alta', 'Média', 'Baixa']

/**
 * Adiciona N dias úteis (segunda a sexta-feira) a partir de uma data base.
 * @param dataBase Data inicial (formato YYYY-MM-DD ou objeto Date)
 * @param diasUteis Número inteiro de dias úteis a somar
 * @returns String formatada YYYY-MM-DD
 */
export function adicionarDiasUteis(dataBase: string | Date, diasUteis: number): string {
  const data = typeof dataBase === 'string' ? new Date(`${dataBase}T12:00:00`) : new Date(dataBase)

  let diasRestantes = Math.max(1, Math.floor(diasUteis))

  while (diasRestantes > 0) {
    data.setDate(data.getDate() + 1)
    const diaSemana = data.getDay() // 0 = Domingo, 6 = Sábado
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasRestantes--
    }
  }

  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/**
 * Calcula a situação do prazo de uma ocorrência:
 * - vencido: prazo < hoje (ou resolvida fora do prazo)
 * - hoje: prazo == hoje
 * - no_prazo: prazo > hoje (com contagem de dias restantes)
 */
export interface StatusSlaInfo {
  situacao: 'vencido' | 'hoje' | 'no_prazo'
  diasDiferenca: number
  texto: string
  estilo: 'critico' | 'atencao' | 'regular'
}

export function obterStatusSla(
  prazoResolucao: string,
  dataResolucao?: string,
  resolvida: boolean = false,
): StatusSlaInfo {
  const hojeStr = new Date().toISOString().split('T')[0]

  if (resolvida) {
    const dataFim = dataResolucao || hojeStr
    if (dataFim <= prazoResolucao) {
      return {
        situacao: 'no_prazo',
        diasDiferenca: 0,
        texto: 'Resolvida no prazo',
        estilo: 'regular',
      }
    }
    return {
      situacao: 'vencido',
      diasDiferenca: -1,
      texto: 'Resolvida fora do prazo',
      estilo: 'critico',
    }
  }

  if (prazoResolucao < hojeStr) {
    // Calcula diferença em dias corridos
    const prazoDate = new Date(`${prazoResolucao}T12:00:00`)
    const hojeDate = new Date(`${hojeStr}T12:00:00`)
    const diffMs = hojeDate.getTime() - prazoDate.getTime()
    const diffDias = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)))
    return {
      situacao: 'vencido',
      diasDiferenca: -diffDias,
      texto: `Vencido há ${diffDias}d`,
      estilo: 'critico',
    }
  }

  if (prazoResolucao === hojeStr) {
    return {
      situacao: 'hoje',
      diasDiferenca: 0,
      texto: 'Vence hoje',
      estilo: 'atencao',
    }
  }

  // Prazo no futuro
  const prazoDate = new Date(`${prazoResolucao}T12:00:00`)
  const hojeDate = new Date(`${hojeStr}T12:00:00`)
  const diffMs = prazoDate.getTime() - hojeDate.getTime()
  const diffDias = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)))
  return {
    situacao: 'no_prazo',
    diasDiferenca: diffDias,
    texto: `${diffDias}d restante${diffDias > 1 ? 's' : ''}`,
    estilo: 'regular',
  }
}

/**
 * Busca todas as configurações de SLA cadastradas no banco.
 * Caso ocorra erro ou a coleção esteja inacessível, retorna o padrão.
 */
export async function listarConfiguracoesSla(): Promise<ConfiguracaoSla[]> {
  try {
    const configs = await pb.collection('configuracoes_sla').getFullList<ConfiguracaoSla>({
      sort: 'dias_uteis',
    })

    if (configs.length > 0) {
      return configs
    }

    // Se a coleção estiver vazia por algum motivo, retorna os registros padrão em memória
    return ORDEM_GRAVIDADES.map((g) => ({
      id: `default_${g}`,
      gravidade: g,
      dias_uteis: SLA_PADRAO_DIAS_UTEIS[g],
      descricao: '',
      created: '',
      updated: '',
      collectionId: '',
      collectionName: 'configuracoes_sla',
    }))
  } catch (err) {
    console.error('Erro ao listar configurações de SLA:', err)
    return ORDEM_GRAVIDADES.map((g) => ({
      id: `fallback_${g}`,
      gravidade: g,
      dias_uteis: SLA_PADRAO_DIAS_UTEIS[g],
      descricao: '',
      created: '',
      updated: '',
      collectionId: '',
      collectionName: 'configuracoes_sla',
    }))
  }
}

/**
 * Atualiza o valor de dias úteis e/ou descrição de um SLA por gravidade.
 */
export async function atualizarConfiguracaoSla(
  id: string,
  dados: Partial<ConfiguracaoSlaInput>,
): Promise<ConfiguracaoSla> {
  return await pb.collection('configuracoes_sla').update<ConfiguracaoSla>(id, dados)
}

/**
 * Calcula a data alvo de resolução a partir da data de abertura (ou hoje) e da gravidade.
 * @param gravidade Baixa | Média | Alta | Urgente
 * @param mapaSla Dicionário opcional com os dias úteis configurados
 * @param dataAbertura Data inicial (padrão hoje)
 */
export function calcularPrazoPorGravidade(
  gravidade: GravidadeReclamacao,
  mapaSla?: Record<GravidadeReclamacao, number>,
  dataAbertura?: string,
): string {
  const dias = mapaSla?.[gravidade] ?? SLA_PADRAO_DIAS_UTEIS[gravidade] ?? 5
  const base = dataAbertura || new Date().toISOString().split('T')[0]
  return adicionarDiasUteis(base, dias)
}
