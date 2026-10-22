migrate(
  (app) => {
    // 1. Criar coleção 'trello_listas' para manter as listas/colunas do quadro Trello customizáveis
    let trelloListasCol
    try {
      trelloListasCol = app.findCollectionByNameOrId('trello_listas')
    } catch (_) {
      trelloListasCol = new Collection({
        name: 'trello_listas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'tipo_quadro', type: 'text', required: false }, // 'quebras', 'sac', 'geral'
          { name: 'trello_id', type: 'text', required: false },
          { name: 'ordem', type: 'number', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_trello_listas_nome ON trello_listas (nome)',
          'CREATE INDEX idx_trello_listas_tipo ON trello_listas (tipo_quadro)',
        ],
      })
      app.save(trelloListasCol)

      // Semear as listas padrões do quadro BOT IA do usuário
      const padroes = [
        { nome: 'RAFAEL - SAC', tipo_quadro: 'geral', ordem: 1 },
        { nome: 'ALEXANDRE - DIRETORIA', tipo_quadro: 'geral', ordem: 2 },
      ]
      for (const p of padroes) {
        const r = new Record(trelloListasCol)
        r.set('nome', p.nome)
        r.set('tipo_quadro', p.tipo_quadro)
        r.set('ordem', p.ordem)
        app.save(r)
      }
    }

    // 2. Expandir coleção 'quebras_boem' com os campos exatos do modelo do Trello:
    // - lista_trello (nome da coluna/pessoa, ex: 'RAFAEL - SAC', 'ALEXANDRE - DIRETORIA')
    // - produtos_itens_json (tabela estruturada: [{codigo, descricao, lote, qtd_total, qtd_quebrada}])
    // - entrega_entregador (nome e/ou CPF/RG)
    // - entrega_recebedor (nome e/ou CPF/RG)
    // - local_ocorrencia (Produto já chegou avariado do fornecedor | Movimentação no CD | Identificado na entrega | Identificado posterior a entrega)
    const quebrasCol = app.findCollectionByNameOrId('quebras_boem')
    if (!quebrasCol.fields.getByName('lista_quadro')) {
      quebrasCol.fields.add(
        new TextField({
          name: 'lista_quadro',
          required: false,
        }),
      )
    }
    if (!quebrasCol.fields.getByName('produtos_itens_json')) {
      quebrasCol.fields.add(
        new TextField({
          name: 'produtos_itens_json',
          required: false,
        }),
      )
    }
    if (!quebrasCol.fields.getByName('entrega_entregador')) {
      quebrasCol.fields.add(
        new TextField({
          name: 'entrega_entregador',
          required: false,
        }),
      )
    }
    if (!quebrasCol.fields.getByName('entrega_recebedor')) {
      quebrasCol.fields.add(
        new TextField({
          name: 'entrega_recebedor',
          required: false,
        }),
      )
    }
    if (!quebrasCol.fields.getByName('local_ocorrencia')) {
      quebrasCol.fields.add(
        new TextField({
          name: 'local_ocorrencia',
          required: false,
        }),
      )
    }
    // Adicionar índice para origem_trello_id para idempotência veloz
    app.save(quebrasCol)

    try {
      const qRef = app.findCollectionByNameOrId('quebras_boem')
      qRef.addIndex('idx_quebras_trello_id', false, 'origem_trello_id', '')
      app.save(qRef)
    } catch (_) {}

    // 3. Expandir coleção 'reclamacoes' (SAC) com os campos do modelo SAC do Trello:
    // - numero_pedido (LOJA-123456)
    // - contato_tratar_nome
    // - contato_tratar_telefone
    // - contato_tratar_email
    // - produtos_envolvidos (código / descrição)
    // - status_produto (Material ainda na obra/posse | Material com transportadora | CD Staccato | Na loja | Outro)
    // - produto_instalado (SIM | NÃO)
    // - solicitacao_desejo (Substituição | Crédito | Reembolso financeiro | Assistência técnica | Personalizar)
    // - lista_quadro (nome da lista/coluna do Trello, ex: 'RAFAEL - SAC')
    // - origem_trello_id
    // - anexos (FileField para fotos/vídeos comprobatórios)
    const recCol = app.findCollectionByNameOrId('reclamacoes')
    if (!recCol.fields.getByName('numero_pedido')) {
      recCol.fields.add(
        new TextField({
          name: 'numero_pedido',
          required: false,
        }),
      )
    }
    if (!recCol.fields.getByName('contato_tratar_nome')) {
      recCol.fields.add(
        new TextField({
          name: 'contato_tratar_nome',
          required: false,
        }),
      )
    }
    if (!recCol.fields.getByName('contato_tratar_telefone')) {
      recCol.fields.add(
        new TextField({
          name: 'contato_tratar_telefone',
          required: false,
        }),
      )
    }
    if (!recCol.fields.getByName('contato_tratar_email')) {
      recCol.fields.add(
        new TextField({
          name: 'contato_tratar_email',
          required: false,
        }),
      )
    }
    if (!recCol.fields.getByName('produtos_envolvidos')) {
      recCol.fields.add(
        new TextField({
          name: 'produtos_envolvidos',
          required: false,
        }),
      )
    }
    if (!recCol.fields.getByName('status_produto')) {
      recCol.fields.add(
        new TextField({
          name: 'status_produto',
          required: false,
        }),
      )
    }
    if (!recCol.fields.getByName('produto_instalado')) {
      recCol.fields.add(
        new TextField({
          name: 'produto_instalado',
          required: false,
        }),
      )
    }
    if (!recCol.fields.getByName('solicitacao_desejo')) {
      recCol.fields.add(
        new TextField({
          name: 'solicitacao_desejo',
          required: false,
        }),
      )
    }
    if (!recCol.fields.getByName('lista_quadro')) {
      recCol.fields.add(
        new TextField({
          name: 'lista_quadro',
          required: false,
        }),
      )
    }
    if (!recCol.fields.getByName('origem_trello_id')) {
      recCol.fields.add(
        new TextField({
          name: 'origem_trello_id',
          required: false,
        }),
      )
    }
    if (!recCol.fields.getByName('anexos')) {
      recCol.fields.add(
        new FileField({
          name: 'anexos',
          required: false,
          maxSelect: 10,
          maxSize: 20971520, // 20 MB
        }),
      )
    }
    app.save(recCol)

    try {
      const rRef = app.findCollectionByNameOrId('reclamacoes')
      rRef.addIndex('idx_reclamacoes_trello_id', false, 'origem_trello_id', '')
      rRef.addIndex('idx_reclamacoes_pedido', false, 'numero_pedido', '')
      app.save(rRef)
    } catch (_) {}

    // Backfill padrão de lista_quadro para registros existentes
    app
      .db()
      .newQuery(
        "UPDATE quebras_boem SET lista_quadro = 'RAFAEL - SAC' WHERE lista_quadro IS NULL OR lista_quadro = ''",
      )
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE reclamacoes SET lista_quadro = 'RAFAEL - SAC' WHERE lista_quadro IS NULL OR lista_quadro = ''",
      )
      .execute()
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('trello_listas')
      app.delete(col)
    } catch (_) {}
  },
)
