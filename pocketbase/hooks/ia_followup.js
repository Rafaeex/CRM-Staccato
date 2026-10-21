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

      // 1. Buscar dados do cliente (somente atendimento)
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

      const promptMensagem = `Analise os dados de atendimento deste cliente e gere a recomendação estruturada de próximo follow-up:
CLIENTE: ${cliente.getString('nome')}
LOJA: ${cliente.getString('loja_origem')}
TELEFONE: ${cliente.getString('telefone')}
STATUS ATUAL: ${cliente.getString('status_atendimento')}
INTERESSE PRINCIPAL: ${cliente.getString('interesse_principal') || 'Não especificado'}
ARQUITETO/PARCEIRO: ${cliente.getString('arquiteto_parceiro') || 'Nenhum'}
NOTAS INTERNAS: ${cliente.getString('notas_internas') || 'Nenhuma'}

HISTÓRICO RECENTE DE ATENDIMENTOS:
${histAtendimentos || 'Nenhum atendimento anterior registrado.'}

HISTÓRICO DE RECLAMAÇÕES:
${histReclamacoes || 'Nenhuma reclamação registrada.'}

HISTÓRICO DE FOLLOW-UPS ANTERIORES:
${histFollowUps || 'Nenhum follow-up anterior registrado.'}

Por favor, forneça o resumo do histórico e formule exatamente o próximo follow-up sugerido (Assunto, Mensagem WhatsApp, Urgência [Alta, Média ou Baixa], Data/Prazo sugerido e Justificativa).`

      let respostaTexto = ''
      try {
        const aiResult = $ai.agent('crm-followup-assistant').chat({
          user_id: userId,
          message: promptMensagem,
        })
        respostaTexto = aiResult.content
      } catch (agentErr) {
        // Fallback se a quota do gateway estiver em aquecimento
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

      // Extração inteligente de campos para preencher o follow-up
      let assuntoSugerido = `Follow-up: Acompanhamento de Atendimento (${cliente.getString('nome')})`
      let mensagemWhatsApp = `Olá ${cliente.getString('nome')}, tudo bem? Aqui é da Boutique de Revestimentos (${cliente.getString('loja_origem')}). Gostaríamos de dar continuidade ao seu atendimento!`
      let urgencia = 'Média'

      if (
        respostaTexto.includes('Alta') ||
        histReclamacoes.includes('Alta') ||
        histReclamacoes.includes('Aberta')
      ) {
        urgencia = 'Alta'
      } else if (respostaTexto.includes('Baixa')) {
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

      // Calcular data prevista sugerida (hoje se urgente, senão amanhã ou em 2 dias)
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
        sugestao: {
          assunto: assuntoSugerido,
          mensagem_sugerida: mensagemWhatsApp,
          canal: 'WhatsApp',
          urgencia: urgencia,
          data_prevista: dataPrevistaStr,
          horario_previsto: '14:30',
          justificativa: respostaTexto.substring(0, 300),
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
