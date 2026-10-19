import pb from '@/lib/pocketbase/client'
import { Solicitacao, SolicitacaoInput } from '@/types/boutique'

export async function criarSolicitacao(dados: SolicitacaoInput): Promise<Solicitacao> {
  const payload = {
    ...dados,
    status: 'Pendente',
  }
  const record = await pb.collection('solicitacoes').create<Solicitacao>(payload)
  return record
}

export async function listarSolicitacoes(): Promise<Solicitacao[]> {
  const records = await pb.collection('solicitacoes').getFullList<Solicitacao>({
    sort: '-created',
  })
  return records
}

export async function atualizarStatusSolicitacao(
  id: string,
  status: Solicitacao['status'],
): Promise<Solicitacao> {
  const record = await pb.collection('solicitacoes').update<Solicitacao>(id, {
    status,
  })
  return record
}

export function buildWhatsAppLink(dados: {
  telefone: string
  cliente_nome: string
  servico: string
  loja: string
  data_preferida: string
  horario_preferido: string
}): string {
  // Limpar símbolos do telefone para padrão internacional sem +
  // Ex: (11) 98452-1134 -> 11984521134
  const digitsOnly = dados.telefone.replace(/\D/g, '')
  // Garantir código do Brasil (55)
  const phoneFormatted = digitsOnly.startsWith('55') ? digitsOnly : `55${digitsOnly}`

  // Formatar data se vier em AAAA-MM-DD
  let dataFormatada = dados.data_preferida
  if (/^\d{4}-\d{2}-\d{2}$/.test(dados.data_preferida)) {
    const [ano, mes, dia] = dados.data_preferida.split('-')
    dataFormatada = `${dia}/${mes}/${ano}`
  }

  const texto = `Olá, sou ${dados.cliente_nome}. Gostaria de confirmar meu agendamento de ${dados.servico} na loja ${dados.loja} para ${dataFormatada} às ${dados.horario_preferido}.`

  return `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(texto)}`
}
