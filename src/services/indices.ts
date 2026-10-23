import type { Atendimento, FollowUp, Reclamacao, QuebraBoem } from '@/types/crm'

export interface MetricasDesempenho {
  // Resumo de Atendimentos
  totalAtendimentos: number
  atendimentosConcluidos: number

  // Resumo de Follow-ups
  totalFollowUpsCriados: number
  followUpsConcluidos: number
  followUpsPendentes: number
  followUpsNoPrazo: number
  taxaFollowUpsNoPrazo: number // %

  // Resumo de Ocorrências
  totalOcorrencias: number
  ocorrenciasResolvidas: number
  ocorrenciasAbertas: number
  ocorrenciasVencidas: number
  taxaResolucaoOcorrencias: number // %
  ocorrenciasResolvidasNoSla: number
  taxaCumprimentoSla: number // %
  tempoMedioResolucaoDias: number | null // dias úteis ou corridos

  // Resumo de Quebras & BOEM
  totalQuebras: number
  quebrasResolvidas: number
  quebrasAbertas: number
}

export interface LinhaDesempenhoLoja {
  lojaId: string
  lojaNome: string
  isRede?: boolean
  metricas: MetricasDesempenho
}

/**
 * Normaliza e compara nomes de lojas de forma resiliente a variações como:
 * "Vila Olímpia (SP)" vs "Vila Olímpia", "Alphaville (Barueri)" vs "Alphaville".
 */
export function normalizarNomeLoja(nome: string): string {
  if (!nome) return ''
  return nome
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '') // remove parênteses e conteúdo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .trim()
}

export function mesmaLoja(lojaA: string, lojaB: string): boolean {
  if (!lojaA || !lojaB) return false
  const a = normalizarNomeLoja(lojaA)
  const b = normalizarNomeLoja(lojaB)
  return a === b || a.includes(b) || b.includes(a)
}

/**
 * Extrai a data no formato YYYY-MM-DD de uma string ISO ou data PocketBase
 */
export function extrairDataYMD(dataStr?: string | null): string | null {
  if (!dataStr) return null
  const match = dataStr.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

/**
 * Extrai ano e mês (YYYY-MM) de um campo de data
 */
export function extrairAnoMes(dataStr?: string | null): string | null {
  const ymd = extrairDataYMD(dataStr)
  return ymd ? ymd.substring(0, 7) : null
}

/**
 * Calcula a diferença em dias corridos entre duas datas YYYY-MM-DD
 */
export function diferencaDias(dataInicioYMD: string, dataFimYMD: string): number {
  const ini = new Date(`${dataInicioYMD}T12:00:00`)
  const fim = new Date(`${dataFimYMD}T12:00:00`)
  const diffMs = fim.getTime() - ini.getTime()
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)))
}

export interface FiltroDesempenhoOptions {
  mesAno?: string // "YYYY-MM" (ex: "2026-10") ou undefined para geral
  loja?: string // "Todas as Lojas" ou nome específico
}

/**
 * Filtra itens por loja e mês/ano (se fornecidos).
 * Utiliza o campo de criação ou data de evento de cada registro.
 */
export function filtrarPorPeriodoELoja<
  T extends { loja?: string; loja_origem?: string; created?: string },
>(
  itens: T[],
  campoData: (item: T) => string | undefined | null,
  options: FiltroDesempenhoOptions = {},
): T[] {
  const { mesAno, loja } = options

  return itens.filter((item) => {
    // Filtro por Loja
    if (loja && loja !== 'Todas as Lojas') {
      const itemLoja = item.loja || (item as unknown as { loja_origem?: string }).loja_origem || ''
      if (!mesmaLoja(itemLoja, loja)) {
        return false
      }
    }

    // Filtro por Mês/Ano
    if (mesAno) {
      const dataVal = campoData(item)
      const ym = extrairAnoMes(dataVal)
      if (ym !== mesAno) {
        return false
      }
    }

    return true
  })
}

/**
 * Calcula todas as métricas para um conjunto de registros já filtrados (ou não).
 * As fórmulas são rigorosamente idênticas às usadas no Dashboard.
 */
