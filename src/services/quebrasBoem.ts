import pb from '@/lib/pocketbase/client'
import type { QuebraBoem, QuebraBoemInput } from '@/types/crm'

export async function listarQuebrasBoem(filtro?: string, sort = '-created'): Promise<QuebraBoem[]> {
  const records = await pb.collection('quebras_boem').getFullList<QuebraBoem>({
    filter: filtro,
    sort,
  })
  return records
}

export async function listarQuebrasPorCliente(clienteId: string): Promise<QuebraBoem[]> {
  const records = await pb.collection('quebras_boem').getFullList<QuebraBoem>({
    filter: `cliente = "${clienteId}"`,
    sort: '-created',
  })
  return records
}

export async function contarQuebrasEmAbertoPorCliente(clienteId: string): Promise<number> {
  try {
    const list = await pb.collection('quebras_boem').getList(1, 1, {
      filter: `cliente = "${clienteId}" && status != "Resolvida"`,
      fields: 'id',
    })
    return list.totalItems
  } catch (err) {
    console.error('Erro ao contar quebras em aberto:', err)
    return 0
  }
}

export async function buscarQuebraPorId(id: string): Promise<QuebraBoem> {
  const record = await pb.collection('quebras_boem').getOne<QuebraBoem>(id)
  return record
}

export async function criarQuebraBoem(dados: QuebraBoemInput): Promise<QuebraBoem> {
  // Se houver arquivos de anexo, usa FormData para suporte a upload
  if (dados.anexos && dados.anexos.length > 0) {
    const formData = new FormData()
    formData.append('numero_pedido', dados.numero_pedido)
    if (dados.nf_saida) formData.append('nf_saida', dados.nf_saida)
    if (dados.cliente) formData.append('cliente', dados.cliente)
    formData.append('cliente_nome', dados.cliente_nome)
    formData.append('loja', dados.loja)
    if (dados.produtos_envolvidos) formData.append('produtos_envolvidos', dados.produtos_envolvidos)
    if (dados.responsabilidade_apurada)
      formData.append('responsabilidade_apurada', dados.responsabilidade_apurada)
    if (dados.acao_adotada) formData.append('acao_adotada', dados.acao_adotada)
    if (dados.resultado_boem) formData.append('resultado_boem', dados.resultado_boem)
    formData.append('status', dados.status)
    if (dados.responsavel) formData.append('responsavel', dados.responsavel)
    if (dados.data_ocorrencia) formData.append('data_ocorrencia', dados.data_ocorrencia)
    if (dados.data_resolucao) formData.append('data_resolucao', dados.data_resolucao)
    if (dados.descricao_detalhada) formData.append('descricao_detalhada', dados.descricao_detalhada)
    if (dados.origem_trello_id) formData.append('origem_trello_id', dados.origem_trello_id)

    for (const file of dados.anexos) {
      formData.append('anexos', file)
    }

    const record = await pb.collection('quebras_boem').create<QuebraBoem>(formData)
    return record
  }

  // Sem anexos
  const { anexos, ...payload } = dados
  const record = await pb.collection('quebras_boem').create<QuebraBoem>(payload)
  return record
}

export async function atualizarQuebraBoem(
  id: string,
  dados: Partial<QuebraBoemInput> & { novosAnexos?: File[] },
): Promise<QuebraBoem> {
  if (dados.novosAnexos && dados.novosAnexos.length > 0) {
    const formData = new FormData()
    Object.entries(dados).forEach(([key, val]) => {
      if (key !== 'novosAnexos' && key !== 'anexos' && val !== undefined && val !== null) {
        formData.append(key, String(val))
      }
    })
    for (const file of dados.novosAnexos) {
      formData.append('anexos', file)
    }
    const record = await pb.collection('quebras_boem').update<QuebraBoem>(id, formData)
    return record
  }

  const { novosAnexos, anexos, ...payload } = dados
  const record = await pb.collection('quebras_boem').update<QuebraBoem>(id, payload)
  return record
}

export async function resolverQuebraBoem(
  id: string,
  acaoAdotada?: string,
  resultadoBoem?: QuebraBoem['resultado_boem'],
): Promise<QuebraBoem> {
  const payload: Record<string, unknown> = {
    status: 'Resolvida',
    data_resolucao: new Date().toISOString().split('T')[0],
  }
  if (acaoAdotada) payload.acao_adotada = acaoAdotada
  if (resultadoBoem) payload.resultado_boem = resultadoBoem

  const record = await pb.collection('quebras_boem').update<QuebraBoem>(id, payload)
  return record
}

export async function excluirQuebraBoem(id: string): Promise<boolean> {
  try {
    await pb.collection('quebras_boem').delete(id)
    return true
  } catch (err) {
    console.error('Falha ao excluir quebra/BOEM:', err)
    return false
  }
}

export function getUrlAnexoQuebra(quebra: QuebraBoem, fileName: string): string {
  return pb.files.getURL(quebra, fileName)
}
