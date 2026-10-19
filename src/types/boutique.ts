import type { RecordModel } from 'pocketbase'

export interface Solicitacao extends RecordModel {
  id: string
  cliente_nome: string
  telefone: string
  email: string
  servico: string
  loja: string
  data_preferida: string
  horario_preferido: string
  mensagem?: string
  status: 'Pendente' | 'Confirmado' | 'Concluído' | 'Cancelado'
  created: string
  updated: string
}

export interface SolicitacaoInput {
  cliente_nome: string
  telefone: string
  email: string
  servico: string
  loja: string
  data_preferida: string
  horario_preferido: string
  mensagem?: string
}

export interface Loja {
  id: string
  nome: string
  cidade: string
  bairro: string
  endereco: string
  telefone: string
  whatsapp: string
  mapUrl: string
}

export interface ServicoItem {
  id: string
  titulo: string
  descricao: string
  icone: string
  destaque: string
}

export interface Profissional {
  id: string
  nome: string
  cargo: string
  experiencia: string
  bio: string
  lojaBase?: string
  foto: string
}
