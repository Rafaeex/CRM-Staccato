migrate(
  (app) => {
    // 1. Atualizar opções de gravidade na coleção 'reclamacoes' para incluir 'Urgente'
    try {
      const recCol = app.findCollectionByNameOrId('reclamacoes')
      const gravidadeField = recCol.fields.getByName('gravidade')
      if (gravidadeField) {
        gravidadeField.values = ['Baixa', 'Média', 'Alta', 'Urgente']
        app.save(recCol)
      }
    } catch (e) {
      console.log('Aviso ao atualizar gravidade em reclamacoes:', e)
    }

    // 2. Criar coleção 'configuracoes_sla' para armazenar os prazos em dias úteis
    let slaCol
    try {
      slaCol = app.findCollectionByNameOrId('configuracoes_sla')
    } catch (_) {
      slaCol = new Collection({
        name: 'configuracoes_sla',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'gravidade',
            type: 'select',
            required: true,
            values: ['Baixa', 'Média', 'Alta', 'Urgente'],
            maxSelect: 1,
          },
          {
            name: 'dias_uteis',
            type: 'number',
            required: true,
            min: 1,
            max: 90,
            onlyInt: true,
          },
          {
            name: 'descricao',
            type: 'text',
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_config_sla_gravidade ON configuracoes_sla (gravidade)'],
      })
      app.save(slaCol)
    }

    // 3. Semear valores padrão se a coleção estiver vazia:
    // Urgente = 1 dia útil, Alta = 3 dias úteis, Média = 5 dias úteis, Baixa = 10 dias úteis
    const slaCount = app.countRecords('configuracoes_sla')
    if (slaCount === 0) {
      const slaColInstance = app.findCollectionByNameOrId('configuracoes_sla')
      const padroes = [
        {
          gravidade: 'Urgente',
          dias_uteis: 1,
          descricao: 'Casos críticos com impacto imediato ou risco para a obra',
        },
        {
          gravidade: 'Alta',
          dias_uteis: 3,
          descricao: 'Falta de material, avarias graves ou atrasos em andamento',
        },
        {
          gravidade: 'Média',
          dias_uteis: 5,
          descricao: 'Dúvidas de assentamento, trocas simples ou pendências de lote',
        },
        {
          gravidade: 'Baixa',
          dias_uteis: 10,
          descricao: 'Documentações, orientações técnicas e certificados',
        },
      ]

      for (const item of padroes) {
        const r = new Record(slaColInstance)
        r.set('gravidade', item.gravidade)
        r.set('dias_uteis', item.dias_uteis)
        r.set('descricao', item.descricao)
        app.save(r)
      }
    }
  },
  (app) => {
    try {
      const slaCol = app.findCollectionByNameOrId('configuracoes_sla')
      app.delete(slaCol)
    } catch (_) {}
  },
)
