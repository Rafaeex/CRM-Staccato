import pb from '@/lib/pocketbase/client'
import type { Reclamacao, ReclamacaoInput } from '@/types/crm'

export async function listarReclamacoes(): Promise<Reclamacao[]> {
  try {
    return await pb.collection('reclamacoes').getFullList<Reclamacao>({
      sort: '-created',
    })
  } catch (err) {
    console.error('Erro ao listar reclamações:', err)
    return []
  }
}

export async function listarReclamacoesPorCliente(clienteId: string): Promise<Reclamacao[]> {
  try {
    return await pb.collection('reclamacoes').getFullList<Reclamacao>({
      filter: `cliente = "${clienteId}"`,
      sort: '-created',
    })
  } catch (err) {
    console.error('Erro ao listar reclamações do cliente:', err)
    return []
  }
}

export async function buscarReclamacaoPorId(id: string): Promise<Reclamacao> {
  return await pb.collection('reclamacoes').getOne<Reclamacao>(id)
}

export async function buscarReclamacaoPorTrelloId(trelloId: string): Promise<Reclamacao | null> {
  try {
    return await pb
      .collection('reclamacoes')
      .getFirstListItem<Reclamacao>(`origem_trello_id = "${trelloId}"`)
  } catch (_) {
    return null
  }
}

export async function criarReclamacao(dados: ReclamacaoInput): Promise<Reclamacao> {
  if (dados.anexos && dados.anexos.length > 0) {
    const formData = new FormData()
    Object.entries(dados).forEach(([key, val]) => {
      if (key !== 'anexos' && val !== undefined && val !== null) {
        formData.append(key, String(val))
      }
    })
    for (const file of dados.anexos) {
      formData.append('anexos', file)
    }
    return await pb.collection('reclamacoes').create<Reclamacao>(formData)
  }

  const { anexos, ...payload } = dados
  return await pb.collection('reclamacoes').create<Reclamacao>(payload)
}

export function getUrlAnexoReclamacao(reclamacao: Reclamacao, fileName: string): string {
  return pb.files.getURL(reclamacao, fileName)
}

export async function atualizarReclamacao(
  id: string,
  dados: Partial<ReclamacaoInput>,
): Promise<Reclamacao> {
  return await pb.collection('reclamacoes').update<Reclamacao>(id, dados)
}

export async function resolverReclamacao(
  id: string,
  resolucao_desfecho: string,
  data_resolucao?: string,
): Promise<Reclamacao> {
  const hoje = data_resolucao || new Date().toISOString().split('T')[0]
  return await pb.collection('reclamacoes').update<Reclamacao>(id, {
    status: 'Resolvida',
    resolucao_desfecho,
    data_resolucao: hoje,
  })
}

export async function excluirReclamacao(id: string): Promise<boolean> {
  return await pb.collection('reclamacoes').delete(id)
}
