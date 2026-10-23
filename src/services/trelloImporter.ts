import type {
  QuebraBoem,
  Reclamacao,
  StatusQuebra,
  ResponsabilidadeQuebra,
  ResultadoBoem,
  ItemProdutoQuebra,
} from '@/types/crm'

export type TipoCardTrello = 'QUEBRAS' | 'SAC' | 'MODELO_IGNORADO'

export interface TrelloCardParsedGeral {
  id: string
  name: string
  desc: string
  idList: string
  nomeLista: string
  closed: boolean
  tipo: TipoCardTrello
  numero_pedido: string
  cliente_nome: string
  // Quebras
  nf_saida?: string
  data_ocorrencia?: string
  produtos_envolvidos?: string
  produtos_itens?: ItemProdutoQuebra[]
  entrega_entregador?: string
  entrega_recebedor?: string
  local_ocorrencia?: string
  responsabilidade_apurada?: ResponsabilidadeQuebra
  acao_adotada?: string
  resultado_boem?: ResultadoBoem
  statusSugeridoQuebra?: StatusQuebra
  // SAC
  contato_tratar_nome?: string
  contato_tratar_telefone?: string
  contato_tratar_email?: string
  descricao_sac?: string
  status_produto?: string
  produto_instalado?: string
  solicitacao_desejo?: string
  statusSugeridoSac?: 'Aberta' | 'Em tratamento' | 'Resolvida'
  // Metadados
  validoParaImportar: boolean
  motivoInvalido?: string
}

export interface ResultadoParseTrello {
  totalCards: number
  nomeQuadro: string
  listasEncontradas: { id: string; name: string }[]
  quebras: TrelloCardParsedGeral[]
  sac: TrelloCardParsedGeral[]
  ignorados: TrelloCardParsedGeral[]
}

