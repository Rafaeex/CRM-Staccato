import pb from '@/lib/pocketbase/client'
import type { FollowUp, FollowUpInput } from '@/types/crm'

export async function listarFollowUps(
  filtro?: string,
  sort = 'data_prevista,horario_previsto',
): Promise<FollowUp[]> {
  return await pb.collection('follow_ups').getFullList<FollowUp>({
    filter: filtro,
    sort,
  })
}

export async function listarFollowUpsPorCliente(clienteId: string): Promise<FollowUp[]> {
  return await pb.collection('follow_ups').getFullList<FollowUp>({
    filter: `cliente = "${clienteId}"`,
    sort: 'data_prevista,horario_previsto',
  })
}

export async function criarFollowUp(dados: FollowUpInput): Promise<FollowUp> {
  return await pb.collection('follow_ups').create<FollowUp>({
    ...dados,
    status: dados.status || 'Pendente',
  })
}

export async function atualizarFollowUp(
  id: string,
  dados: Partial<FollowUpInput>,
): Promise<FollowUp> {
  return await pb.collection('follow_ups').update<FollowUp>(id, dados)
}

export async function marcarFollowUpConcluido(id: string, nota?: string): Promise<FollowUp> {
  const hoje = new Date().toISOString().split('T')[0]
  return await pb.collection('follow_ups').update<FollowUp>(id, {
    status: 'Concluído',
    data_conclusao: hoje,
    resultado_nota: nota || 'Concluído via CRM',
  })
}

export async function excluirFollowUp(id: string): Promise<boolean> {
  return await pb.collection('follow_ups').delete(id)
}

export function formatarNumeroWhatsApp(telefone: string): string {
  const digits = telefone.replace(/\D/g, '')
  if (digits.startsWith('55')) {
    return digits
  }
  return `55${digits}`
}

export function gerarLinkWhatsApp(telefone: string, mensagem?: string): string {
  const cleanPhone = formatarNumeroWhatsApp(telefone)
  const encodedMsg = mensagem ? encodeURIComponent(mensagem) : ''
  return `https://wa.me/${cleanPhone}${encodedMsg ? `?text=${encodedMsg}` : ''}`
}
