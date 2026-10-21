import type { RecordModel } from 'pocketbase'

// Status de atendimento ao cliente (sem conotação comercial de vendas)
export type StatusCliente =
  | 'Novo'
  | 'Em atendimento'
  | 'Aguardando cliente'
  | 'Atendimento concluído'

// Mantido alias para compatibilidade reversa onde aplicável
export type EtapaFunil = StatusCliente

export interface Cliente extends RecordModel {
  id: string
  nome: string
  telefone: string
  email?: string
  loja_origem: string
  status_atendimento: StatusCliente
  /** @deprecated mantido para compatibilidade temporária se algum código antigo ler */
  etapa_funil?: StatusCliente
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
  status_atendimento: StatusCliente
  etapa_funil?: StatusCliente
  interesse_principal?: string
  arquiteto_parceiro?: string
  notas_internas?: string
  cidade?: string
}

export type CanalAtendimento = 'Presencial' | 'WhatsApp' | 'Telefone' | 'Reunião Online'
export type StatusAtendimento = 'Aberto' | 'Em atendimento' | 'Concluído' | 'Cancelado'

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
}

export type CanalFollowUp = 'WhatsApp' | 'Telefone' | 'E-mail' | 'Presencial'
export type StatusFollowUp = 'Pendente' | 'Concluído' | 'Cancelado'

export type UrgenciaFollowUp = 'Baixa' | 'Média' | 'Alta'

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
  gerado_por_ia?: boolean
  urgencia?: UrgenciaFollowUp
  justificativa_ia?: string
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
  gerado_por_ia?: boolean
  urgencia?: UrgenciaFollowUp
  justificativa_ia?: string
}

export type ColunaKanban = 'A fazer' | 'Fazendo hoje' | 'Aguardando cliente' | 'Resolvido'
export type PrioridadeKanban = 'Baixa' | 'Média' | 'Alta' | 'Urgente'

export interface ItemChecklist {
  id: string
  texto: string
  concluido: boolean
}

export interface CartaoKanban extends RecordModel {
  id: string
  titulo: string
  cliente?: string
  cliente_nome?: string
  loja: string
  responsavel: string
  coluna: ColunaKanban
  prioridade?: PrioridadeKanban
  descricao?: string
  data_limite?: string
  ordem?: number
  checklist_json?: string
  anexos?: string[]
  created: string
  updated: string
}

export interface CartaoKanbanInput {
  titulo: string
  cliente?: string
  cliente_nome?: string
  loja: string
  responsavel: string
  coluna: ColunaKanban
  prioridade?: PrioridadeKanban
  descricao?: string
  data_limite?: string
  ordem?: number
  checklist_json?: string
  anexos?: File[]
}

export type RoleUsuario = 'gestor' | 'atendente'

export interface UsuarioCRM extends RecordModel {
  id: string
  email: string
  name: string
  role?: RoleUsuario
  loja?: string
  avatar?: string
}

// NOVO: Tipos para o pilar de Reclamações
export type CanalReclamacao = 'Loja' | 'WhatsApp' | 'Telefone' | 'E-mail'
export type CategoriaReclamacao =
  | 'Produto com defeito'
  | 'Atraso na entrega'
  | 'Atendimento'
  | 'Troca/devolução'
  | 'Cobrança'
  | 'Outro'
export type GravidadeReclamacao = 'Baixa' | 'Média' | 'Alta'
export type StatusReclamacao = 'Aberta' | 'Em tratamento' | 'Resolvida'

export interface Reclamacao extends RecordModel {
  id: string
  cliente: string
  cliente_nome: string
  cliente_telefone?: string
  loja: string
  canal_origem: CanalReclamacao
  categoria: CategoriaReclamacao
  descricao: string
  gravidade: GravidadeReclamacao
  responsavel: string
  prazo_resolucao: string
  status: StatusReclamacao
  resolucao_desfecho?: string
  data_resolucao?: string
  created: string
  updated: string
}

export interface ReclamacaoInput {
  cliente: string
  cliente_nome: string
  cliente_telefone?: string
  loja: string
  canal_origem: CanalReclamacao
  categoria: CategoriaReclamacao
  descricao: string
  gravidade: GravidadeReclamacao
  responsavel: string
  prazo_resolucao: string
  status: StatusReclamacao
  resolucao_desfecho?: string
  data_resolucao?: string
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
