import pb from '@/lib/pocketbase/client'
import type { CartaoKanban, CartaoKanbanInput, ColunaSac } from '@/types/crm'
import {
  listarReclamacoes,
  criarReclamacao,
  atualizarReclamacao,
  resolverReclamacao,
  excluirReclamacao,
} from './reclamacoes'
import { criarCasoEvento } from './casoEventos'

// As 9 colunas oficiais do SAC (nomes exatos, sem acento em ANALISE)
export const COLUNAS_KANBAN: ColunaSac[] = [
  'NOVOS',
  'EM TRATAMENTO',
  'RETORNO DA LOJA',
  'ANALISE DIRETORIA',
  'A PAGAR',
  'COMPRAS',
  'AT',
  'COLETA/ENTREGA',
  'RESOLVIDO',
]

export const CORES_COLUNAS: Record<ColunaSac, string> = {
  NOVOS: 'bg-slate-500/10 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200',
  'EM TRATAMENTO':
    'bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
  'RETORNO DA LOJA':
    'bg-amber-500/10 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  'ANALISE DIRETORIA':
    'bg-purple-500/10 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300',
  'A PAGAR':
    'bg-orange-500/10 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300',
  COMPRAS:
    'bg-indigo-500/10 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300',
  AT: 'bg-rose-500/10 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
  'COLETA/ENTREGA':
    'bg-cyan-500/10 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300',
  RESOLVIDO:
    'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
}

// B1: O Kanban passa a renderizar exclusivamente 'reclamacoes' agrupadas por 'lista_quadro'
export async function listarCartoesKanban(lojaFiltro?: string): Promise<CartaoKanban[]> {
  return await getCartoesKanban(lojaFiltro)
}

export async function getCartoesKanban(lojaFiltro?: string): Promise<CartaoKanban[]> {
  try {
    let filtro = ''
    if (lojaFiltro && lojaFiltro !== 'todas') {
      filtro = `loja = "${lojaFiltro}"`
    }
    const ocorrencias = await listarReclamacoes(filtro, 'created')

    // Atribuir valores padrão se necessário
    return ocorrencias.map((rec) => {
      // Normalizar lista_quadro
      let coluna = rec.lista_quadro as ColunaSac
      if (!coluna || !COLUNAS_KANBAN.includes(coluna)) {
        if (rec.status === 'resolvida' || rec.status === 'Resolvida') {
          coluna = 'RESOLVIDO'
        } else if (rec.status === 'em_tratamento' || rec.status === 'Em tratamento') {
          coluna = 'EM TRATAMENTO'
        } else {
          coluna = 'NOVOS'
        }
      }
      return {
        ...rec,
        lista_quadro: coluna,
      }
    })
  } catch (error) {
    console.error('Erro ao buscar ocorrências no kanban:', error)
    return []
  }
}

export async function criarCartaoKanban(dados: CartaoKanbanInput): Promise<CartaoKanban> {
  return await criarReclamacao({
    ...dados,
    descricao: dados.descricao || 'Ocorrência registrada no Kanban',
    lista_quadro: dados.lista_quadro || 'NOVOS',
    status: dados.status || 'aberta',
  })
}

export async function moverCartaoKanban(
  cartaoId: string,
  novaColuna: ColunaSac,
  desfechoSeResolvido?: string,
): Promise<CartaoKanban> {
  // Se for mover para RESOLVIDO, exige desfecho
  if (novaColuna === 'RESOLVIDO') {
    if (!desfechoSeResolvido || !desfechoSeResolvido.trim()) {
      throw new Error('O preenchimento do desfecho é obrigatório para mover para RESOLVIDO.')
    }
    return await resolverReclamacao(cartaoId, desfechoSeResolvido.trim())
  }

  // Se estiver saindo de RESOLVIDO para outra coluna, volta para status em_tratamento
  const statusDestino = novaColuna === 'NOVOS' ? 'aberta' : 'em_tratamento'

  return await atualizarReclamacao(
    cartaoId,
    {
      lista_quadro: novaColuna,
      status: statusDestino,
    },
    {
      tipo: 'mudanca_lista',
      texto: `Cartão movido para a coluna "${novaColuna}".`,
    },
  )
}

export async function atualizarCartaoKanban(
  cartaoId: string,
  dados: Partial<CartaoKanbanInput>,
): Promise<CartaoKanban> {
  return await atualizarReclamacao(cartaoId, dados)
}

export async function excluirCartaoKanban(cartaoId: string): Promise<boolean> {
  return await excluirReclamacao(cartaoId)
}

export async function adicionarComentario(
  cartaoId: string,
  autor: string,
  texto: string,
): Promise<void> {
  await criarCasoEvento({
    caso: cartaoId,
    tipo: 'comentario',
    autor_nome: autor,
    texto,
  })
}

export function getUrlAnexo(cartao: CartaoKanban, fileName: string): string {
  return pb.files.getURL(cartao, fileName)
}
