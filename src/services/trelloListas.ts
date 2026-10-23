import pb from '@/lib/pocketbase/client'
import type { TrelloLista } from '@/types/crm'

// 9 colunas padrão da esteira SAC espelhadas do quadro real "SAC GABR (ALINE)" no Trello
export const COLUNAS_PADRAO_SAC: readonly string[] = [
  'NOVOS',
  'EM TRATAMENTO',
  'RETORNO DA LOJA',
  'ANALISE DIRETORIA',
  'A PAGAR',
  'COMPRAS',
  'AT',
  'COLETA/ENTREGA',
  'RESOLVIDO',
] as const

export async function listarTrelloListas(tipoQuadro?: string): Promise<TrelloLista[]> {
  try {
    const filter = tipoQuadro ? `tipo_quadro = "${tipoQuadro}" || tipo_quadro = "geral"` : ''
    const listas = await pb.collection('trello_listas').getFullList<TrelloLista>({
      filter,
      sort: 'ordem,created',
    })

    // Se estiver vazio para sac/geral, inicializa automaticamente com as 9 colunas padrão
    if (listas.length === 0 && (!tipoQuadro || tipoQuadro === 'sac' || tipoQuadro === 'geral')) {
      return await inicializarListasPadrao(tipoQuadro || 'sac')
    }

    return listas
  } catch (err) {
    console.error('Erro ao listar listas Trello:', err)
    return []
  }
}

export async function inicializarListasPadrao(tipoQuadro = 'sac'): Promise<TrelloLista[]> {
  const criadas: TrelloLista[] = []
  for (let i = 0; i < COLUNAS_PADRAO_SAC.length; i++) {
    const nome = COLUNAS_PADRAO_SAC[i]
    try {
      const lista = await pb.collection('trello_listas').create<TrelloLista>({
        nome,
        tipo_quadro: tipoQuadro,
        trello_id: '',
        ordem: i + 1,
      })
      criadas.push(lista)
    } catch (err) {
      console.warn(`Erro ao criar coluna padrão ${nome}:`, err)
    }
  }
  return criadas
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
