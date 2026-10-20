migrate(
  (app) => {
    // 1. Coleção 'lojas'
    const lojasCol = new Collection({
      name: 'lojas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true },
        { name: 'cidade', type: 'text', required: true },
        { name: 'bairro', type: 'text', required: true },
        { name: 'endereco', type: 'text', required: true },
        { name: 'telefone', type: 'text', required: true },
        { name: 'whatsapp', type: 'text', required: true },
        { name: 'gerente', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_lojas_slug ON lojas (slug)',
        'CREATE INDEX idx_lojas_nome ON lojas (nome)',
      ],
    })
    app.save(lojasCol)

    // 2. Coleção 'clientes'
    const clientesCol = new Collection({
      name: 'clientes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'telefone', type: 'text', required: true },
        { name: 'email', type: 'email' },
        { name: 'loja_origem', type: 'text', required: true },
        {
          name: 'etapa_funil',
          type: 'select',
          required: true,
          values: ['Lead', 'Em atendimento', 'Proposta enviada', 'Cliente fechado', 'Perdido'],
          maxSelect: 1,
        },
        { name: 'interesse_principal', type: 'text' },
        { name: 'arquiteto_parceiro', type: 'text' },
        { name: 'notas_internas', type: 'text' },
        { name: 'cidade', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_clientes_nome ON clientes (nome)',
        'CREATE INDEX idx_clientes_telefone ON clientes (telefone)',
        'CREATE INDEX idx_clientes_loja ON clientes (loja_origem)',
        'CREATE INDEX idx_clientes_etapa ON clientes (etapa_funil)',
      ],
    })
    app.save(clientesCol)

    // 3. Coleção 'atendimentos'
    const clientesId = app.findCollectionByNameOrId('clientes').id
    const atendimentosCol = new Collection({
      name: 'atendimentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'cliente',
          type: 'relation',
          required: true,
          collectionId: clientesId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'cliente_nome', type: 'text', required: true },
        { name: 'loja', type: 'text', required: true },
        { name: 'responsavel', type: 'text', required: true },
        {
          name: 'canal',
          type: 'select',
          required: true,
          values: ['Presencial', 'WhatsApp', 'Telefone', 'Reunião Online'],
          maxSelect: 1,
        },
        { name: 'data_atendimento', type: 'text', required: true },
        { name: 'horario', type: 'text' },
        { name: 'interesse', type: 'text', required: true },
        { name: 'resumo', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Aberto', 'Em negociação', 'Fechado', 'Perdido'],
          maxSelect: 1,
        },
        { name: 'valor_estimado', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_atendimentos_cliente ON atendimentos (cliente)',
        'CREATE INDEX idx_atendimentos_loja ON atendimentos (loja)',
        'CREATE INDEX idx_atendimentos_status ON atendimentos (status)',
        'CREATE INDEX idx_atendimentos_data ON atendimentos (data_atendimento)',
        'CREATE INDEX idx_atendimentos_responsavel ON atendimentos (responsavel)',
      ],
    })
    app.save(atendimentosCol)

    // 4. Coleção 'follow_ups'
    const followUpsCol = new Collection({
      name: 'follow_ups',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'cliente',
          type: 'relation',
          required: true,
          collectionId: clientesId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'cliente_nome', type: 'text', required: true },
        { name: 'cliente_telefone', type: 'text', required: true },
        { name: 'loja', type: 'text', required: true },
        { name: 'responsavel', type: 'text', required: true },
        {
          name: 'canal',
          type: 'select',
          required: true,
          values: ['WhatsApp', 'Telefone', 'E-mail', 'Presencial'],
          maxSelect: 1,
        },
        { name: 'data_prevista', type: 'text', required: true },
        { name: 'horario_previsto', type: 'text' },
        { name: 'assunto', type: 'text', required: true },
        { name: 'mensagem_sugerida', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Pendente', 'Concluído', 'Cancelado'],
          maxSelect: 1,
        },
        { name: 'data_conclusao', type: 'text' },
        { name: 'resultado_nota', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_followups_cliente ON follow_ups (cliente)',
        'CREATE INDEX idx_followups_status ON follow_ups (status)',
        'CREATE INDEX idx_followups_data ON follow_ups (data_prevista)',
        'CREATE INDEX idx_followups_loja ON follow_ups (loja)',
      ],
    })
    app.save(followUpsCol)
  },
  (app) => {
    try {
      const f = app.findCollectionByNameOrId('follow_ups')
      app.delete(f)
    } catch (_) {}
    try {
      const a = app.findCollectionByNameOrId('atendimentos')
      app.delete(a)
    } catch (_) {}
    try {
      const c = app.findCollectionByNameOrId('clientes')
      app.delete(c)
    } catch (_) {}
    try {
      const l = app.findCollectionByNameOrId('lojas')
      app.delete(l)
    } catch (_) {}
  },
)
