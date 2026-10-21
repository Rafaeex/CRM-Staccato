routerAdd(
  'POST',
  '/backend/v1/gerar-followup-ia',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const clienteId = body.cliente_id
      const userId = e.auth?.id

      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      if (!clienteId) {
        return e.badRequestError('cliente_id é obrigatório')
      }

      // 1. Buscar dados do cliente
      const cliente = app.findRecordById('clientes', clienteId)
      const atendimentos = app.findRecordsByFilter(
        'atendimentos',
        `cliente = "${clienteId}"`,
        '-data_atendimento',
        5,
        0,
      )
      const reclamacoes = app.findRecordsByFilter(
        'reclamacoes',
        `cliente = "${clienteId}"`,
        '-created',
        5,
        0,
      )
      const followUpsAnt = app.findRecordsByFilter(
        'follow_ups',
        `cliente = "${clienteId}"`,
        '-created',
        5,
        0,
      )

      // 2. CONSULTAR QUEBRAS & BOEM (Decisão do usuário: sempre checar se há quebras em aberto do cliente)
      let quebras = []
      try {
        quebras = app.findRecordsByFilter(
          'quebras_boem',
          `cliente = "${clienteId}"`,
          '-created',
          5,
          0,
        )
      } catch (_) {
        // coleção pode ainda não ter registros para este cliente
      }

      const quebrasEmAberto = quebras.filter((q) => q.getString('status') !== 'Resolvida')
      const temQuebraEmAberto = quebrasEmAberto.length > 0

      // Montar resumo do histórico para alimentar o agente
      const histAtendimentos = atendimentos
        .map(
          (a) =>
            `- [${a.getString('data_atendimento')} - ${a.getString('canal')}] ${a.getString('resumo')} (Status: ${a.getString('status')})`,
        )
        .join('\n')

      const histReclamacoes = reclamacoes
        .map(
          (r) =>
            `- [Reclamação ${r.getString('status')} / ${r.getString('gravidade')}] Categoria: ${r.getString('categoria')}. Descrição: ${r.getString('descricao')}. ${r.getString('resolucao_desfecho') ? 'Desfecho: ' + r.getString('resolucao_desfecho') : ''}`,
        )
        .join('\n')

      const histFollowUps = followUpsAnt
        .map(
          (f) =>
            `- [Follow-up ${f.getString('status')} - ${f.getString('data_prevista')}] Assunto: ${f.getString('assunto')}. Msg: "${f.getString('mensagem_sugerida')}"`,
        )
        .join('\n')

      const histQuebras = quebras
        .map(
          (q) =>
            `- [Quebra/BOEM Pedido: ${q.getString('numero_pedido')} | Status: ${q.getString('status')}] Produtos: ${q.getString('produtos_envolvidos') || 'Não especificado'}. Resp: ${q.getString('responsabilidade_apurada') || 'Em apuração'}. Ação: ${q.getString('acao_adotada') || 'Em tratamento'}. ${q.getString('descricao_detalhada') ? 'Detalhes: ' + q.getString('descricao_detalhada') : ''}`,
        )
        .join('\n')

      const promptMensagem = `Analise os dados de atendimento deste cliente e gere a recomendação estruturada de próximo follow-up:
CLIENTE: ${cliente.getString('nome')}
LOJA: ${cliente.getString('loja_origem')}
TELEFONE: ${cliente.getString('telefone')}
STATUS ATUAL: ${cliente.getString('status_atendimento')}
INTERESSE PRINCIPAL: ${cliente.getString('interesse_principal') || 'Não especificado'}
ARQUITETO/PARCEIRO: ${cliente.getString('arquiteto_parceiro') || 'Nenhum'}
NOTAS INTERNAS: ${cliente.getString('notas_internas') || 'Nenhuma'}

OCORRÊNCIAS DE QUEBRAS / BOEM DO CLIENTE:
${histQuebras || 'Nenhuma quebra ou BOEM registrado.'}
${temQuebraEmAberto ? `ATENÇÃO PRIORITÁRIA: Este cliente possui ${quebrasEmAberto.length} ocorrência(s) de Quebra/BOEM EM ABERTO! Você DEVE citar o andamento da quebra/reposição na mensagem e atribuir urgência Alta.` : ''}

HISTÓRICO RECENTE DE ATENDIMENTOS:
${histAtendimentos || 'Nenhum atendimento anterior registrado.'}

HISTÓRICO DE RECLAMAÇÕES:
${histReclamacoes || 'Nenhuma reclamação registrada.'}

HISTÓRICO DE FOLLOW-UPS ANTERIORES:
${histFollowUps || 'Nenhum follow-up anterior registrado.'}

Por favor, forneça o resumo do histórico e formule exatamente o próximo follow-up sugerido (Assunto, Mensagem WhatsApp, Urgência [Alta, Média ou Baixa], Data/Prazo sugerido e Justificativa). ${temQuebraEmAberto ? 'Lembre-se de mencionar a quebra/BOEM em aberto com cuidado e presteza na mensagem sugerida.' : ''}`

      let respostaTexto = ''
      try {
        const aiResult = $ai.agent('crm-followup-assistant').chat({
          user_id: userId,
          message: promptMensagem,
        })
        respostaTexto = aiResult.content
      } catch (agentErr) {
        // Fallback robusto se a IA nativa estiver em aquecimento
        const quebraDestaque = quebrasEmAberto[0]
        if (temQuebraEmAberto && quebraDestaque) {
          respostaTexto = `RESUMO DO HISTÓRICO:
O cliente ${cliente.getString('nome')} possui ${quebrasEmAberto.length} ocorrência(s) de Quebra/BOEM em andamento referente ao pedido ${quebraDestaque.getString('numero_pedido')} (${quebraDestaque.getString('produtos_envolvidos') || 'revestimentos'}).

SUGESTÃO DE PRÓXIMO FOLLOW-UP:
- Assunto: Atualização sobre reposição e BOEM (Pedido ${quebraDestaque.getString('numero_pedido')})
- Canal: WhatsApp
- Mensagem Pronta para WhatsApp: Olá ${cliente.getString('nome')}, tudo bem? Aqui é da Boutique de Revestimentos (${cliente.getString('loja_origem')}). Estamos acompanhando de perto o processo de reposição da ocorrência referente ao pedido ${quebraDestaque.getString('numero_pedido')} e gostaríamos de posicioná-lo sobre a previsão de envio das novas peças. Ficamos à sua inteira disposição!
- Nível de Urgência: Alta
- Prazo Sugerido: Hoje
- Justificativa: Cliente possui ocorrência de quebra/BOEM em aberto; pós-venda ágil é mandatório para resguardar a experiência de alto padrão.`
        } else {
          respostaTexto = `RESUMO DO HISTÓRICO:
O cliente ${cliente.getString('nome')} está com status "${cliente.getString('status_atendimento')}" na unidade ${cliente.getString('loja_origem')}, com interesse registrado em ${cliente.getString('interesse_principal') || 'revestimentos de alto padrão'}.

SUGESTÃO DE PRÓXIMO FOLLOW-UP:
- Assunto: Retorno de acompanhamento e suporte de especificações
- Canal: WhatsApp
- Mensagem Pronta para WhatsApp: Olá ${cliente.getString('nome')}, tudo bem? Aqui é da equipe de atendimento da Boutique ${cliente.getString('loja_origem')}. Gostaríamos de saber se pudemos ajudar com suas dúvidas sobre as amostras e especificações do seu projeto. Ficamos à total disposição!
- Nível de Urgência: Média
- Prazo Sugerido: Amanhã
- Justificativa: Manter contato ativo dentro do padrão de pós-atendimento da rede de boutiques.`
        }
      }

      // Extração inteligente de campos
      let assuntoSugerido = temQuebraEmAberto
        ? `Acompanhamento de Quebra/BOEM (${cliente.getString('nome')})`
        : `Follow-up: Acompanhamento de Atendimento (${cliente.getString('nome')})`

      let mensagemWhatsApp = temQuebraEmAberto
        ? `Olá ${cliente.getString('nome')}, tudo bem? Aqui é da Boutique de Revestimentos (${cliente.getString('loja_origem')}). Estamos acompanhando a tratativa da ocorrência de quebra do seu pedido e gostaríamos de te atualizar!`
        : `Olá ${cliente.getString('nome')}, tudo bem? Aqui é da Boutique de Revestimentos (${cliente.getString('loja_origem')}). Gostaríamos de dar continuidade ao seu atendimento!`

      let urgencia = temQuebraEmAberto ? 'Alta' : 'Média'

      if (
        temQuebraEmAberto ||
        respostaTexto.includes('Alta') ||
        histReclamacoes.includes('Alta') ||
        histReclamacoes.includes('Aberta')
      ) {
        urgencia = 'Alta'
      } else if (respostaTexto.includes('Baixa') && !temQuebraEmAberto) {
        urgencia = 'Baixa'
      }

      const matchAssunto = respostaTexto.match(/Assunto:\s*([^\n\r]+)/i)
      if (matchAssunto && matchAssunto[1]) {
        assuntoSugerido = matchAssunto[1].trim().replace(/^[\*\-_]+|[\*\-_]+$/g, '')
      }

      const matchMsg = respostaTexto.match(
        /Mensagem (?:Pronta para WhatsApp|WhatsApp|Sugerida):\s*([^\n\r]+(?:\n[^\n\r]+)?)/i,
      )
      if (matchMsg && matchMsg[1]) {
        mensagemWhatsApp = matchMsg[1]
          .trim()
          .replace(/^["']|["']$/g, '')
          .replace(/^[\*\-_]+|[\*\-_]+$/g, '')
      }

      const targetDate = new Date()
      if (urgencia === 'Alta') {
        // hoje
      } else if (urgencia === 'Média') {
        targetDate.setDate(targetDate.getDate() + 1)
      } else {
        targetDate.setDate(targetDate.getDate() + 2)
      }
      const dataPrevistaStr = targetDate.toISOString().split('T')[0]

      return e.json(200, {
        sucesso: true,
        cliente_id: cliente.id,
        cliente_nome: cliente.getString('nome'),
        cliente_telefone: cliente.getString('telefone'),
        loja: cliente.getString('loja_origem'),
        resposta_completa_ia: respostaTexto,
        quebras_em_aberto_count: quebrasEmAberto.length,
        quebras_em_aberto: quebrasEmAberto.map((q) => ({
          id: q.id,
          numero_pedido: q.getString('numero_pedido'),
          produtos: q.getString('produtos_envolvidos'),
          status: q.getString('status'),
        })),
        sugestao: {
          assunto: assuntoSugerido,
          mensagem_sugerida: mensagemWhatsApp,
          canal: 'WhatsApp',
          urgencia: urgencia,
          data_prevista: dataPrevistaStr,
          horario_previsto: '14:30',
          justificativa: respostaTexto.substring(0, 320),
        },
      })
    } catch (err) {
      return e.json(500, {
        sucesso: false,
        error: err.message || 'Falha ao gerar follow-up com IA',
      })
    }
  },
  $apis.requireAuth(),
)
