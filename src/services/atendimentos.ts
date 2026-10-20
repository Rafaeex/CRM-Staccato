import pb from '@/lib/pocketbase/client'
import type { Atendimento, AtendimentoInput } from '@/types/crm'

export async function listarAtendimentos(
  filtro?: string,
  sort = '-data_atendimento,-created',
): Promise<Atendimento[]> {
  return await pb.collection('atendimentos').getFullList<Atendimento>({
    filter: filtro,
    sort,
  })
}

export async function listarAtendimentosPorCliente(clienteId: string): Promise<Atendimento[]> {
  return await pb.collection('atendimentos').getFullList<Atendimento>({
    filter: `cliente = "${clienteId}"`,
    sort: '-data_atendimento,-created',
  })
}

export async function criarAtendimento(dados: AtendimentoInput): Promise<Atendimento> {
  return await pb.collection('atendimentos').create<Atendimento>(dados)
}

export async function atualizarAtendimento(
  id: string,
  dados: Partial<AtendimentoInput>,
): Promise<Atendimento> {
  return await pb.collection('atendimentos').update<Atendimento>(id, dados)
}

export async function excluirAtendimento(id: string): Promise<boolean> {
  return await pb.collection('atendimentos').delete(id)
}
