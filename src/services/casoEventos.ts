import pb from '@/lib/pocketbase/client'
import type { CasoEvento, CasoEventoInput } from '@/types/crm'

export async function listarEventosPorCaso(casoId: string): Promise<CasoEvento[]> {
  try {
    return await pb.collection('caso_eventos').getFullList<CasoEvento>({
      filter: `caso = "${casoId}"`,
      sort: '-created',
      expand: 'autor',
    })
  } catch (error) {
    console.error('Erro ao listar eventos do caso:', error)
    return []
  }
}

export async function criarCasoEvento(dados: CasoEventoInput): Promise<CasoEvento> {
  const user = pb.authStore.record
  const payload: Record<string, unknown> = {
    caso: dados.caso,
    tipo: dados.tipo,
    texto: dados.texto || '',
    dados: dados.dados || null,
    loja_evento: dados.loja_evento || user?.loja || '',
    autor: dados.autor || (user?.id ? user.id : undefined),
    autor_nome: dados.autor_nome || user?.name || 'Sistema',
  }

  return await pb.collection('caso_eventos').create<CasoEvento>(payload)
}
