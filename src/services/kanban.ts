import pb from '@/lib/pocketbase/client'
import type { CartaoKanban, CartaoKanbanInput, ColunaKanban } from '@/types/crm'

/**
 * Lista todos os cartões do Kanban com ordenação por ordem e criação
 */
export async function listarCartoesKanban(filtro?: string): Promise<CartaoKanban[]> {
  try {
    const records = await pb.collection('kanban_cartoes').getFullList<CartaoKanban>({
      filter: filtro || '',
      sort: 'ordem,created',
    })
    return records
  } catch (err) {
    console.error('Erro ao listar cartões Kanban:', err)
    return []
  }
}

/**
 * Cria um novo cartão no Kanban, opcionalmente com anexos (FormData)
 */
export async function criarCartaoKanban(dados: CartaoKanbanInput): Promise<CartaoKanban> {
  if (dados.anexos && dados.anexos.length > 0) {
    const formData = new FormData()
    formData.append('titulo', dados.titulo)
    if (dados.cliente) formData.append('cliente', dados.cliente)
    if (dados.cliente_nome) formData.append('cliente_nome', dados.cliente_nome)
    formData.append('loja', dados.loja)
    formData.append('responsavel', dados.responsavel)
    formData.append('coluna', dados.coluna)
    if (dados.prioridade) formData.append('prioridade', dados.prioridade)
    if (dados.descricao) formData.append('descricao', dados.descricao)
    if (dados.data_limite) formData.append('data_limite', dados.data_limite)
    if (dados.ordem !== undefined) formData.append('ordem', String(dados.ordem))
    if (dados.checklist_json) formData.append('checklist_json', dados.checklist_json)

    for (const file of dados.anexos) {
      formData.append('anexos', file)
    }

    const record = await pb.collection('kanban_cartoes').create<CartaoKanban>(formData)
    return record
  }

  const payload: Record<string, unknown> = {
    titulo: dados.titulo,
    cliente: dados.cliente || '',
    cliente_nome: dados.cliente_nome || '',
    loja: dados.loja,
    responsavel: dados.responsavel,
    coluna: dados.coluna,
    prioridade: dados.prioridade || 'Média',
    descricao: dados.descricao || '',
    data_limite: dados.data_limite || '',
    ordem: dados.ordem ?? 0,
    checklist_json: dados.checklist_json || '[]',
    comentarios_json: dados.comentarios_json || '[]',
    etiquetas_json: dados.etiquetas_json || '[]',
  }
  const record = await pb.collection('kanban_cartoes').create<CartaoKanban>(payload)
  return record
}

/**
 * Atualiza um cartão existente (inclusive coluna ao arrastar)
 */
export async function atualizarCartaoKanban(
  id: string,
  dados: Partial<CartaoKanbanInput> & { anexosNovos?: File[] },
): Promise<CartaoKanban> {
  if (dados.anexosNovos && dados.anexosNovos.length > 0) {
    const formData = new FormData()
    if (dados.titulo !== undefined) formData.append('titulo', dados.titulo)
    if (dados.coluna !== undefined) formData.append('coluna', dados.coluna)
    if (dados.prioridade !== undefined) formData.append('prioridade', dados.prioridade)
    if (dados.descricao !== undefined) formData.append('descricao', dados.descricao)
    if (dados.data_limite !== undefined) formData.append('data_limite', dados.data_limite)
    if (dados.ordem !== undefined) formData.append('ordem', String(dados.ordem))
    if (dados.checklist_json !== undefined) formData.append('checklist_json', dados.checklist_json)
    if (dados.comentarios_json !== undefined)
      formData.append('comentarios_json', dados.comentarios_json)
    if (dados.etiquetas_json !== undefined) formData.append('etiquetas_json', dados.etiquetas_json)
    if (dados.responsavel !== undefined) formData.append('responsavel', dados.responsavel)
    if (dados.loja !== undefined) formData.append('loja', dados.loja)
    if (dados.cliente !== undefined) formData.append('cliente', dados.cliente)
    if (dados.cliente_nome !== undefined) formData.append('cliente_nome', dados.cliente_nome)

    for (const file of dados.anexosNovos) {
      formData.append('anexos', file)
    }

    const record = await pb.collection('kanban_cartoes').update<CartaoKanban>(id, formData)
    return record
  }

  const record = await pb.collection('kanban_cartoes').update<CartaoKanban>(id, dados)
  return record
}

/**
 * Atualiza a coluna de um cartão (ação de drag and drop)
 */
export async function moverCartaoColuna(
  id: string,
  novaColuna: ColunaKanban,
  novaOrdem?: number,
): Promise<CartaoKanban> {
  const payload: { coluna: ColunaKanban; ordem?: number } = { coluna: novaColuna }
  if (novaOrdem !== undefined) {
    payload.ordem = novaOrdem
  }
  const record = await pb.collection('kanban_cartoes').update<CartaoKanban>(id, payload)
  return record
}

/**
 * Exclui um cartão do Kanban
 */
export async function excluirCartaoKanban(id: string): Promise<boolean> {
  try {
    await pb.collection('kanban_cartoes').delete(id)
    return true
  } catch (err) {
    console.error('Erro ao excluir cartão Kanban:', err)
    return false
  }
}

/**
 * Helper para obter URL completa de download de um anexo do cartão
 */
export function getUrlAnexo(cartao: CartaoKanban, fileName: string): string {
  return pb.files.getURL(cartao, fileName)
}
