migrate(
  (app) => {
    // ==========================================
    // 1. Coleção 'users' (auth)
    // ==========================================
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1.1 Campo role com os 8 valores solicitados
    const roleField = usersCol.fields.getByName('role')
    const roleValues = [
      'gestor',
      'sac',
      'atendente',
      'comercial',
      'logistica',
      'financeiro',
      'compras',
      'diretoria',
    ]
    if (roleField) {
      roleField.values = roleValues
      roleField.maxSelect = 1
    } else {
      usersCol.fields.add(
        new SelectField({
          name: 'role',
          required: false,
          values: roleValues,
          maxSelect: 1,
        }),
      )
    }

    // 1.2 Campo ativo (bool)
    if (!usersCol.fields.getByName('ativo')) {
      usersCol.fields.add(
        new BoolField({
          name: 'ativo',
          required: false,
        }),
      )
    }

    // Salvar coleção users com os novos campos
    app.save(usersCol)

    // Ativar todos os usuários existentes
    app.db().newQuery('UPDATE users SET ativo = 1 WHERE ativo IS NULL OR ativo = 0').execute()

    // ==========================================
    // 2. Preenchimento defensivo de registros sem loja (se houver)
    // ==========================================
    app
      .db()
      .newQuery(
        "UPDATE clientes SET loja_origem = 'Vila Olímpia (SP)' WHERE loja_origem IS NULL OR loja_origem = ''",
      )
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE atendimentos SET loja = 'Vila Olímpia (SP)' WHERE loja IS NULL OR loja = ''",
      )
      .execute()
    app
      .db()
      .newQuery("UPDATE follow_ups SET loja = 'Vila Olímpia (SP)' WHERE loja IS NULL OR loja = ''")
      .execute()
    app
      .db()
      .newQuery("UPDATE reclamacoes SET loja = 'Vila Olímpia (SP)' WHERE loja IS NULL OR loja = ''")
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE quebras_boem SET loja = 'Vila Olímpia (SP)' WHERE loja IS NULL OR loja = ''",
      )
      .execute()

    // ==========================================
    // 3. API Rules para Coleções Operacionais
    // ==========================================

    // 3.1 clientes (campo de loja é loja_origem)
    const clientesCol = app.findCollectionByNameOrId('clientes')
    clientesCol.listRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.role = "diretoria" || @request.auth.loja = loja_origem)'
    clientesCol.viewRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.role = "diretoria" || @request.auth.loja = loja_origem)'
    clientesCol.createRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.loja = @request.body.loja_origem)'
    clientesCol.updateRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.loja = loja_origem)'
    clientesCol.deleteRule = '@request.auth.role = "gestor"'
    app.save(clientesCol)

    // 3.2 atendimentos (campo de loja é loja)
    const atendimentosCol = app.findCollectionByNameOrId('atendimentos')
    atendimentosCol.listRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.role = "diretoria" || @request.auth.loja = loja)'
    atendimentosCol.viewRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.role = "diretoria" || @request.auth.loja = loja)'
    atendimentosCol.createRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.loja = @request.body.loja)'
    atendimentosCol.updateRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.loja = loja)'
    atendimentosCol.deleteRule = '@request.auth.role = "gestor"'
    app.save(atendimentosCol)

    // 3.3 reclamacoes (campo de loja é loja)
    const reclamacoesCol = app.findCollectionByNameOrId('reclamacoes')
    reclamacoesCol.listRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.role = "diretoria" || @request.auth.loja = loja)'
    reclamacoesCol.viewRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.role = "diretoria" || @request.auth.loja = loja)'
    reclamacoesCol.createRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.loja = @request.body.loja)'
    reclamacoesCol.updateRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.loja = loja)'
    reclamacoesCol.deleteRule = '@request.auth.role = "gestor"'
    app.save(reclamacoesCol)

    // 3.4 follow_ups (campo de loja é loja)
    const followUpsCol = app.findCollectionByNameOrId('follow_ups')
    followUpsCol.listRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.role = "diretoria" || @request.auth.loja = loja)'
    followUpsCol.viewRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.role = "diretoria" || @request.auth.loja = loja)'
    followUpsCol.createRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.loja = @request.body.loja)'
    followUpsCol.updateRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.loja = loja)'
    followUpsCol.deleteRule = '@request.auth.role = "gestor"'
    app.save(followUpsCol)

    // 3.5 quebras_boem (inclui comercial em List/View/Create/Update)
    const quebrasCol = app.findCollectionByNameOrId('quebras_boem')
    quebrasCol.listRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.role = "diretoria" || @request.auth.role = "comercial" || @request.auth.loja = loja)'
    quebrasCol.viewRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.role = "diretoria" || @request.auth.role = "comercial" || @request.auth.loja = loja)'
    quebrasCol.createRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.role = "comercial" || @request.auth.loja = @request.body.loja)'
    quebrasCol.updateRule =
      '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.role = "comercial" || @request.auth.loja = loja)'
    quebrasCol.deleteRule = '@request.auth.role = "gestor"'
    app.save(quebrasCol)

    // ==========================================
    // 4. API Rules para Coleções de Apoio e Sistema
    // ==========================================

    // 4.1 configuracoes_sla: List/View autenticado; Create/Update/Delete só gestor
    const slaCol = app.findCollectionByNameOrId('configuracoes_sla')
    slaCol.listRule = '@request.auth.id != ""'
    slaCol.viewRule = '@request.auth.id != ""'
    slaCol.createRule = '@request.auth.role = "gestor"'
    slaCol.updateRule = '@request.auth.role = "gestor"'
    slaCol.deleteRule = '@request.auth.role = "gestor"'
    app.save(slaCol)

    // 4.2 lojas: List/View autenticado; Create/Update/Delete só gestor
    const lojasCol = app.findCollectionByNameOrId('lojas')
    lojasCol.listRule = '@request.auth.id != ""'
    lojasCol.viewRule = '@request.auth.id != ""'
    lojasCol.createRule = '@request.auth.role = "gestor"'
    lojasCol.updateRule = '@request.auth.role = "gestor"'
    lojasCol.deleteRule = '@request.auth.role = "gestor"'
    app.save(lojasCol)

    // 4.3 trello_listas: List/View autenticado; Create/Update/Delete só gestor
    const trelloListasCol = app.findCollectionByNameOrId('trello_listas')
    trelloListasCol.listRule = '@request.auth.id != ""'
    trelloListasCol.viewRule = '@request.auth.id != ""'
    trelloListasCol.createRule = '@request.auth.role = "gestor"'
    trelloListasCol.updateRule = '@request.auth.role = "gestor"'
    trelloListasCol.deleteRule = '@request.auth.role = "gestor"'
    app.save(trelloListasCol)

    // 4.4 kanban_cartoes: manter consistência de acesso por loja/gestor
    try {
      const kanbanCol = app.findCollectionByNameOrId('kanban_cartoes')
      kanbanCol.listRule =
        '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.role = "diretoria" || @request.auth.loja = loja)'
      kanbanCol.viewRule =
        '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.role = "diretoria" || @request.auth.loja = loja)'
      kanbanCol.createRule =
        '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.loja = @request.body.loja)'
      kanbanCol.updateRule =
        '@request.auth.id != "" && (@request.auth.role = "gestor" || @request.auth.role = "sac" || @request.auth.loja = loja)'
      kanbanCol.deleteRule = '@request.auth.role = "gestor"'
      app.save(kanbanCol)
    } catch (_) {}
  },
  (app) => {
    // Reverter regras para authenticated padrão
    const cols = [
      'clientes',
      'atendimentos',
      'reclamacoes',
      'follow_ups',
      'quebras_boem',
      'configuracoes_sla',
      'lojas',
      'trello_listas',
      'kanban_cartoes',
    ]
    for (const cName of cols) {
      try {
        const c = app.findCollectionByNameOrId(cName)
        c.listRule = "@request.auth.id != ''"
        c.viewRule = "@request.auth.id != ''"
        c.createRule = "@request.auth.id != ''"
        c.updateRule = "@request.auth.id != ''"
        c.deleteRule = "@request.auth.id != ''"
        app.save(c)
      } catch (_) {}
    }
  },
)
