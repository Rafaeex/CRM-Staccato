import pb from '@/lib/pocketbase/client'
import type { TrelloLista } from '@/types/crm'

export async function listarTrelloListas(tipoQuadro?: string): Promise<TrelloLista[]> {
  try {
    const filter = tipoQuadro ? `tipo_quadro = "${tipoQuadro}" || tipo_quadro = "geral"` : ''
    return await pb.collection('trello_listas').getFullList<TrelloLista>({
      filter,
      sort: 'ordem,created',
    })
  } catch (err) {
    console.error('Erro ao listar listas Trello:', err)
    return []
  }
}

export async function criarTrelloLista(
  nome: string,
  tipoQuadro = 'geral',
  trelloId?: string,
): Promise<TrelloLista> {
  const count = await pb.collection('trello_listas').getList(1, 1)
  return await pb.collection('trello_listas').create<TrelloLista>({
    nome: nome.trim(),
    tipo_quadro: tipoQuadro,
    trello_id: trelloId || '',
    ordem: count.totalItems + 1,
  })
}

export async function atualizarTrelloLista(
  id: string,
  dados: Partial<TrelloLista>,
): Promise<TrelloLista> {
  return await pb.collection('trello_listas').update<TrelloLista>(id, dados)
}

export async function excluirTrelloLista(id: string): Promise<boolean> {
  try {
    await pb.collection('trello_listas').delete(id)
    return true
  } catch (err) {
    console.error('Erro ao excluir lista Trello:', err)
    return false
  }
}

export async function garantirListasTrello(
  nomes: string[],
  tipoQuadro = 'geral',
): Promise<TrelloLista[]> {
  const existentes = await listarTrelloListas()
  const criadas: TrelloLista[] = [...existentes]

  for (const nome of nomes) {
    const limpo = nome.trim()
    if (!limpo) continue
    const jaExiste = criadas.some((l) => l.nome.toUpperCase() === limpo.toUpperCase())
    if (!jaExiste) {
      try {
        const nova = await criarTrelloLista(limpo, tipoQuadro)
        criadas.push(nova)
      } catch (err) {
        console.warn(`Não foi possível criar lista ${limpo}:`, err)
      }
    }
  }

  return criadas
}