function cleanMarkdownValue(str: string): string {
  if (!str) return ''
  return str.replace(/[*_~`]/g, '').trim()
}

export function parseTrelloJSON(jsonData: any): ResultadoParseTrello {
  const nomeQuadro = jsonData?.name || 'Quadro Trello'
  const listsRaw = Array.isArray(jsonData?.lists) ? jsonData.lists : []
  const cardsRaw = Array.isArray(jsonData?.cards) ? jsonData.cards : []

  const listMap = new Map<string, string>()
  listsRaw.forEach((l: any) => {
    if (l.id && l.name) {
      listMap.set(l.id, l.name.trim())
    }
  })

  const quebras: TrelloCardParsedGeral[] = []
  const sac: TrelloCardParsedGeral[] = []
  const ignorados: TrelloCardParsedGeral[] = []

  cardsRaw.forEach((c: any) => {
    const nome: string = (c.name || '').trim()
    const desc: string = (c.desc || '').trim()
    const nomeLista = listMap.get(c.idList) || 'RAFAEL - SAC'
    const isClosed: boolean = Boolean(c.closed || c.dueComplete)

    const nomeUpper = nome.toUpperCase()
    const descUpper = desc.toUpperCase()

    // 1. Identificar se é cartão de modelo ou informativo (ex: lista "EXEMPLOS", títulos MODELO/EXEMPLO)
    const isModelo =
      nomeLista.toUpperCase().includes('EXEMPLO') ||
      nomeUpper.includes('MODELO COMPLETO') ||
      nomeUpper.includes('MODELO OPERACIONAL') ||
      nomeUpper.includes('FORMULÁRIO PADRÃO') ||
      nomeUpper.startsWith('EXEMPLO (')

    if (isModelo) {
      ignorados.push({
        id: c.id,
        name: nome,
        desc,
        idList: c.idList,
        nomeLista,
        closed: isClosed,
        tipo: 'MODELO_IGNORADO',
        numero_pedido: nome,
        cliente_nome: '',
        validoParaImportar: false,
        motivoInvalido: 'Cartão modelo/instrução na lista EXEMPLOS (não é ocorrência de cliente)',
      })
      return
    }

    // 2. Extrair o número do pedido
    // Padrão: LOJA-123456 ou especificado em **PEDIDO:** LOJA-0123456
    const matchPedidoDesc = desc.match(/(?:PEDIDO|Nº DO PEDIDO|NUMERO PEDIDO)[:\s*]+([^\n\r*]+)/i)
    const matchPedidoNome = nome.match(/([A-Z0-9\-_/]{4,25})/i)
    const rawPedido = matchPedidoDesc
      ? matchPedidoDesc[1]
      : matchPedidoNome
        ? matchPedidoNome[1]
        : nome
    const numero_pedido = cleanMarkdownValue(rawPedido) || nome

    // 3. Detectar se é SAC ou QUEBRAS
    // SAC contém campos típicos: "COM QUEM TRATAR O SAC", "STATUS DO PRODUTO", "PRODUTO JÁ INSTALADO", "SOLICITAÇÃO / DESEJO"
    // QUEBRAS contém: "NF DE SAÍDA", "RESULTADO DO BOEM", "LOCAL DA OCORRÊNCIA", "RESPONSABILIDADE APURADA", "AÇÃO ADOTADA"
    const isSac =
      descUpper.includes('COM QUEM TRATAR O SAC') ||
      descUpper.includes('SOLICITAÇÃO / DESEJO') ||
      descUpper.includes('SOLICITACAO / DESEJO') ||
      descUpper.includes('STATUS DO PRODUTO') ||
      nomeUpper.includes('- SAC')

    // Extrair cliente
    const matchCliente = desc.match(/(?:CLIENTE|NOME DO CLIENTE)[:\s*]+([^\n\r*]+)/i)
    const cliente_nome = cleanMarkdownValue(matchCliente ? matchCliente[1] : '')

    if (isSac) {
      // Campos específicos do modelo SAC:
      // COM QUEM TRATAR O SAC: Nome: ..., Telefone: ..., E-mail: ...
      const matchNomeContato = desc.match(/(?:Nome)[:\s*]+([^\n\r*]+)/i)
      const matchTelContato = desc.match(/(?:Telefone)[:\s*]+([^\n\r*]+)/i)
      const matchEmailContato = desc.match(/(?:E-mail|Email)[:\s*]+([^\n\r*()[\]]+)/i)

      // DESCRIÇÃO DA OCORRÊNCIA:
      const matchDescOcorr = desc.match(
        /DESCRIÇÃO DA OCORRÊNCIA[\s\S]*?(?=PRODUTOS ENVOLVIDOS|STATUS DO PRODUTO|$)/i,
      )
      const descOcorr = matchDescOcorr
        ? matchDescOcorr[0].replace(/DESCRIÇÃO DA OCORRÊNCIA[:\s*]*/i, '').trim()
        : desc

      // PRODUTOS ENVOLVIDOS: Código: ..., Descrição: ...
      const matchProd = desc.match(
        /PRODUTOS ENVOLVIDOS[\s\S]*?(?=STATUS DO PRODUTO|PRODUTO JÁ INSTALADO|$)/i,
      )
      const produtosTexto = matchProd
        ? matchProd[0].replace(/PRODUTOS ENVOLVIDOS[:\s*]*/i, '').trim()
        : ''

      // STATUS DO PRODUTO:
      let statusProduto = ''
      if (descUpper.includes('MATERIAL AINDA NA OBRA') || descUpper.includes('POSSE DO CLIENTE')) {
        statusProduto = 'Material ainda na obra / em posse do cliente'
      } else if (descUpper.includes('TRANSPORTADORA') || descUpper.includes('EM TRANSPORTE')) {
        statusProduto = 'Material com a transportadora / em transporte'
      } else if (descUpper.includes('CD STACCATO')) {
        statusProduto = 'Material no CD Staccato'
      } else if (descUpper.includes('NA LOJA')) {
        statusProduto = 'Material na loja'
      } else if (descUpper.includes('OUTRO')) {
        statusProduto = 'Outro'
      }

      // PRODUTO JÁ INSTALADO: SIM | NÃO
      let produtoInstalado = 'NÃO'
      if (/\(x\)\s*SIM/i.test(desc) || /PRODUTO JÁ INSTALADO[:\s*]+SIM/i.test(desc)) {
        produtoInstalado = 'SIM'
      }

      // SOLICITAÇÃO / DESEJO:
      let solicitacaoDesejo = ''
      if (descUpper.includes('SUBSTITUIÇÃO DO PRODUTO') || descUpper.includes('SUBSTITUICAO')) {
        solicitacaoDesejo = 'Substituição do produto'
      } else if (descUpper.includes('CRÉDITO') || descUpper.includes('CREDITO')) {
        solicitacaoDesejo = 'Crédito para novo pedido'
      } else if (descUpper.includes('REEMBOLSO')) {
        solicitacaoDesejo = 'Reembolso financeiro'
      } else if (descUpper.includes('ASSISTÊNCIA TÉCNICA') || descUpper.includes('ASSISTENCIA')) {
        solicitacaoDesejo = 'Assistência técnica'
      } else if (descUpper.includes('PERSONALIZAR')) {
        solicitacaoDesejo = 'Personalizar'
      }

      const parsed: TrelloCardParsedGeral = {
        id: c.id,
        name: nome,
        desc,
        idList: c.idList,
        nomeLista,
        closed: isClosed,
        tipo: 'SAC',
        numero_pedido,
        cliente_nome:
          cliente_nome || (nome.includes('-') ? nome.split('-')[0].trim() : 'Cliente SAC'),
        contato_tratar_nome: matchNomeContato ? cleanMarkdownValue(matchNomeContato[1]) : '',
        contato_tratar_telefone: matchTelContato ? cleanMarkdownValue(matchTelContato[1]) : '',
        contato_tratar_email: matchEmailContato ? cleanMarkdownValue(matchEmailContato[1]) : '',
        descricao_sac: cleanMarkdownValue(descOcorr),
        produtos_envolvidos: cleanMarkdownValue(produtosTexto),
        status_produto: statusProduto || 'Material ainda na obra / em posse do cliente',
        produto_instalado: produtoInstalado,
        solicitacao_desejo: solicitacaoDesejo || 'Substituição do produto',
        statusSugeridoSac: isClosed ? 'Resolvida' : 'Em tratamento',
        validoParaImportar: Boolean(numero_pedido),
        motivoInvalido: !numero_pedido ? 'Nº de pedido ausente' : undefined,
      }

      if (parsed.validoParaImportar) {
        sac.push(parsed)
      } else {
        ignorados.push(parsed)
      }
    } else {
      // É QUEBRAS & BOEM
      const matchNF = desc.match(/(?:NF DE SAÍDA|NF SAIDA|NOTA FISCAL|NF)[:\s*]+([^\n\r*]+)/i)
      const matchData = desc.match(
        /(?:DATA DA OCORREÊNCIA|DATA DA OCORRÊNCIA|DATA DA OCORRENCIA|DATA)[:\s*]+([^\n\r*]+)/i,
      )

      // Produtos
      const matchProdutosBloco = desc.match(
        /PRODUTOS ENVOLVIDOS[\s\S]*?(?=INFORMAÇÕES DA ENTREGA|LOCAL DA OCORRÊNCIA|$)/i,
      )
      const prodTexto = matchProdutosBloco
        ? matchProdutosBloco[0].replace(/PRODUTOS ENVOLVIDOS[:\s*]*/i, '').trim()
        : ''

      // Extração de item estruturado de produto
      const matchCod = desc.match(/Código[:\s*]+([^\n\r*]+)/i)
      const matchDescItem = desc.match(/Descrição[:\s*]+([^\n\r*]+)/i)
      const matchLote = desc.match(/Lote[:\s*]+([^\n\r*]+)/i)
      const matchQtdTotal = desc.match(/Quantidade total[^:\n\r]*[:\s*]+([^\n\r*]+)/i)
      const matchQtdQuebrada = desc.match(/Quantidade quebrada[^:\n\r]*[:\s*]+([^\n\r*]+)/i)

      const itensProd: ItemProdutoQuebra[] = []
      if (matchCod || matchDescItem || prodTexto) {
        itensProd.push({
          codigo: matchCod ? cleanMarkdownValue(matchCod[1]) : '',
          descricao: matchDescItem
            ? cleanMarkdownValue(matchDescItem[1])
            : cleanMarkdownValue(prodTexto.slice(0, 80)),
          lote: matchLote ? cleanMarkdownValue(matchLote[1]) : '',
          qtd_total: matchQtdTotal ? cleanMarkdownValue(matchQtdTotal[1]) : '',
          qtd_quebrada: matchQtdQuebrada ? cleanMarkdownValue(matchQtdQuebrada[1]) : '',
        })
      }

      // Entrega
      const matchEntregou = desc.match(/Quem entregou[:\s*]+([^\n\r*]+)/i)
      const matchRecebeu = desc.match(/Quem recebeu[:\s*]+([^\n\r*]+)/i)

      // Local da ocorrência
      let localOcorrencia = ''
      if (
        descUpper.includes('JÁ CHEGOU AVARIADO') ||
        descUpper.includes('AVARIADO DO FORNECEDOR')
      ) {
        localOcorrencia = 'Produto já chegou avariado do fornecedor'
      } else if (
        descUpper.includes('MOVIMENTAÇÃO NO CD') ||
        descUpper.includes('MOVIMENTACAO NO CD')
      ) {
        localOcorrencia = 'Movimentação no CD'
      } else if (descUpper.includes('IDENTIFICADO POSTERIOR')) {
        localOcorrencia = 'Identificado posterior a entrega'
      } else if (descUpper.includes('IDENTIFICADO NA ENTREGA')) {
        localOcorrencia = 'Identificado na entrega'
      }

      // Responsabilidade
      let respApurada: ResponsabilidadeQuebra = 'Em apuração'
      if (
        descUpper.includes('CD STACCATO') ||
        descUpper.includes('ARMAZÉM') ||
        descUpper.includes('EXPEDIÇÃO')
      ) {
        respApurada = 'Armazém / Expedição'
      } else if (
        descUpper.includes('TRANSPORTE STACCATO') ||
        descUpper.includes('TRANSPORTE TERCEIRIZADO') ||
        descUpper.includes('TRANSPORTADORA')
      ) {
        respApurada = 'Transportadora'
      } else if (
        descUpper.includes('DEFEITO DE FABRICAÇÃO') ||
        descUpper.includes('FABRICA / FORNECEDOR') ||
        descUpper.includes('FORNECEDOR')
      ) {
        respApurada = 'Fábrica / Fornecedor'
      } else if (descUpper.includes('CLIENTE / OBRA') || descUpper.includes('CLIENTE/OBRA')) {
        respApurada = 'Cliente / Obra'
      } else if (descUpper.includes('ASSENTAMENTO') || descUpper.includes('INSTALAÇÃO')) {
        respApurada = 'Instalação / Assentamento'
      }

      // Ação adotada
      let acaoAdotada = ''
      if (
        descUpper.includes('REPOSIÇÃO DE MATERIAL') ||
        descUpper.includes('REPOSICAO DE MATERIAL')
      ) {
        acaoAdotada = 'Reposição de material'
      } else if (
        descUpper.includes('CRÉDITO CLIENTE GERADO') ||
        descUpper.includes('CREDITO CLIENTE')
      ) {
        acaoAdotada = 'Crédito cliente gerado'
      } else {
        const matchAcao = desc.match(/(?:AÇÃO ADOTADA|ACAO ADOTADA)[:\s*]+([^\n\r*]+)/i)
        if (matchAcao) acaoAdotada = cleanMarkdownValue(matchAcao[1])
      }

      // Resultado BOEM
      let resBoem: ResultadoBoem = 'Pendente'
      if (descUpper.includes('RESULTADO DO BOEM:') || descUpper.includes('RESULTADO BOEM:')) {
        if (
          /\(x\)\s*APROVADO/i.test(desc) ||
          (descUpper.includes('APROVADO') && !descUpper.includes('( ) APROVADO'))
        ) {
          resBoem = 'Procedente (Reposição Autorizada)'
        } else if (
          /\(x\)\s*REPROVADO/i.test(desc) ||
          (descUpper.includes('REPROVADO') && !descUpper.includes('( ) REPROVADO'))
        ) {
          resBoem = 'Improcedente'
        } else if (
          /\(x\)\s*NÃO ENVIADO/i.test(desc) ||
          (descUpper.includes('NÃO ENVIADO') && !descUpper.includes('( ) NÃO ENVIADO'))
        ) {
          resBoem = 'Pendente'
        } else if (descUpper.includes('ACORDO COMERCIAL')) {
          resBoem = 'Acordo Comercial'
        } else if (
          descUpper.includes('REEMBOLSO') ||
          descUpper.includes('CRÉDITO') ||
          descUpper.includes('CREDITO')
        ) {
          resBoem = 'Procedente (Reembolso / Crédito)'
        }
      }

      const statusSugeridoQuebra: StatusQuebra = isClosed
        ? 'Resolvida'
        : resBoem === 'Procedente (Reposição Autorizada)' ||
            resBoem === 'Procedente (Reembolso / Crédito)'
          ? 'Em análise'
          : 'Registro'

      const parsed: TrelloCardParsedGeral = {
        id: c.id,
        name: nome,
        desc,
        idList: c.idList,
        nomeLista,
        closed: isClosed,
        tipo: 'QUEBRAS',
        numero_pedido,
        cliente_nome:
          cliente_nome || (nome.includes('-') ? nome.split('-')[0].trim() : 'Cliente Quebra'),
        nf_saida: matchNF ? cleanMarkdownValue(matchNF[1]) : '',
        data_ocorrencia: matchData
          ? cleanMarkdownValue(matchData[1])
          : new Date().toISOString().split('T')[0],
        produtos_envolvidos:
          cleanMarkdownValue(prodTexto) ||
          (itensProd[0] ? `${itensProd[0].codigo} - ${itensProd[0].descricao}` : ''),
        produtos_itens: itensProd,
        entrega_entregador: matchEntregou ? cleanMarkdownValue(matchEntregou[1]) : '',
        entrega_recebedor: matchRecebeu ? cleanMarkdownValue(matchRecebeu[1]) : '',
        local_ocorrencia: localOcorrencia || 'Identificado na entrega',
        responsabilidade_apurada: respApurada,
        acao_adotada: acaoAdotada || 'Reposição de material',
        resultado_boem: resBoem,
        statusSugeridoQuebra,
        validoParaImportar: Boolean(numero_pedido),
        motivoInvalido: !numero_pedido ? 'Nº de pedido ausente' : undefined,
      }

      if (parsed.validoParaImportar) {
        quebras.push(parsed)
      } else {
        ignorados.push(parsed)
      }
    }
  })

  return {
    totalCards: cardsRaw.length,
    nomeQuadro,
    listasEncontradas: listsRaw.map((l: any) => ({ id: l.id, name: l.name })),
    quebras,
    sac,
    ignorados,
  }
}
