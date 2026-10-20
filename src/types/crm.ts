import type { RecordModel } from 'pocketbase'

export type EtapaFunil =
  | 'Lead'
  | 'Em atendimento'
  | 'Proposta enviada'
  | 'Cliente fechado'
  | 'Perdido'

export interface Cliente extends RecordModel {
  id: string
  nome: string
  telefone: string
  email?: string
  loja_origem: string
  etapa_funil: EtapaFunil
  interesse_principal?: string
  arquiteto_parceiro?: string
  notas_internas?: string
  cidade?: string
  created: string
  updated: string
}

export interface ClienteInput {
  nome: string
  telefone: string
  email?: string
  loja_origem: string
  etapa_funil: EtapaFunil
  interesse_principal?: string
  arquiteto_parceiro?: string
  notas_internas?: string
  cidade?: string
}

export type CanalAtendimento = 'Presencial' | 'WhatsApp' | 'Telefone' | 'Reunião Online'
export type StatusAtendimento = 'Aberto' | 'Em negociação' | 'Fechado' | 'Perdido'

export interface Atendimento extends RecordModel {
  id: string
  cliente: string
  cliente_nome: string
  loja: string
  responsavel: string
  canal: CanalAtendimento
  data_atendimento: string
  horario?: string
  interesse: string
  resumo: string
  status: StatusAtendimento
  valor_estimado?: number
  created: string
  updated: string
}

export interface AtendimentoInput {
  cliente: string
  cliente_nome: string
  loja: string
  responsavel: string
  canal: CanalAtendimento
  data_atendimento: string
  horario?: string
  interesse: string
  resumo: string
  status: StatusAtendimento
  valor_estimado?: number
}

export type CanalFollowUp = 'WhatsApp' | 'Telefone' | 'E-mail' | 'Presencial'
export type StatusFollowUp = 'Pendente' | 'Concluído' | 'Cancelado'

export interface FollowUp extends RecordModel {
  id: string
  cliente: string
  cliente_nome: string
  cliente_telefone: string
  loja: string
  responsavel: string
  canal: CanalFollowUp
  data_prevista: string
  horario_previsto?: string
  assunto: string
  mensagem_sugerida?: string
  status: StatusFollowUp
  data_conclusao?: string
  resultado_nota?: string
  created: string
  updated: string
}

export interface FollowUpInput {
  cliente: string
  cliente_nome: string
  cliente_telefone: string
  loja: string
  responsavel: string
  canal: CanalFollowUp
  data_prevista: string
  horario_previsto?: string
  assunto: string
  mensagem_sugerida?: string
  status?: StatusFollowUp
  data_conclusao?: string
  resultado_nota?: string
}

export interface LojaCRM extends RecordModel {
  id: string
  nome: string
  slug: string
  cidade: string
  bairro: string
  endereco: string
  telefone: string
  whatsapp: string
  gerente?: string
  created: string
  updated: string
}
