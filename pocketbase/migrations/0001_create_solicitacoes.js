migrate(
  (app) => {
    const collection = new Collection({
      name: 'solicitacoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '',
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'cliente_nome', type: 'text', required: true },
        { name: 'telefone', type: 'text', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'servico', type: 'text', required: true },
        { name: 'loja', type: 'text', required: true },
        { name: 'data_preferida', type: 'text', required: true },
        { name: 'horario_preferido', type: 'text', required: true },
        { name: 'mensagem', type: 'text', required: false },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Pendente', 'Confirmado', 'Concluído', 'Cancelado'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_solicitacoes_status ON solicitacoes (status)',
        'CREATE INDEX idx_solicitacoes_loja ON solicitacoes (loja)',
        'CREATE INDEX idx_solicitacoes_created ON solicitacoes (created)',
        'CREATE INDEX idx_solicitacoes_telefone ON solicitacoes (telefone)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('solicitacoes')
      app.delete(collection)
    } catch (_) {}
  },
)
