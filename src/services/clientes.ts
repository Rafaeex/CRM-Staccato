import pb from '@/lib/pocketbase/client'
import type { Cliente, ClienteInput } from '@/types/crm'

export async function listarClientes(filtro?: string, sort = '-created'): Promise<Cliente[]> {
  return await pb.collection('clientes').getFullList<Cliente>({
    filter: filtro,
    sort,
  })
}

export async function buscarClientePorId(id: string): Promise<Cliente> {
  return await pb.collection('clientes').getOne<Cliente>(id)
}

export async function criarCliente(dados: ClienteInput): Promise<Cliente> {
  return await pb.collection('clientes').create<Cliente>(dados)
}

export async function atualizarCliente(id: string, dados: Partial<ClienteInput>): Promise<Cliente> {
  return await pb.collection('clientes').update<Cliente>(id, dados)
}

export async function excluirCliente(id: string): Promise<boolean> {
  return await pb.collection('clientes').delete(id)
}