export function calcularMetricasDesempenho(params: {
  atendimentos: Atendimento[]
  followUps: FollowUp[]
  reclamacoes: Reclamacao[]
  quebras: QuebraBoem[]
  hojeRef?: string
}): MetricasDesempenho {
  const { atendimentos, followUps, reclamacoes, quebras } = params
  const hoje = params.hojeRef || new Date().toISOString().split('T')[0]

  // Atendimentos
  const totalAtendimentos = atendimentos.length
  const atendimentosConcluidos = atendimentos.filter((a) => a.status === 'Concluído').length

  // Follow-ups
  const totalFollowUpsCriados = followUps.length
  const followUpsConcluidosList = followUps.filter((f) => f.status === 'Concluído')
  const followUpsConcluidos = followUpsConcluidosList.length
  const followUpsPendentes = followUps.filter((f) => f.status === 'Pendente').length

  const followUpsNoPrazoList = followUpsConcluidosList.filter(
    (f) => !f.data_conclusao || f.data_conclusao <= f.data_prevista,
  )
  const followUpsNoPrazo = followUpsNoPrazoList.length
  const taxaFollowUpsNoPrazo =
    followUpsConcluidos > 0 ? Math.round((followUpsNoPrazo / followUpsConcluidos) * 100) : 100

  // Ocorrências (Reclamações)
  const totalOcorrencias = reclamacoes.length
  const ocorrenciasResolvidasList = reclamacoes.filter((r) => r.status === 'Resolvida')
  const ocorrenciasResolvidas = ocorrenciasResolvidasList.length
  const ocorrenciasAbertas = reclamacoes.filter((r) => r.status !== 'Resolvida').length

  const taxaResolucaoOcorrencias =
    totalOcorrencias > 0 ? Math.round((ocorrenciasResolvidas / totalOcorrencias) * 100) : 100

  // SLA de Ocorrências Resolvidas
  const ocorrenciasResolvidasNoSlaList = ocorrenciasResolvidasList.filter((r) => {
    if (!r.prazo_resolucao) return true
    const dataFim =
      r.data_resolucao || extrairDataYMD(r.updated) || extrairDataYMD(r.created) || hoje
    return dataFim <= r.prazo_resolucao
  })
  const ocorrenciasResolvidasNoSla = ocorrenciasResolvidasNoSlaList.length

  const taxaCumprimentoSla =
    ocorrenciasResolvidas > 0
      ? Math.round((ocorrenciasResolvidasNoSla / ocorrenciasResolvidas) * 100)
      : 100

  // Ocorrências Vencidas em aberto (prazo_resolucao < hoje)
  const ocorrenciasVencidas = reclamacoes.filter(
    (r) => r.status !== 'Resolvida' && r.prazo_resolucao && r.prazo_resolucao < hoje,
  ).length

  // Tempo Médio de Resolução (em dias corridos entre criação e resolução)
  let tempoMedioResolucaoDias: number | null = null
  if (ocorrenciasResolvidasList.length > 0) {
    const somaDias = ocorrenciasResolvidasList.reduce((acc, r) => {
      const dataIni = extrairDataYMD(r.created) || hoje
      const dataFim = r.data_resolucao || extrairDataYMD(r.updated) || dataIni
      return acc + diferencaDias(dataIni, dataFim)
    }, 0)
    tempoMedioResolucaoDias = Number((somaDias / ocorrenciasResolvidasList.length).toFixed(1))
  }

  // Quebras & BOEM
  const totalQuebras = quebras.length
  const quebrasResolvidas = quebras.filter((q) => q.status === 'Resolvida').length
  const quebrasAbertas = quebras.filter((q) => q.status !== 'Resolvida').length

  return {
    totalAtendimentos,
    atendimentosConcluidos,
    totalFollowUpsCriados,
    followUpsConcluidos,
    followUpsPendentes,
    followUpsNoPrazo,
    taxaFollowUpsNoPrazo,
    totalOcorrencias,
    ocorrenciasResolvidas,
    ocorrenciasAbertas,
    ocorrenciasVencidas,
    taxaResolucaoOcorrencias,
    ocorrenciasResolvidasNoSla,
    taxaCumprimentoSla,
    tempoMedioResolucaoDias,
    totalQuebras,
    quebrasResolvidas,
    quebrasAbertas,
  }
}

/**
 * Constrói a tabela consolidada de desempenho por loja (para as 7 lojas cadastradas)
 * mais a linha consolidada "Rede".
 */
