import pb from '@/lib/pocketbase/client'
import type { Reclamacao, ReclamacaoInput } from '@/types/crm'
import { criarCasoEvento } from './casoEventos'

export async function listarReclamacoes(filtro?: string, sort = '-created'): Promise<Reclamacao[]> {
  try {
    return await pb.collection('reclamacoes').getFullList<Reclamacao>({
      filter: filtro,
      sort,
      expand: 'cliente,responsavel_user,resolvida_por',
    })
  } catch (err) {
    console.error('Erro ao listar reclamações:', err)
    return []
  }
}

export async function listarReclamacoesPorCliente(clienteId: string): Promise<Reclamacao[]> {
  try {
    return await pb.collection('reclamacoes').getFullList<Reclamacao>({
      filter: `cliente = "${clienteId}"`,
      sort: '-created',
      expand: 'cliente,responsavel_user,resolvida_por',
    })
  } catch (err) {
    console.error('Erro ao listar reclamações do cliente:', err)
    return []
  }
}

export async function buscarReclamacaoPorId(id: string): Promise<Reclamacao> {
  return await pb.collection('reclamacoes').getOne<Reclamacao>(id, {
    expand: 'cliente,responsavel_user,resolvida_por',
  })
}

export async function buscarReclamacaoPorTrelloId(trelloId: string): Promise<Reclamacao | null> {
  try {
    return await pb
      .collection('reclamacoes')
      .getFirstListItem<Reclamacao>(`origem_trello_id = "${trelloId}"`, {
        expand: 'cliente,responsavel_user,resolvida_por',
      })
  } catch (_) {
    return null
  }
}

export async function criarReclamacao(dados: ReclamacaoInput): Promise<Reclamacao> {
  let registro: Reclamacao
  if (dados.anexos && dados.anexos.length > 0) {
    const formData = new FormData()
    Object.entries(dados).forEach(([key, val]) => {
      if (key !== 'anexos' && val !== undefined && val !== null) {
        if (typeof val === 'object') {
          formData.append(key, JSON.stringify(val))
        } else {
          formData.append(key, String(val))
        }
      }
    })
    for (const file of dados.anexos) {
      formData.append('anexos', file)
    }
    registro = await pb.collection('reclamacoes').create<Reclamacao>(formData)
  } else {
    const { anexos, ...payload } = dados
    registro = await pb.collection('reclamacoes').create<Reclamacao>({
      ...payload,
      status: dados.status || 'aberta',
      lista_quadro: dados.lista_quadro || 'NOVOS',
    })
  }

  // Registrar evento inicial em caso_eventos
  try {
    await criarCasoEvento({
      caso: registro.id,
      tipo: 'comentario',
      texto: `Ocorrência registrada no sistema (${registro.codigo || 'Novo caso'}).`,
      loja_evento: registro.loja,
    })
  } catch (err) {
    console.warn('Falha ao registrar evento de criação:', err)
  }

  return registro
}

export function getUrlAnexoReclamacao(reclamacao: Reclamacao, fileName: string): string {
  return pb.files.getURL(reclamacao, fileName)
}

