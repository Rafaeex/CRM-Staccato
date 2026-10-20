import pb from '@/lib/pocketbase/client'
import type { LojaCRM } from '@/types/crm'

export async function listarLojasCRM(): Promise<LojaCRM[]> {
  try {
    const list = await pb.collection('lojas').getFullList<LojaCRM>({
      sort: 'nome',
    })
    return list
  } catch (err) {
    console.warn('Falha ao listar lojas da base:', err)
    return []
  }
}