export function gerarRelatorioPorLojas(params: {
  lojas: Array<{ id: string; nome: string }>
  atendimentos: Atendimento[]
  followUps: FollowUp[]
  reclamacoes: Reclamacao[]
  quebras: QuebraBoem[]
  mesAno?: string
  hojeRef?: string
}): {
  linhasLojas: LinhaDesempenhoLoja[]
  linhaRede: LinhaDesempenhoLoja
} {
  const { lojas, atendimentos, followUps, reclamacoes, quebras, mesAno, hojeRef } = params

  // 1. Filtra registros pelo mês/ano selecionado (se fornecido)
  const atFilt = mesAno
    ? atendimentos.filter(
        (a) => extrairAnoMes(a.data_atendimento) === mesAno || extrairAnoMes(a.created) === mesAno,
      )
    : atendimentos

  const fuFilt = mesAno
    ? followUps.filter(
        (f) => extrairAnoMes(f.data_prevista) === mesAno || extrairAnoMes(f.created) === mesAno,
      )
    : followUps

  const recFilt = mesAno
    ? reclamacoes.filter(
        (r) =>
          extrairAnoMes(r.created) === mesAno ||
          (r.data_resolucao && extrairAnoMes(r.data_resolucao) === mesAno),
      )
    : reclamacoes

  const qbFilt = mesAno
    ? quebras.filter(
        (q) =>
          extrairAnoMes(q.data_ocorrencia) === mesAno ||
          extrairAnoMes(q.created) === mesAno ||
          (q.data_resolucao && extrairAnoMes(q.data_resolucao) === mesAno),
      )
    : quebras

  // 2. Linhas por loja
  const linhasLojas: LinhaDesempenhoLoja[] = lojas.map((loja) => {
    const atLoja = atFilt.filter((a) => mesmaLoja(a.loja, loja.nome))
    const fuLoja = fuFilt.filter((f) => mesmaLoja(f.loja, loja.nome))
    const recLoja = recFilt.filter((r) => mesmaLoja(r.loja, loja.nome))
    const qbLoja = qbFilt.filter((q) => mesmaLoja(q.loja, loja.nome))

    const metricas = calcularMetricasDesempenho({
      atendimentos: atLoja,
      followUps: fuLoja,
      reclamacoes: recLoja,
      quebras: qbLoja,
      hojeRef,
    })

    return {
      lojaId: loja.id,
      lojaNome: loja.nome,
      isRede: false,
      metricas,
    }
  })

  // 3. Linha consolidada da Rede
  const metricasRede = calcularMetricasDesempenho({
    atendimentos: atFilt,
    followUps: fuFilt,
    reclamacoes: recFilt,
    quebras: qbFilt,
    hojeRef,
  })

  const linhaRede: LinhaDesempenhoLoja = {
    lojaId: 'rede-consolidado',
    lojaNome: 'Rede Consolidada (7 Lojas)',
    isRede: true,
    metricas: metricasRede,
  }

  return { linhasLojas, linhaRede }
}

/**
 * Gera conteúdo CSV para exportação do relatório mensal
 */
export function exportarDesempenhoParaCsv(params: {
  linhasLojas: LinhaDesempenhoLoja[]
  linhaRede: LinhaDesempenhoLoja
  mesAnoLabel: string
}): string {
  const { linhasLojas, linhaRede, mesAnoLabel } = params

  const headers = [
    'Unidade / Loja',
    'Atendimentos Registrados',
    'Follow-ups Criados',
    'Follow-ups Fechados',
    '% Follow-ups no Prazo',
    'Ocorrências Abertas',
    'Ocorrências Resolvidas',
    '% Taxa Resolução',
    '% Cumprimento SLA',
    'Tempo Médio Resolução (dias)',
    'Quebras Registradas',
    'Quebras Resolvidas',
  ]

  const formatLinha = (item: LinhaDesempenhoLoja) => {
    const m = item.metricas
    return [
      `"${item.lojaNome.replace(/"/g, '""')}"`,
      m.totalAtendimentos,
      m.totalFollowUpsCriados,
      m.followUpsConcluidos,
      `"${m.taxaFollowUpsNoPrazo}%"`,
      m.totalOcorrencias,
      m.ocorrenciasResolvidas,
      `"${m.taxaResolucaoOcorrencias}%"`,
      `"${m.taxaCumprimentoSla}%"`,
      m.tempoMedioResolucaoDias !== null ? m.tempoMedioResolucaoDias : '—',
      m.totalQuebras,
      m.quebrasResolvidas,
    ].join(';')
  }

  const linhas = [
    `"Relatório de Desempenho Mensal - Boutique de Revestimentos"`,
    `"Período de Referência: ${mesAnoLabel}"`,
    `"Data de Exportação: ${new Date().toLocaleDateString('pt-BR')}"`,
    '',
    headers.join(';'),
    ...linhasLojas.map(formatLinha),
    formatLinha(linhaRede),
  ]

  // Prefixo BOM UTF-8 (\uFEFF) para compatibilidade perfeita com Excel no Windows/Mac
  return '\uFEFF' + linhas.join('\r\n')
}

/**
 * Dispara o download de um arquivo no navegador
 */
export function downloadCsv(conteudo: string, nomeArquivo: string): void {
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', nomeArquivo)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Gera lista de opções de meses disponíveis para o seletor:
 * - Últimos 12 meses anteriores mais o mês atual
 * Cada item tem { valor: "YYYY-MM", rotulo: "Mês de AAAA", fechado: boolean }
 */
export function gerarOpcoesMeses(referencia: Date = new Date()): Array<{
  valor: string
  rotulo: string
  fechado: boolean
}> {
  const nomesMeses = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]

  const anoAtual = referencia.getFullYear()
  const mesAtual = referencia.getMonth() // 0 a 11

  const opcoes: Array<{ valor: string; rotulo: string; fechado: boolean }> = []

  // Gera últimos 12 meses retroativos
  for (let i = 0; i < 12; i++) {
    const d = new Date(anoAtual, mesAtual - i, 1)
    const ano = d.getFullYear()
    const mesNum = d.getMonth()
    const valor = `${ano}-${String(mesNum + 1).padStart(2, '0')}`
    const nomeMes = nomesMeses[mesNum]
    const fechado = i > 0
    const rotulo = fechado ? `${nomeMes} de ${ano} (fechado)` : `${nomeMes} de ${ano} (mês atual)`

    opcoes.push({ valor, rotulo, fechado })
  }

  return opcoes
}