export async function atualizarReclamacao(
  id: string,
  dados: Partial<ReclamacaoInput>,
  motivoEvento?: {
    texto?: string
    tipo?: 'comentario' | 'mudanca_lista' | 'mudanca_status' | 'cobranca' | 'aprovacao' | 'anexo'
    dados?: Record<string, unknown>
  },
): Promise<Reclamacao> {
  const atual = await pb.collection('reclamacoes').getOne<Reclamacao>(id)

  let atualizado: Reclamacao
  if (dados.anexos && dados.anexos.length > 0) {
    const formData = new FormData()
    Object.entries(dados).forEach(([key, val]) => {
      if (key !== 'anexos' && val !== undefined && val !== null) {
        if (typeof val === 'object') {
          formData.append(key, JSON.stringify(val))
        } else {
          formData.append(key, String(val))
        }
      }
    })
    for (const file of dados.anexos) {
      formData.append('anexos', file)
    }
    atualizado = await pb.collection('reclamacoes').update<Reclamacao>(id, formData)
  } else {
    const { anexos, ...payload } = dados
    atualizado = await pb.collection('reclamacoes').update<Reclamacao>(id, payload)
  }

  // Gerar eventos automáticos para mudanças de lista_quadro ou status
  try {
    if (dados.lista_quadro && dados.lista_quadro !== atual.lista_quadro) {
      await criarCasoEvento({
        caso: id,
        tipo: 'mudanca_lista',
        texto:
          motivoEvento?.texto ||
          `Coluna alterada de "${atual.lista_quadro || 'Sem coluna'}" para "${dados.lista_quadro}".`,
        dados: { de: atual.lista_quadro, para: dados.lista_quadro, ...(motivoEvento?.dados || {}) },
        loja_evento: atualizado.loja,
      })
    } else if (dados.status && dados.status !== atual.status) {
      await criarCasoEvento({
        caso: id,
        tipo: 'mudanca_status',
        texto:
          motivoEvento?.texto || `Status alterado de "${atual.status}" para "${dados.status}".`,
        dados: { de: atual.status, para: dados.status, ...(motivoEvento?.dados || {}) },
        loja_evento: atualizado.loja,
      })
    } else if (motivoEvento?.texto) {
      await criarCasoEvento({
        caso: id,
        tipo: motivoEvento.tipo || 'comentario',
        texto: motivoEvento.texto,
        dados: motivoEvento.dados,
        loja_evento: atualizado.loja,
      })
    }
  } catch (err) {
    console.warn('Falha ao registrar evento na atualização da ocorrência:', err)
  }

  return atualizado
}

export async function resolverReclamacao(
  id: string,
  desfecho: string,
  usuarioId?: string,
): Promise<Reclamacao> {
  if (!desfecho || !desfecho.trim()) {
    throw new Error('O preenchimento do desfecho é obrigatório para resolver a ocorrência.')
  }

  const agora = new Date().toISOString()
  const hoje = agora.split('T')[0]
  const user = pb.authStore.record
  const resolvedorId = usuarioId || user?.id || undefined

  const payload: Partial<ReclamacaoInput> = {
    status: 'resolvida',
    lista_quadro: 'RESOLVIDO',
    desfecho: desfecho.trim(),
    resolucao_desfecho: desfecho.trim(),
    data_resolucao: hoje,
    resolvida_em: agora,
    resolvida_por: resolvedorId,
  }

  const atualizado = await pb.collection('reclamacoes').update<Reclamacao>(id, payload)

  try {
    await criarCasoEvento({
      caso: id,
      tipo: 'mudanca_status',
      texto: `Ocorrência resolvida com desfecho: "${desfecho.trim()}".`,
      dados: { status: 'resolvida', lista_quadro: 'RESOLVIDO', resolvida_por: resolvedorId },
      loja_evento: atualizado.loja,
    })
  } catch (err) {
    console.warn('Falha ao registrar evento de resolução:', err)
  }

  return atualizado
}

export async function reabrirReclamacao(id: string, motivo: string): Promise<Reclamacao> {
  const payload: Partial<ReclamacaoInput> = {
    status: 'em_tratamento',
    lista_quadro: 'EM TRATAMENTO',
  }

  const atualizado = await pb.collection('reclamacoes').update<Reclamacao>(id, payload)

  try {
    await criarCasoEvento({
      caso: id,
      tipo: 'mudanca_status',
      texto: `Ocorrência reaberta por ${pb.authStore.record?.name || 'Gestor/SAC'}. Motivo: "${motivo}".`,
      dados: { status: 'em_tratamento', lista_quadro: 'EM TRATAMENTO', motivo },
      loja_evento: atualizado.loja,
    })
  } catch (err) {
    console.warn('Falha ao registrar evento de reabertura:', err)
  }

  return atualizado
}

export async function cancelarReclamacao(id: string, motivo: string): Promise<Reclamacao> {
  const payload: Partial<ReclamacaoInput> = {
    status: 'cancelada',
  }

  const atualizado = await pb.collection('reclamacoes').update<Reclamacao>(id, payload)

  try {
    await criarCasoEvento({
      caso: id,
      tipo: 'mudanca_status',
      texto: `Ocorrência cancelada. Motivo: "${motivo}".`,
      dados: { status: 'cancelada', motivo },
      loja_evento: atualizado.loja,
    })
  } catch (err) {
    console.warn('Falha ao registrar evento de cancelamento:', err)
  }

  return atualizado
}

export async function excluirReclamacao(id: string): Promise<boolean> {
  return await pb.collection('reclamacoes').delete(id)
}
