import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  FileSpreadsheet,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  Download,
  Filter,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { listarAtendimentos } from '@/services/atendimentos'
import { listarFollowUps } from '@/services/followUps'
import { listarReclamacoes } from '@/services/reclamacoes'
import { listarQuebrasBoem } from '@/services/quebrasBoem'
import { getUsuarioAtualInfo } from '@/services/permissoes'
import { LOJAS } from '@/data/boutiqueData'
import { useToast } from '@/hooks/use-toast'
import type { Atendimento, FollowUp, Reclamacao, QuebraBoem } from '@/types/crm'
import {
  calcularMetricasDesempenho,
  gerarRelatorioPorLojas,
  gerarOpcoesMeses,
  exportarDesempenhoParaCsv,
  downloadCsv,
  mesmaLoja,
  extrairAnoMes,
  type LinhaDesempenhoLoja,
} from '@/services/indices'

export default function RelatorioMensalPage() {
  const { toast } = useToast()
  const userInfo = getUsuarioAtualInfo()
  const [searchParams, setSearchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState(false)

  // Dados brutos
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [reclamacoes, setReclamacoes] = useState<Reclamacao[]>([])
  const [quebras, setQuebras] = useState<QuebraBoem[]>([])

  // Opções de meses disponíveis
  const opcoesMeses = useMemo(() => gerarOpcoesMeses(), [])

  // Mês/ano selecionado na URL ou padrão: mês anterior fechado (opcoesMeses[1]) ou mês atual
  const mesParam = searchParams.get('mes')
  const lojaParam = searchParams.get('loja')

  // Valor padrão do mês: mês fechado anterior se disponível (index 1), senão atual (index 0)
  const mesPadrao = opcoesMeses.length > 1 ? opcoesMeses[1].valor : opcoesMeses[0]?.valor || ''

  const [mesSelecionado, setMesSelecionado] = useState<string>(() => {
    return mesParam || mesPadrao
  })

  const [lojaSelecionada, setLojaSelecionada] = useState<string>(() => {
    return lojaParam || 'Todas as Lojas'
  })

  // Sincroniza query params
  useEffect(() => {
    if (mesParam && mesParam !== mesSelecionado) {
      setMesSelecionado(mesParam)
    }
  }, [mesParam])

  useEffect(() => {
    if (lojaParam && lojaParam !== lojaSelecionada) {
      setLojaSelecionada(lojaParam)
    }
  }, [lojaParam])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [aList, fList, rList, qList] = await Promise.all([
        listarAtendimentos(),
        listarFollowUps(),
        listarReclamacoes(),
        listarQuebrasBoem(),
      ])
      setAtendimentos(aList)
      setFollowUps(fList)
      setReclamacoes(rList)
      setQuebras(qList)
    } catch (err) {
      console.error('Erro ao carregar dados para o relatório:', err)
      toast({
        title: 'Falha ao carregar relatório',
        description: 'Não foi possível carregar os dados das lojas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Manipuladores de filtro
  const handleAlterarMes = (novoMes: string) => {
    setMesSelecionado(novoMes)
    const next = new URLSearchParams(searchParams)
    next.set('mes', novoMes)
    setSearchParams(next)
  }

  const handleAlterarLoja = (novaLoja: string) => {
    setLojaSelecionada(novaLoja)
    const next = new URLSearchParams(searchParams)
    if (novaLoja === 'Todas as Lojas') {
      next.delete('loja')
    } else {
      next.set('loja', novaLoja)
    }
    setSearchParams(next)
  }

  // Label amigável do mês selecionado
  const mesAtualObj = opcoesMeses.find((m) => m.valor === mesSelecionado)
  const mesLabelFormatado = mesAtualObj ? mesAtualObj.rotulo : mesSelecionado

  // 1. Tabela por Loja e Linha Rede (sempre com as 7 lojas estruturadas para o período)
  const { linhasLojas, linhaRede } = useMemo(() => {
    return gerarRelatorioPorLojas({
      lojas: LOJAS,
      atendimentos,
      followUps,
      reclamacoes,
      quebras,
      mesAno: mesSelecionado,
    })
  }, [atendimentos, followUps, reclamacoes, quebras, mesSelecionado])

  // 2. Registros filtrados pelo período E pela loja selecionada (para os blocos de Resumo e KPIs de topo)
  const metricasEscopoSelecionado = useMemo(() => {
    const atFilt = atendimentos.filter((a) => {
      const noMes =
        extrairAnoMes(a.data_atendimento) === mesSelecionado ||
        extrairAnoMes(a.created) === mesSelecionado
      if (!noMes) return false
      if (lojaSelecionada === 'Todas as Lojas') return true
      return mesmaLoja(a.loja, lojaSelecionada)
    })

    const fuFilt = followUps.filter((f) => {
      const noMes =
        extrairAnoMes(f.data_prevista) === mesSelecionado ||
        extrairAnoMes(f.created) === mesSelecionado
      if (!noMes) return false
      if (lojaSelecionada === 'Todas as Lojas') return true
      return mesmaLoja(f.loja, lojaSelecionada)
    })

    const recFilt = reclamacoes.filter((r) => {
      const noMes =
        extrairAnoMes(r.created) === mesSelecionado ||
        (r.data_resolucao && extrairAnoMes(r.data_resolucao) === mesSelecionado)
      if (!noMes) return false
      if (lojaSelecionada === 'Todas as Lojas') return true
      return mesmaLoja(r.loja, lojaSelecionada)
    })

    const qbFilt = quebras.filter((q) => {
      const noMes =
        extrairAnoMes(q.data_ocorrencia) === mesSelecionado ||
        extrairAnoMes(q.created) === mesSelecionado ||
        (q.data_resolucao && extrairAnoMes(q.data_resolucao) === mesSelecionado)
      if (!noMes) return false
      if (lojaSelecionada === 'Todas as Lojas') return true
      return mesmaLoja(q.loja, lojaSelecionada)
    })

    return calcularMetricasDesempenho({
      atendimentos: atFilt,
      followUps: fuFilt,
      reclamacoes: recFilt,
      quebras: qbFilt,
    })
  }, [atendimentos, followUps, reclamacoes, quebras, mesSelecionado, lojaSelecionada])

  // Linhas da tabela filtradas se o usuário filtrou por uma única loja
  const linhasTabelaExibidas = useMemo(() => {
    if (lojaSelecionada === 'Todas as Lojas') {
      return linhasLojas
    }
    return linhasLojas.filter((l) => mesmaLoja(l.lojaNome, lojaSelecionada))
  }, [linhasLojas, lojaSelecionada])

  // Exportar para CSV
  const handleExportarCsv = () => {
    try {
      setExportando(true)
      const csv = exportarDesempenhoParaCsv({
        linhasLojas,
        linhaRede,
        mesAnoLabel: mesLabelFormatado,
      })
      const nomeArquivo = `relatorio-desempenho-${mesSelecionado}.csv`
      downloadCsv(csv, nomeArquivo)
      toast({
        title: 'Relatório exportado!',
        description: `Arquivo ${nomeArquivo} baixado com sucesso.`,
      })
    } catch (err) {
      console.error('Falha ao exportar CSV:', err)
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível gerar a planilha CSV.',
        variant: 'destructive',
      })
    } finally {
      setExportando(false)
    }
  }

  // Se o usuário não for Gestor, bloqueia a exibição (respeitando permissão de acesso)
  if (!userInfo.isGestor) {
    return (
      <div className="bg-white rounded-[24px] p-8 border border-rose-200 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-[#1D2B25]">Acesso Restrito ao Gestor</h2>
        <p className="text-xs text-[#5E6E64] max-w-md mx-auto">
          O Relatório de Desempenho Mensal é confidencial e disponível exclusivamente para a gestão
          executiva da rede de boutiques.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2F6B4F] text-white text-xs font-semibold hover:bg-[#25563f] transition-colors"
          >
            <span>Voltar ao Meu Painel</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Topo do Relatório com Filtros Sóbrios */}
      <div className="bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2F6B4F] px-2 py-0.5 rounded-full bg-[#EAF2E8] border border-[#A8C3A0]/40">
              Diretoria & Gestão Executiva
            </span>
            <span className="text-xs text-[#5E6E64]">Rede 7 Lojas SP</span>
          </div>
          <h1 className="font-semibold text-2xl sm:text-3xl text-[#1D2B25] tracking-tight mt-1">
            Relatório de Desempenho Mensal
          </h1>
          <p className="text-xs text-[#5E6E64] mt-0.5">
            Métricas consolidadas de atendimento, follow-ups, ocorrências e quebras por período.
          </p>
        </div>

        {/* Barra de Filtros e Ação de Exportação */}
        <div className="flex flex-wrap items-center gap-2.5 self-stretch lg:self-auto">
          {/* Seletor de Mês/Ano */}
          <div className="flex items-center gap-1.5 bg-[#F7FAF5] border border-[#A8C3A0]/50 rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-[#2F6B4F] shrink-0" />
            <select
              value={mesSelecionado}
              onChange={(e) => handleAlterarMes(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#1D2B25] focus:outline-none cursor-pointer pr-1 py-0.5"
              aria-label="Selecionar período do relatório"
            >
              {opcoesMeses.map((opt) => (
                <option key={opt.valor} value={opt.valor} className="text-[#1D2B25] bg-white">
                  {opt.rotulo}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor Opcional de Loja Única */}
          <div className="flex items-center gap-1.5 bg-[#F7FAF5] border border-[#A8C3A0]/50 rounded-xl px-3 py-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5 text-[#2F6B4F] shrink-0" />
            <select
              value={lojaSelecionada}
              onChange={(e) => handleAlterarLoja(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#1D2B25] focus:outline-none cursor-pointer pr-1 py-0.5"
              aria-label="Filtrar por unidade"
            >
              <option value="Todas as Lojas" className="text-[#1D2B25] bg-white">
                Todas as 7 Lojas (Rede)
              </option>
              {LOJAS.map((l) => (
                <option key={l.id} value={l.nome} className="text-[#1D2B25] bg-white">
                  {l.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Botão de Exportação CSV */}
          <button
            type="button"
            onClick={handleExportarCsv}
            disabled={exportando || loading}
            title="Baixar planilha CSV para apresentar à diretoria"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#2F6B4F] hover:bg-[#25563f] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportando ? 'Exportando...' : 'Exportar CSV'}</span>
          </button>
        </div>
      </div>

      {/* BLOCO 2A: Resumo do Mês em Etiquetas Estáticas Compactas (sem gráficos pulsantes, sem anéis) */}
      <div className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-[#EAF2E8]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2F6B4F]">
              Resumo Operacional do Período
            </span>
            <span className="text-xs text-[#5E6E64]">• {mesLabelFormatado}</span>
          </div>
          <span className="text-[11px] text-[#5E6E64] font-medium px-2 py-0.5 rounded-md bg-[#F7FAF5] border border-[#A8C3A0]/25">
            {lojaSelecionada === 'Todas as Lojas'
              ? 'Consolidado Rede'
              : lojaSelecionada.replace(' (SP)', '')}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Atendimentos Registrados */}
          <div className="p-3.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/25 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64]">
              Atendimentos
            </span>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <span className="font-bold text-2xl text-[#1D2B25] tracking-tight">
                {metricasEscopoSelecionado.totalAtendimentos}
              </span>
              <span className="text-[11px] text-[#5E6E64] font-medium">
                {metricasEscopoSelecionado.atendimentosConcluidos} concluído
                {metricasEscopoSelecionado.atendimentosConcluidos !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-[10px] text-[#5E6E64] mt-1">Registrados no mês</p>
          </div>

          {/* Follow-ups */}
          <div className="p-3.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/25 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64]">
              Follow-ups
            </span>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <span className="font-bold text-2xl text-[#1D2B25] tracking-tight">
                {metricasEscopoSelecionado.totalFollowUpsCriados}
              </span>
              <span className="text-[11px] text-[#5E6E64] font-medium">
                {metricasEscopoSelecionado.followUpsConcluidos} fechado
                {metricasEscopoSelecionado.followUpsConcluidos !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-[10px] text-[#5E6E64] mt-1">
              {metricasEscopoSelecionado.followUpsPendentes} pendente
              {metricasEscopoSelecionado.followUpsPendentes !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Ocorrências */}
          <div className="p-3.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/25 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64]">
              Ocorrências
            </span>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <span className="font-bold text-2xl text-[#1D2B25] tracking-tight">
                {metricasEscopoSelecionado.totalOcorrencias}
              </span>
              <span className="text-[11px] text-[#5E6E64] font-medium">
                {metricasEscopoSelecionado.ocorrenciasResolvidas} resolvida
                {metricasEscopoSelecionado.ocorrenciasResolvidas !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-[10px] text-[#5E6E64] mt-1">
              {metricasEscopoSelecionado.ocorrenciasAbertas} em tratamento
            </p>
          </div>

          {/* Quebras & BOEM */}
          <div className="p-3.5 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/25 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64]">
              Quebras & BOEM
            </span>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <span className="font-bold text-2xl text-[#1D2B25] tracking-tight">
                {metricasEscopoSelecionado.totalQuebras}
              </span>
              <span className="text-[11px] text-[#5E6E64] font-medium">
                {metricasEscopoSelecionado.quebrasResolvidas} resolvida
                {metricasEscopoSelecionado.quebrasResolvidas !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-[10px] text-[#5E6E64] mt-1">
              {metricasEscopoSelecionado.quebrasAbertas} em apuração
            </p>
          </div>
        </div>
      </div>

      {/* BLOCO 2B: Índices de Qualidade do Mês (mesmas fórmulas do dashboard, recortadas pelo período) */}
      <div className="bg-white rounded-2xl p-5 border border-[#A8C3A0]/30 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-[#EAF2E8]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2F6B4F]">
              Índices de Qualidade do Atendimento
            </span>
            <h3 className="font-semibold text-base text-[#1D2B25] mt-0.5">
              Metas e Prazos Operacionais ({mesLabelFormatado})
            </h3>
          </div>
          <span className="text-xs text-[#5E6E64] font-medium">
            Fórmulas padronizadas com o painel central
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Índice 1: Taxa de Resolução de Ocorrências */}
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/25">
            <div
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold font-mono shrink-0 ${
                metricasEscopoSelecionado.taxaResolucaoOcorrencias >= 75
                  ? 'bg-[#EAF2E8] border-[#A8C3A0]/40 text-[#2F6B4F]'
                  : metricasEscopoSelecionado.taxaResolucaoOcorrencias >= 50
                    ? 'bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {metricasEscopoSelecionado.taxaResolucaoOcorrencias}%
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64] block truncate">
                Resolução de Ocorrências
              </span>
              <p className="text-xs font-semibold text-[#1D2B25] mt-0.5">
                {metricasEscopoSelecionado.ocorrenciasResolvidas} de{' '}
                {metricasEscopoSelecionado.totalOcorrencias} tratadas
              </p>
              <p className="text-[11px] text-[#5E6E64] truncate">com desfecho final</p>
            </div>
          </div>

          {/* Índice 2: % Follow-ups no Prazo */}
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/25">
            <div
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold font-mono shrink-0 ${
                metricasEscopoSelecionado.taxaFollowUpsNoPrazo >= 85
                  ? 'bg-[#EAF2E8] border-[#A8C3A0]/40 text-[#2F6B4F]'
                  : metricasEscopoSelecionado.taxaFollowUpsNoPrazo >= 70
                    ? 'bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {metricasEscopoSelecionado.taxaFollowUpsNoPrazo}%
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64] block truncate">
                Follow-ups no Prazo
              </span>
              <p className="text-xs font-semibold text-[#1D2B25] mt-0.5">
                {metricasEscopoSelecionado.followUpsNoPrazo} de{' '}
                {metricasEscopoSelecionado.followUpsConcluidos || 1} pontuais
              </p>
              <p className="text-[11px] text-[#5E6E64] truncate">cronograma cumprido</p>
            </div>
          </div>

          {/* Índice 3: % Cumprimento de SLA */}
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/25">
            <div
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold font-mono shrink-0 ${
                metricasEscopoSelecionado.taxaCumprimentoSla >= 85
                  ? 'bg-[#EAF2E8] border-[#A8C3A0]/40 text-[#2F6B4F]'
                  : metricasEscopoSelecionado.taxaCumprimentoSla >= 70
                    ? 'bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {metricasEscopoSelecionado.taxaCumprimentoSla}%
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64] block truncate">
                Cumprimento de SLA
              </span>
              <p className="text-xs font-semibold text-[#1D2B25] mt-0.5">
                {metricasEscopoSelecionado.ocorrenciasResolvidasNoSla} de{' '}
                {metricasEscopoSelecionado.ocorrenciasResolvidas || 1} no prazo
              </p>
              <p className="text-[11px] text-[#5E6E64] truncate">dentro do SLA da gravidade</p>
            </div>
          </div>

          {/* Índice 4: Tempo Médio de Resolução */}
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#F7FAF5] border border-[#A8C3A0]/25">
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold font-mono shrink-0">
              {metricasEscopoSelecionado.tempoMedioResolucaoDias !== null
                ? `${metricasEscopoSelecionado.tempoMedioResolucaoDias}d`
                : '—'}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E6E64] block truncate">
                Tempo Médio de Resolução
              </span>
              <p className="text-xs font-semibold text-[#1D2B25] mt-0.5">
                {metricasEscopoSelecionado.tempoMedioResolucaoDias !== null
                  ? `${metricasEscopoSelecionado.tempoMedioResolucaoDias} dias médios`
                  : 'Sem casos resolvidos'}
              </p>
              <p className="text-[11px] text-[#5E6E64] truncate">da abertura ao encerramento</p>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO 2C: Tabela por Loja (uma linha por cada uma das 7 lojas + linha "Rede" consolidada) */}
      <div className="bg-white rounded-[24px] p-6 border border-[#A8C3A0]/30 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#EAF2E8]">
          <div>
            <h2 className="font-semibold text-base sm:text-lg text-[#1D2B25]">
              Demonstrativo por Loja — Rede de 7 Boutiques
            </h2>
            <p className="text-xs text-[#5E6E64] mt-0.5">
              Consolidação analítica do mês com metas operacionais e alertas pontuais de atenção.
            </p>
          </div>
          <span className="text-xs text-[#5E6E64] bg-[#F7FAF5] px-3 py-1 rounded-full border border-[#A8C3A0]/30">
            {linhasTabelaExibidas.length} unidade{linhasTabelaExibidas.length !== 1 ? 's' : ''}{' '}
            exibida{linhasTabelaExibidas.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tabela Responsiva */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EAF2E8] bg-[#F7FAF5]/80 text-[#5E6E64]">
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[10px]">
                  Unidade
                </th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px] text-center">
                  Atendimentos
                </th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px] text-center">
                  Follow-ups
                </th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px] text-center">
                  % No Prazo
                </th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px] text-center">
                  Ocorrências
                </th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px] text-center">
                  % Resolução
                </th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px] text-center">
                  % SLA
                </th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px] text-center">
                  Tempo Médio
                </th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px] text-center">
                  Quebras BOEM
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAF2E8]">
              {linhasTabelaExibidas.map((item) => {
                const m = item.metricas
                // Regra de estilo: Vermelho suave RESERVADO APENAS para o que realmente exige atenção
                // (ocorrências vencidas ou SLA crítico < 70%); o restante em tons frios/verde suave.
                const temAlertaCritico =
                  m.ocorrenciasVencidas > 0 ||
                  (m.ocorrenciasResolvidas > 0 && m.taxaCumprimentoSla < 70)

                return (
                  <tr
                    key={item.lojaId}
                    className={`hover:bg-[#F7FAF5] transition-colors ${
                      temAlertaCritico ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    {/* Unidade */}
                    <td className="py-3 px-3.5 font-semibold text-[#1D2B25] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{item.lojaNome}</span>
                        {m.ocorrenciasVencidas > 0 && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-800 border border-rose-200"
                            title={`${m.ocorrenciasVencidas} ocorrência(s) vencida(s) aguardando solução`}
                          >
                            {m.ocorrenciasVencidas} vencida
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Atendimentos: Concluídos / Total */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="font-semibold text-[#1D2B25]">{m.totalAtendimentos}</span>
                      <span className="text-[10px] text-[#5E6E64] ml-1">
                        ({m.atendimentosConcluidos} conc.)
                      </span>
                    </td>

                    {/* Follow-ups: Fechados / Total */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="font-semibold text-[#1D2B25]">
                        {m.totalFollowUpsCriados}
                      </span>
                      <span className="text-[10px] text-[#5E6E64] ml-1">
                        ({m.followUpsConcluidos} conc.)
                      </span>
                    </td>

                    {/* % Follow-ups no Prazo */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold font-mono ${
                          m.followUpsConcluidos === 0
                            ? 'text-[#5E6E64] bg-slate-100'
                            : m.taxaFollowUpsNoPrazo >= 85
                              ? 'text-[#2F6B4F] bg-[#EAF2E8]'
                              : m.taxaFollowUpsNoPrazo >= 70
                                ? 'text-slate-700 bg-slate-100'
                                : 'text-rose-800 bg-rose-50 border border-rose-200'
                        }`}
                      >
                        {m.followUpsConcluidos === 0 ? '—' : `${m.taxaFollowUpsNoPrazo}%`}
                      </span>
                    </td>

                    {/* Ocorrências: Resolvidas / Total */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="font-semibold text-[#1D2B25]">{m.totalOcorrencias}</span>
                      <span className="text-[10px] text-[#5E6E64] ml-1">
                        ({m.ocorrenciasResolvidas} res.)
                      </span>
                    </td>

                    {/* % Taxa Resolução */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold font-mono ${
                          m.totalOcorrencias === 0
                            ? 'text-[#5E6E64] bg-slate-100'
                            : m.taxaResolucaoOcorrencias >= 75
                              ? 'text-[#2F6B4F] bg-[#EAF2E8]'
                              : m.taxaResolucaoOcorrencias >= 50
                                ? 'text-slate-700 bg-slate-100'
                                : 'text-slate-600 bg-slate-100'
                        }`}
                      >
                        {m.totalOcorrencias === 0 ? '—' : `${m.taxaResolucaoOcorrencias}%`}
                      </span>
                    </td>

                    {/* % Cumprimento SLA */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold font-mono ${
                          m.ocorrenciasResolvidas === 0
                            ? 'text-[#5E6E64] bg-slate-100'
                            : m.taxaCumprimentoSla >= 85
                              ? 'text-[#2F6B4F] bg-[#EAF2E8]'
                              : m.taxaCumprimentoSla >= 70
                                ? 'text-slate-700 bg-slate-100'
                                : 'text-rose-800 bg-rose-50 border border-rose-200 font-bold'
                        }`}
                      >
                        {m.ocorrenciasResolvidas === 0 ? '—' : `${m.taxaCumprimentoSla}%`}
                      </span>
                    </td>

                    {/* Tempo Médio Resolução */}
                    <td className="py-3 px-3 text-center text-[#1D2B25] font-mono whitespace-nowrap">
                      {m.tempoMedioResolucaoDias !== null ? `${m.tempoMedioResolucaoDias}d` : '—'}
                    </td>

                    {/* Quebras BOEM: Resolvidas / Total */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="font-semibold text-[#1D2B25]">{m.totalQuebras}</span>
                      <span className="text-[10px] text-[#5E6E64] ml-1">
                        ({m.quebrasResolvidas} res.)
                      </span>
                    </td>
                  </tr>
                )
              })}

              {/* Linha Consolidada "Rede" (destacada e fixa ao final) */}
              <tr className="bg-[#EAF2E8]/60 border-t-2 border-[#2F6B4F]/30 font-semibold text-[#1D2B25]">
                <td className="py-3.5 px-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-[#2F6B4F] font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Rede Consolidada (7 Lojas)</span>
                  </div>
                </td>

                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                  <span className="font-bold">{linhaRede.metricas.totalAtendimentos}</span>
                  <span className="text-[10px] text-[#5E6E64] ml-1 font-normal">
                    ({linhaRede.metricas.atendimentosConcluidos} conc.)
                  </span>
                </td>

                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                  <span className="font-bold">{linhaRede.metricas.totalFollowUpsCriados}</span>
                  <span className="text-[10px] text-[#5E6E64] ml-1 font-normal">
                    ({linhaRede.metricas.followUpsConcluidos} conc.)
                  </span>
                </td>

                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                  <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold font-mono text-[#2F6B4F] bg-[#EAF2E8] border border-[#A8C3A0]/40">
                    {linhaRede.metricas.taxaFollowUpsNoPrazo}%
                  </span>
                </td>

                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                  <span className="font-bold">{linhaRede.metricas.totalOcorrencias}</span>
                  <span className="text-[10px] text-[#5E6E64] ml-1 font-normal">
                    ({linhaRede.metricas.ocorrenciasResolvidas} res.)
                  </span>
                </td>

                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                  <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold font-mono text-[#2F6B4F] bg-[#EAF2E8] border border-[#A8C3A0]/40">
                    {linhaRede.metricas.taxaResolucaoOcorrencias}%
                  </span>
                </td>

                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                  <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold font-mono text-[#2F6B4F] bg-[#EAF2E8] border border-[#A8C3A0]/40">
                    {linhaRede.metricas.taxaCumprimentoSla}%
                  </span>
                </td>

                <td className="py-3.5 px-3 text-center font-mono whitespace-nowrap">
                  {linhaRede.metricas.tempoMedioResolucaoDias !== null
                    ? `${linhaRede.metricas.tempoMedioResolucaoDias}d`
                    : '—'}
                </td>

                <td className="py-3.5 px-3 text-center whitespace-nowrap">
                  <span className="font-bold">{linhaRede.metricas.totalQuebras}</span>
                  <span className="text-[10px] text-[#5E6E64] ml-1 font-normal">
                    ({linhaRede.metricas.quebrasResolvidas} res.)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Rodapé explicativo da tabela */}
        <div className="pt-2 border-t border-[#EAF2E8] flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-[#5E6E64] gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2F6B4F]" />
              <span>Verde: Meta cumprida (SLA ≥ 85%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Cinza: Faixa operacional padrão</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Vermelho suave: Atenção prioritária (fora da meta / vencidos)</span>
            </span>
          </div>

          <button
            type="button"
            onClick={carregarDados}
            disabled={loading}
            className="flex items-center gap-1 text-[#2F6B4F] hover:underline cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar dados agora</span>
          </button>
        </div>
      </div>
    </div>
  )
}
