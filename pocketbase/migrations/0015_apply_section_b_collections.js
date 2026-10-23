migrate(
  (app) => {
    // 0. Se o agente de IA referenciar kanban_cartoes, remover a tool para liberar a coleção
    try {
      $ai.agents.deleteTools(app, 'crm-followup-assistant', ['kanban_cartoes'])
    } catch (e) {
      console.log('Aviso ao remover kanban_cartoes das tools do AI agent:', e)
    }

    // =========================================================================
    // 1. Atualizar e estender a coleção 'reclamacoes' (entidade Caso / Ocorrência)
    // =========================================================================
    const recCol = app.findCollectionByNameOrId('reclamacoes')
    const usersColId = '_pb_users_auth_'

    // 1.1 Campo pedido_erp (text)
    if (!recCol.fields.getByName('pedido_erp')) {
      recCol.fields.add(
        new TextField({
          name: 'pedido_erp',
          required: false,
        }),
      )
    }

    // 1.2 Campo tipo (select)
    const tipoValores = [
      'devolucao',
      'troca',
      'quebra_entrega',
      'quebra_posterior',
      'falta_item',
      'atraso',
      'AT_fornecedor',
      'tonalidade_lote',
      'erro_especificacao',
      'reembolso',
      'documentacao',
      'outro',
    ]
    const campoTipo = recCol.fields.getByName('tipo')
    if (campoTipo) {
      campoTipo.values = tipoValores
      campoTipo.maxSelect = 1
    } else {
      recCol.fields.add(
        new SelectField({
          name: 'tipo',
          required: false,
          values: tipoValores,
          maxSelect: 1,
        }),
      )
    }

    // 1.3 Campo lista_quadro (select com as 9 colunas exatas do SAC)
    const colunasSac = [
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
    const campoListaQuadro = recCol.fields.getByName('lista_quadro')
    if (campoListaQuadro) {
      campoListaQuadro.values = colunasSac
      campoListaQuadro.maxSelect = 1
    } else {
      recCol.fields.add(
        new SelectField({
          name: 'lista_quadro',
          required: false,
          values: colunasSac,
          maxSelect: 1,
        }),
      )
    }

    // 1.4 Atualizar status de reclamacoes com os novos valores
    const statusValores = [
      'aberta',
      'em_tratamento',
      'aguardando_terceiro',
      'aguardando_aprovacao',
      'resolvida',
      'cancelada',
      'Aberta',
      'Em tratamento',
      'Resolvida',
    ]
    const campoStatus = recCol.fields.getByName('status')
    if (campoStatus) {
      campoStatus.values = statusValores
      campoStatus.maxSelect = 1
    }

    // 1.5 Atualizar gravidade com valores especificados
    const gravidadeValores = [
      'baixa',
      'media',
      'alta',
      'urgente',
      'Baixa',
      'Média',
      'Alta',
      'Urgente',
    ]
    const campoGravidade = recCol.fields.getByName('gravidade')
    if (campoGravidade) {
      campoGravidade.values = gravidadeValores
      campoGravidade.maxSelect = 1
    }

    // 1.6 Campo vip (bool)
    if (!recCol.fields.getByName('vip')) {
      recCol.fields.add(
        new BoolField({
          name: 'vip',
          required: false,
        }),
      )
    }

    // 1.7 Campo responsavel_user (relation -> users)
    if (!recCol.fields.getByName('responsavel_user')) {
      recCol.fields.add(
        new RelationField({
          name: 'responsavel_user',
          collectionId: usersColId,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
    }

    // 1.8 Pendências
    if (!recCol.fields.getByName('pendencia_atual')) {
      recCol.fields.add(new TextField({ name: 'pendencia_atual', required: false }))
    }
    const pendenciaSetorValores = [
      'sac',
      'loja',
      'logistica',
      'financeiro',
      'compras',
      'diretoria',
      'fornecedor',
      'cliente',
    ]
    if (!recCol.fields.getByName('pendencia_setor')) {
      recCol.fields.add(
        new SelectField({
          name: 'pendencia_setor',
          required: false,
          values: pendenciaSetorValores,
          maxSelect: 1,
        }),
      )
    }
    if (!recCol.fields.getByName('pendencia_desde')) {
      recCol.fields.add(new DateField({ name: 'pendencia_desde', required: false }))
    }

    // 1.9 Próxima cobrança
    if (!recCol.fields.getByName('proxima_cobranca')) {
      recCol.fields.add(new DateField({ name: 'proxima_cobranca', required: false }))
    }

    // 1.10 Aprovações
    const aprovacaoValores = ['nenhuma', 'rafael', 'diretoria', 'alexandre']
    if (!recCol.fields.getByName('aprovacao_necessaria')) {
      recCol.fields.add(
        new SelectField({
          name: 'aprovacao_necessaria',
          required: false,
          values: aprovacaoValores,
          maxSelect: 1,
        }),
      )
    }
    if (!recCol.fields.getByName('aprovacao_registro')) {
      recCol.fields.add(new JSONField({ name: 'aprovacao_registro', required: false }))
    }

    // 1.11 Prazo interno
    if (!recCol.fields.getByName('prazo_interno')) {
      recCol.fields.add(new DateField({ name: 'prazo_interno', required: false }))
    }

    // 1.12 Produtos estruturados
    if (!recCol.fields.getByName('produtos')) {
      recCol.fields.add(new JSONField({ name: 'produtos', required: false }))
    }

    // 1.13 Desfecho e comunicação com o cliente
    if (!recCol.fields.getByName('desfecho')) {
      recCol.fields.add(new TextField({ name: 'desfecho', required: false }))
    }
    if (!recCol.fields.getByName('cliente_comunicado')) {
      recCol.fields.add(new BoolField({ name: 'cliente_comunicado', required: false }))
    }
    if (!recCol.fields.getByName('cliente_comunicado_em')) {
      recCol.fields.add(new DateField({ name: 'cliente_comunicado_em', required: false }))
    }

    // 1.14 Checklist (migrado de kanban_cartoes)
    if (!recCol.fields.getByName('checklist')) {
      recCol.fields.add(new JSONField({ name: 'checklist', required: false }))
    }

    // 1.15 Origem Trello & Resolução por Usuário
    if (!recCol.fields.getByName('origem_trello_url')) {
      recCol.fields.add(new URLField({ name: 'origem_trello_url', required: false }))
    }
    if (!recCol.fields.getByName('resolvida_por')) {
      recCol.fields.add(
        new RelationField({
          name: 'resolvida_por',
          collectionId: usersColId,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
    }
    if (!recCol.fields.getByName('resolvida_em')) {
      recCol.fields.add(new DateField({ name: 'resolvida_em', required: false }))
    }

    // Salvar coleção reclamacoes
    app.save(recCol)

    // =========================================================================
    // 2. Criar coleção 'caso_eventos'
    // =========================================================================
    let casoEventosCol
    try {
      casoEventosCol = app.findCollectionByNameOrId('caso_eventos')
    } catch (_) {
      const recColId = recCol.id
      casoEventosCol = new Collection({
        name: 'caso_eventos',
        type: 'base',
        listRule:
          '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.role = "diretoria" || @request.auth.loja = caso.loja)',
        viewRule:
          '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.role = "diretoria" || @request.auth.loja = caso.loja)',
        createRule:
          '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.role = "diretoria" || @request.auth.loja = @request.body.loja_evento || @request.auth.loja = caso.loja)',
        updateRule:
          '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac")',
        deleteRule: '@request.auth.role = "gestor"',
        fields: [
          {
            name: 'caso',
            type: 'relation',
            required: true,
            collectionId: recColId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'tipo',
            type: 'select',
            required: true,
            values: [
              'comentario',
              'mudanca_lista',
              'mudanca_status',
              'cobranca',
              'aprovacao',
              'anexo',
              'importacao',
            ],
            maxSelect: 1,
          },
          {
            name: 'autor',
            type: 'relation',
            required: false,
            collectionId: usersColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'autor_nome',
            type: 'text',
            required: false,
          },
          {
            name: 'texto',
            type: 'text',
            required: false,
          },
          {
            name: 'dados',
            type: 'json',
            required: false,
          },
          {
            name: 'loja_evento',
            type: 'text',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_caso_eventos_caso ON caso_eventos (caso)',
          'CREATE INDEX idx_caso_eventos_tipo ON caso_eventos (tipo)',
          'CREATE INDEX idx_caso_eventos_created ON caso_eventos (created)',
        ],
      })
      app.save(casoEventosCol)
    }

    // =========================================================================
    // 3. Atualizar coleção 'follow_ups' (B6: caso relation + setor_destino)
    // =========================================================================
    const followUpsCol = app.findCollectionByNameOrId('follow_ups')
    if (!followUpsCol.fields.getByName('caso')) {
      followUpsCol.fields.add(
        new RelationField({
          name: 'caso',
          collectionId: recCol.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
    }
    const setoresFollowUp = [
      'sac',
      'loja',
      'logistica',
      'financeiro',
      'compras',
      'diretoria',
      'fornecedor',
      'cliente',
    ]
    if (!followUpsCol.fields.getByName('setor_destino')) {
      followUpsCol.fields.add(
        new SelectField({
          name: 'setor_destino',
          required: false,
          values: setoresFollowUp,
          maxSelect: 1,
        }),
      )
    }
    app.save(followUpsCol)

    // =========================================================================
    // 4. Migração e sincronização de dados: kanban_cartoes -> reclamacoes
    // =========================================================================
    const extrairPrefixoLoja = (nomeLoja) => {
      if (!nomeLoja) return 'BOUT'
      const n = nomeLoja.toUpperCase()
      if (n.includes('VILA OLÍMPIA') || n.includes('VILA OLIMPIA')) return 'VIOL'
      if (n.includes('HIGIENÓPOLIS') || n.includes('HIGIENOPOLIS')) return 'HIGI'
      if (n.includes('MOEMA')) return 'MOEM'
      if (n.includes('TATUAPÉ') || n.includes('TATUAPE')) return 'TATU'
      if (n.includes('ALPHAVILLE')) return 'ALPH'
      if (n.includes('SANTANA') || n.includes('PARNAÍBA') || n.includes('PARNAIBA')) return 'SANT'
      if (n.includes('GUARULHOS')) return 'GUAR'
      const limpo = n.replace(/[^A-Z]/g, '')
      return limpo.substring(0, 4).padEnd(4, 'X')
    }

    // 4.1 Preencher códigos e normalizar reclamacoes existentes
    const recsExistentes = app.findRecordsByFilter('reclamacoes', '1=1', 'created', 500, 0)
    let contadorSeq = 100001
    for (const r of recsExistentes) {
      let mudou = false
      const prefixo = extrairPrefixoLoja(r.getString('loja'))
      if (!r.getString('codigo')) {
        const ped = r.getString('numero_pedido')
        if (ped && ped.includes('-')) {
          r.set('codigo', ped.trim())
        } else {
          r.set('codigo', `${prefixo}-${contadorSeq++}`)
        }
        mudou = true
      }
      if (!r.getString('pedido_erp') && r.getString('numero_pedido')) {
        r.set('pedido_erp', r.getString('numero_pedido'))
        mudou = true
      }
      if (!r.getString('desfecho') && r.getString('resolucao_desfecho')) {
        r.set('desfecho', r.getString('resolucao_desfecho'))
        mudou = true
      }
      const lq = r.getString('lista_quadro')
      if (!lq || lq === 'RAFAEL - SAC' || !colunasSac.includes(lq)) {
        const st = r.getString('status')
        if (st === 'Resolvida' || st === 'resolvida') {
          r.set('lista_quadro', 'RESOLVIDO')
        } else if (st === 'Em tratamento' || st === 'em_tratamento') {
          r.set('lista_quadro', 'EM TRATAMENTO')
        } else {
          r.set('lista_quadro', 'NOVOS')
        }
        mudou = true
      }
      const st = r.getString('status')
      if (st === 'Aberta') {
        r.set('status', 'aberta')
        mudou = true
      } else if (st === 'Em tratamento') {
        r.set('status', 'em_tratamento')
        mudou = true
      } else if (st === 'Resolvida') {
        r.set('status', 'resolvida')
        mudou = true
      }
      const grav = r.getString('gravidade')
      if (grav === 'Baixa') {
        r.set('gravidade', 'baixa')
        mudou = true
      } else if (grav === 'Média') {
        r.set('gravidade', 'media')
        mudou = true
      } else if (grav === 'Alta') {
        r.set('gravidade', 'alta')
        mudou = true
      } else if (grav === 'Urgente') {
        r.set('gravidade', 'urgente')
        mudou = true
      }
      if (mudou) {
        app.save(r)
      }
    }

    // 4.2 Copiar cartões de kanban_cartoes para reclamacoes caso ainda não existam
    try {
      const kanbanCartoes = app.findRecordsByFilter('kanban_cartoes', '1=1', 'created', 500, 0)
      for (const k of kanbanCartoes) {
        const titulo = k.getString('titulo')
        const clienteId = k.getString('cliente')
        const loja = k.getString('loja') || 'Vila Olímpia (SP)'
        const coluna = k.getString('coluna')

        let existe = false
        for (const r of recsExistentes) {
          if (
            (r.getString('codigo') && r.getString('codigo') === titulo) ||
            (r.getString('cliente') === clienteId &&
              r.getString('descricao') === k.getString('descricao'))
          ) {
            existe = true
            break
          }
        }

        if (!existe) {
          const novoCaso = new Record(recCol)
          const prefixo = extrairPrefixoLoja(loja)
          const codigo = titulo.match(/^[A-Z0-9]+-\d+R?$/) ? titulo : `${prefixo}-${contadorSeq++}`
          novoCaso.set('codigo', codigo)
          if (clienteId) {
            novoCaso.set('cliente', clienteId)
          } else {
            try {
              const primeiroCliente = app.findFirstRecordByFilter('clientes', '1=1')
              novoCaso.set('cliente', primeiroCliente.id)
            } catch (_) {}
          }
          novoCaso.set('cliente_nome', k.getString('cliente_nome') || 'Cliente')
          novoCaso.set('loja', loja)
          novoCaso.set('canal_origem', 'WhatsApp')
          novoCaso.set('categoria', 'Atendimento')
          novoCaso.set('tipo', 'outro')
          novoCaso.set('descricao', k.getString('descricao') || k.getString('titulo'))

          let lq = 'NOVOS'
          if (colunasSac.includes(coluna)) {
            lq = coluna
          } else if (coluna === 'Fazendo hoje') {
            lq = 'EM TRATAMENTO'
          } else if (coluna === 'Aguardando cliente') {
            lq = 'RETORNO DA LOJA'
          } else if (coluna === 'Resolvido') {
            lq = 'RESOLVIDO'
          }
          novoCaso.set('lista_quadro', lq)
          novoCaso.set('status', lq === 'RESOLVIDO' ? 'resolvida' : 'em_tratamento')

          const prio = k.getString('prioridade')
          if (prio === 'Urgente') novoCaso.set('gravidade', 'urgente')
          else if (prio === 'Alta') novoCaso.set('gravidade', 'alta')
          else if (prio === 'Baixa') novoCaso.set('gravidade', 'baixa')
          else novoCaso.set('gravidade', 'media')

          novoCaso.set('responsavel', k.getString('responsavel') || 'Consultor Boutique')
          novoCaso.set('prazo_resolucao', k.getString('data_limite') || '2026-10-30')
          novoCaso.set('prazo_interno', k.getString('data_limite') || '2026-10-30')

          const chkRaw = k.getString('checklist_json')
          if (chkRaw) {
            try {
              novoCaso.set('checklist', JSON.parse(chkRaw))
            } catch (_) {
              novoCaso.set('checklist', [])
            }
          }

          if (lq === 'RESOLVIDO') {
            novoCaso.set('desfecho', 'Ocorrência finalizada no quadro Kanban legado.')
            novoCaso.set('resolucao_desfecho', 'Ocorrência finalizada no quadro Kanban legado.')
            novoCaso.set('data_resolucao', '2026-10-21')
            novoCaso.set('resolvida_em', '2026-10-21')
          }

          app.save(novoCaso)

          // Migrar comentários de kanban_cartoes para caso_eventos
          const comRaw = k.getString('comentarios_json')
          if (comRaw) {
            try {
              const comentarios = JSON.parse(comRaw)
              if (Array.isArray(comentarios)) {
                for (const c of comentarios) {
                  const ev = new Record(casoEventosCol)
                  ev.set('caso', novoCaso.id)
                  ev.set('tipo', 'comentario')
                  ev.set('autor_nome', c.autor || 'Sistema')
                  ev.set('texto', c.texto || '')
                  ev.set('loja_evento', loja)
                  app.save(ev)
                }
              }
            } catch (_) {}
          }
        }
      }
    } catch (e) {
      console.log('Aviso na migração de kanban_cartoes:', e)
    }

    // =========================================================================
    // 5. Renomear kanban_cartoes -> _kanban_cartoes_legado e bloquear escrita
    // =========================================================================
    try {
      const kanbanCol = app.findCollectionByNameOrId('kanban_cartoes')
      kanbanCol.name = '_kanban_cartoes_legado'
      kanbanCol.createRule = null
      kanbanCol.updateRule = null
      kanbanCol.deleteRule = null
      kanbanCol.listRule = null
      kanbanCol.viewRule = null
      app.save(kanbanCol)
    } catch (e) {
      console.log('Aviso ao renomear kanban_cartoes:', e)
    }
  },
  (app) => {},
)
