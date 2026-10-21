migrate(
  (app) => {
    // 1. Atualizar users auth collection com role e loja
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!usersCol.fields.getByName('role')) {
      usersCol.fields.add(
        new SelectField({
          name: 'role',
          required: false,
          values: ['gestor', 'atendente'],
          maxSelect: 1,
        }),
      )
    }
    if (!usersCol.fields.getByName('loja')) {
      usersCol.fields.add(
        new TextField({
          name: 'loja',
          required: false,
        }),
      )
    }

    // Permitir list/view de usuários para autenticados poderem ver nomes de responsáveis
    usersCol.listRule = "@request.auth.id != ''"
    usersCol.viewRule = "@request.auth.id != ''"
    app.save(usersCol)

    // Atualizar usuários existentes para gestores
    app.db().newQuery("UPDATE users SET role = 'gestor' WHERE role IS NULL OR role = ''").execute()

    // Criar atendente de demonstração atendente@boutique.com / atendente1234 (Vila Olímpia (SP))
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'atendente@boutique.com')
    } catch (_) {
      const atendenteRec = new Record(usersCol)
      atendenteRec.setEmail('atendente@boutique.com')
      atendenteRec.setPassword('atendente1234')
      atendenteRec.setVerified(true)
      atendenteRec.set('name', 'Marina Costa (Atendente)')
      atendenteRec.set('role', 'atendente')
      atendenteRec.set('loja', 'Vila Olímpia (SP)')
      app.save(atendenteRec)
    }

    // 2. Adicionar campos de IA na coleção follow_ups
    const followUpsCol = app.findCollectionByNameOrId('follow_ups')
    if (!followUpsCol.fields.getByName('gerado_por_ia')) {
      followUpsCol.fields.add(
        new BoolField({
          name: 'gerado_por_ia',
          required: false,
        }),
      )
    }
    if (!followUpsCol.fields.getByName('urgencia')) {
      followUpsCol.fields.add(
        new SelectField({
          name: 'urgencia',
          required: false,
          values: ['Baixa', 'Média', 'Alta'],
          maxSelect: 1,
        }),
      )
    }
    if (!followUpsCol.fields.getByName('justificativa_ia')) {
      followUpsCol.fields.add(
        new TextField({
          name: 'justificativa_ia',
          required: false,
        }),
      )
    }
    app.save(followUpsCol)

    // 3. Criar coleção 'kanban_cartoes' com suporte a anexos (FileField)
    const clientesId = app.findCollectionByNameOrId('clientes').id
    let kanbanCol
    try {
      kanbanCol = app.findCollectionByNameOrId('kanban_cartoes')
    } catch (_) {
      kanbanCol = new Collection({
        name: 'kanban_cartoes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'titulo', type: 'text', required: true },
          {
            name: 'cliente',
            type: 'relation',
            required: false,
            collectionId: clientesId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'cliente_nome', type: 'text' },
          { name: 'loja', type: 'text', required: true },
          { name: 'responsavel', type: 'text', required: true },
          {
            name: 'coluna',
            type: 'select',
            required: true,
            values: ['A fazer', 'Fazendo hoje', 'Aguardando cliente', 'Resolvido'],
            maxSelect: 1,
          },
          {
            name: 'prioridade',
            type: 'select',
            required: false,
            values: ['Baixa', 'Média', 'Alta', 'Urgente'],
            maxSelect: 1,
          },
          { name: 'descricao', type: 'text' },
          { name: 'data_limite', type: 'text' },
          { name: 'ordem', type: 'number', required: false },
          { name: 'checklist_json', type: 'text' },
          {
            name: 'anexos',
            type: 'file',
            required: false,
            maxSelect: 10,
            maxSize: 20971520, // 20 MB
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_kanban_coluna ON kanban_cartoes (coluna)',
          'CREATE INDEX idx_kanban_loja ON kanban_cartoes (loja)',
          'CREATE INDEX idx_kanban_responsavel ON kanban_cartoes (responsavel)',
          'CREATE INDEX idx_kanban_cliente ON kanban_cartoes (cliente)',
        ],
      })
      app.save(kanbanCol)
    }

    // 4. Semear cartões kanban de demonstração nas lojas
    const countCartoes = app.countRecords('kanban_cartoes')
    if (countCartoes === 0) {
      const clientesList = app.findRecordsByFilter('clientes', '', '-created', 10, 0)
      const c1 = clientesList[0]
      const c2 = clientesList[1] || c1
      const c3 = clientesList[2] || c1
      const c4 = clientesList[3] || c1
      const c5 = clientesList[4] || c2
      const c6 = clientesList[5] || c3
      const c7 = clientesList[6] || c4

      const hojeStr = new Date().toISOString().split('T')[0]

      const seedKanban = [
        {
          titulo: 'Alinhar paginação Calacatta 120x240cm',
          cliente: c1 ? c1.id : '',
          cliente_nome: c1 ? c1.getString('nome') : 'Mariana Alcantara',
          loja: 'Vila Olímpia (SP)',
          responsavel: 'Marina Costa (Atendente)',
          coluna: 'Fazendo hoje',
          prioridade: 'Alta',
          descricao:
            'Verificar prumada com Studio Arthur Casas e aprovar amostras na iluminação da obra.',
          data_limite: hojeStr,
          ordem: 1,
          checklist_json: JSON.stringify([
            { id: '1', texto: 'Enviar amostras físicas para o arquiteto', concluido: true },
            { id: '2', texto: 'Confirmar quantitativo de rodapés', concluido: false },
            { id: '3', texto: 'Subir memorial descritivo em anexo', concluido: false },
          ]),
        },
        {
          titulo: 'Enviar amostras em domicílio (Pacaembu)',
          cliente: c2 ? c2.id : '',
          cliente_nome: c2 ? c2.getString('nome') : 'Eduardo Vasconcellos',
          loja: 'Higienópolis (SP)',
          responsavel: 'Helena Martins',
          coluna: 'A fazer',
          prioridade: 'Média',
          descricao: 'Separar kit de mármores especiais e metais Champagne escovados.',
          data_limite: hojeStr,
          ordem: 1,
          checklist_json: JSON.stringify([
            { id: '1', texto: 'Separar placa 30x30 Calacatta', concluido: true },
            { id: '2', texto: 'Separar mostrador champagne escovado', concluido: false },
          ]),
        },
        {
          titulo: 'Aguardando aprovação de memorial técnico',
          cliente: c3 ? c3.id : '',
          cliente_nome: c3 ? c3.getString('nome') : 'Beatriz Nogueira',
          loja: 'Alphaville (Barueri)',
          responsavel: 'Camila Duarte',
          coluna: 'Aguardando cliente',
          prioridade: 'Alta',
          descricao: 'Cliente analisando aditivo de piso atérmico para deck da piscina.',
          data_limite: hojeStr,
          ordem: 1,
          checklist_json: JSON.stringify([
            { id: '1', texto: 'Enviar orçamento detalhado em PDF', concluido: true },
            { id: '2', texto: 'Confirmar data prevista de assentamento', concluido: false },
          ]),
        },
        {
          titulo: 'Entrega técnica e conferência in loco',
          cliente: c4 ? c4.id : '',
          cliente_nome: c4 ? c4.getString('nome') : 'Carlos Eduardo Fontes',
          loja: 'Moema (SP)',
          responsavel: 'Ricardo Salles',
          coluna: 'Resolvido',
          prioridade: 'Baixa',
          descricao: 'Conferência de lote da madeira ripada finalizada com o encarregado.',
          data_limite: hojeStr,
          ordem: 1,
          checklist_json: JSON.stringify([
            { id: '1', texto: 'Conferir caixas na descarga', concluido: true },
            { id: '2', texto: 'Pegar assinatura do canhoto', concluido: true },
          ]),
        },
        {
          titulo: 'Retornar sobre novas cubas esculpidas',
          cliente: c5 ? c5.id : '',
          cliente_nome: c5 ? c5.getString('nome') : 'Fernanda Albuquerque',
          loja: 'Tatuapé (SP)',
          responsavel: 'Patrícia Prado',
          coluna: 'A fazer',
          prioridade: 'Urgente',
          descricao: 'Enviar desenhos técnicos das cubas esculpidas em lâmina sinterizada.',
          data_limite: hojeStr,
          ordem: 2,
          checklist_json: JSON.stringify([
            { id: '1', texto: 'Solicitar corte ao marmorista', concluido: false },
          ]),
        },
        {
          titulo: 'Troca de caixas de lote divergente Hijau',
          cliente: c6 ? c6.id : '',
          cliente_nome: c6 ? c6.getString('nome') : 'Rodrigo Mendonça',
          loja: 'Santana de Parnaíba',
          responsavel: 'Marcelo Bittencourt',
          coluna: 'Fazendo hoje',
          prioridade: 'Urgente',
          descricao: 'Ocorrência de tonalidade: encaminhar caixas do lote matriz para Tamboré.',
          data_limite: hojeStr,
          ordem: 2,
          checklist_json: JSON.stringify([
            { id: '1', texto: 'Acionar centro de distribuição', concluido: true },
            { id: '2', texto: 'Enviar motorista com reposição', concluido: false },
          ]),
        },
        {
          titulo: 'Certificado antibacteriano da clínica',
          cliente: c7 ? c7.id : '',
          cliente_nome: c7 ? c7.getString('nome') : 'Juliana Pires',
          loja: 'Guarulhos',
          responsavel: 'Renata Zanin',
          coluna: 'Aguardando cliente',
          prioridade: 'Baixa',
          descricao: 'Laudos de vigilância sanitária enviados por e-mail para aprovação técnica.',
          data_limite: hojeStr,
          ordem: 2,
          checklist_json: JSON.stringify([
            { id: '1', texto: 'Emitir laudo autenticado', concluido: true },
          ]),
        },
      ]

      const kanbanInstance = app.findCollectionByNameOrId('kanban_cartoes')
      for (const item of seedKanban) {
        const r = new Record(kanbanInstance)
        r.set('titulo', item.titulo)
        r.set('cliente', item.cliente)
        r.set('cliente_nome', item.cliente_nome)
        r.set('loja', item.loja)
        r.set('responsavel', item.responsavel)
        r.set('coluna', item.coluna)
        r.set('prioridade', item.prioridade)
        r.set('descricao', item.descricao)
        r.set('data_limite', item.data_limite)
        r.set('ordem', item.ordem)
        r.set('checklist_json', item.checklist_json)
        app.save(r)
      }
    }
  },
  (app) => {
    try {
      const k = app.findCollectionByNameOrId('kanban_cartoes')
      app.delete(k)
    } catch (_) {}
  },
)
