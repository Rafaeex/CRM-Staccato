migrate(
  (app) => {
    // 1. Atualizar coleção 'clientes':
    //    - Adicionar campo 'status_atendimento' com valores: 'Novo', 'Em atendimento', 'Aguardando cliente', 'Atendimento concluído'
    //    - Migrar os dados de etapa_funil para status_atendimento
    //    - Remover campo e índice de etapa_funil
    const clientesCol = app.findCollectionByNameOrId('clientes')

    // Remove índice antigo de etapa_funil se existir
    try {
      clientesCol.removeIndex('idx_clientes_etapa')
    } catch (_) {}

    if (!clientesCol.fields.getByName('status_atendimento')) {
      clientesCol.fields.add(
        new SelectField({
          name: 'status_atendimento',
          required: true,
          values: ['Novo', 'Em atendimento', 'Aguardando cliente', 'Atendimento concluído'],
          maxSelect: 1,
        }),
      )
    }

    // Se etapa_funil ainda estiver presente nos campos do Collection, podemos remover ou manter temporariamente para migrar dados
    app.save(clientesCol)

    // Backfill dos dados de clientes:
    // Lead -> Novo
    // Em atendimento -> Em atendimento
    // Proposta enviada -> Aguardando cliente
    // Cliente fechado / Perdido -> Atendimento concluído
    app
      .db()
      .newQuery(`
      UPDATE clientes
      SET status_atendimento = CASE
        WHEN etapa_funil = 'Lead' THEN 'Novo'
        WHEN etapa_funil = 'Em atendimento' THEN 'Em atendimento'
        WHEN etapa_funil = 'Proposta enviada' THEN 'Aguardando cliente'
        WHEN etapa_funil IN ('Cliente fechado', 'Perdido') THEN 'Atendimento concluído'
        ELSE 'Novo'
      END
      WHERE status_atendimento IS NULL OR status_atendimento = ''
    `)
      .execute()

    // Agora remove o campo etapa_funil da coleção clientes
    const clientesRef = app.findCollectionByNameOrId('clientes')
    const etapaField = clientesRef.fields.getByName('etapa_funil')
    if (etapaField) {
      clientesRef.fields.removeById(etapaField.id)
    }
    clientesRef.addIndex('idx_clientes_status_atendimento', false, 'status_atendimento', '')
    app.save(clientesRef)

    // 2. Atualizar coleção 'atendimentos':
    //    - Remover campo 'valor_estimado' se existir
    //    - Atualizar valores do select 'status' para semântica de atendimento puro:
    //      ['Aberto', 'Em atendimento', 'Concluído', 'Cancelado']
    //      Mapear: 'Em negociação' -> 'Em atendimento', 'Fechado' -> 'Concluído', 'Perdido' -> 'Cancelado'
    const atendimentosCol = app.findCollectionByNameOrId('atendimentos')
    const valorField = atendimentosCol.fields.getByName('valor_estimado')
    if (valorField) {
      atendimentosCol.fields.removeById(valorField.id)
    }

    // Atualiza opções do select status de atendimentos
    const statusAtendimentoField = atendimentosCol.fields.getByName('status')
    if (statusAtendimentoField) {
      statusAtendimentoField.values = ['Aberto', 'Em atendimento', 'Concluído', 'Cancelado']
    }
    app.save(atendimentosCol)

    // Migra status antigos de atendimentos
    app
      .db()
      .newQuery(`
      UPDATE atendimentos
      SET status = CASE
        WHEN status = 'Em negociação' THEN 'Em atendimento'
        WHEN status = 'Fechado' THEN 'Concluído'
        WHEN status = 'Perdido' THEN 'Cancelado'
        ELSE status
      END
    `)
      .execute()

    // 3. Criar coleção 'reclamacoes'
    let reclamacoesCol
    try {
      reclamacoesCol = app.findCollectionByNameOrId('reclamacoes')
    } catch (_) {
      const clientesId = app.findCollectionByNameOrId('clientes').id
      reclamacoesCol = new Collection({
        name: 'reclamacoes',
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
          { name: 'cliente_telefone', type: 'text' },
          { name: 'loja', type: 'text', required: true },
          {
            name: 'canal_origem',
            type: 'select',
            required: true,
            values: ['Loja', 'WhatsApp', 'Telefone', 'E-mail'],
            maxSelect: 1,
          },
          {
            name: 'categoria',
            type: 'select',
            required: true,
            values: [
              'Produto com defeito',
              'Atraso na entrega',
              'Atendimento',
              'Troca/devolução',
              'Cobrança',
              'Outro',
            ],
            maxSelect: 1,
          },
          { name: 'descricao', type: 'text', required: true },
          {
            name: 'gravidade',
            type: 'select',
            required: true,
            values: ['Baixa', 'Média', 'Alta'],
            maxSelect: 1,
          },
          { name: 'responsavel', type: 'text', required: true },
          { name: 'prazo_resolucao', type: 'text', required: true },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['Aberta', 'Em tratamento', 'Resolvida'],
            maxSelect: 1,
          },
          { name: 'resolucao_desfecho', type: 'text' },
          { name: 'data_resolucao', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_reclamacoes_cliente ON reclamacoes (cliente)',
          'CREATE INDEX idx_reclamacoes_loja ON reclamacoes (loja)',
          'CREATE INDEX idx_reclamacoes_status ON reclamacoes (status)',
          'CREATE INDEX idx_reclamacoes_gravidade ON reclamacoes (gravidade)',
          'CREATE INDEX idx_reclamacoes_prazo ON reclamacoes (prazo_resolucao)',
        ],
      })
      app.save(reclamacoesCol)
    }

    // 4. Semear 6–8 reclamações realistas com diferentes status, gravidades, lojas e clientes
    const recCount = app.countRecords('reclamacoes')
    if (recCount === 0) {
      const clientesList = app.findRecordsByFilter('clientes', '', '-created', 10, 0)
      if (clientesList.length > 0) {
        const c1 = clientesList[0] // Mariana Alcantara
        const c2 = clientesList[1] || c1 // Eduardo Vasconcellos
        const c3 = clientesList[2] || c1 // Beatriz Nogueira
        const c4 = clientesList[3] || c1 // Carlos Eduardo Fontes
        const c5 = clientesList[4] || c2 // Fernanda Albuquerque
        const c6 = clientesList[5] || c3 // Rodrigo Mendonça
        const c7 = clientesList[6] || c4 // Juliana Pires

        // Gerar datas para hoje, ontem e dias passados/futuros
        const hojeDate = new Date()
        const formatYMD = (d) => d.toISOString().split('T')[0]

        const dHoje = formatYMD(hojeDate)

        const dOntem = new Date()
        dOntem.setDate(dOntem.getDate() - 1)
        const sOntem = formatYMD(dOntem)

        const dVencida3Dias = new Date()
        dVencida3Dias.setDate(dVencida3Dias.getDate() - 3)
        const sVencida3Dias = formatYMD(dVencida3Dias)

        const dAmanha = new Date()
        dAmanha.setDate(dAmanha.getDate() + 1)
        const sAmanha = formatYMD(dAmanha)

        const dEm4Dias = new Date()
        dEm4Dias.setDate(dEm4Dias.getDate() + 4)
        const sEm4Dias = formatYMD(dEm4Dias)

        const dResolvida10Dias = new Date()
        dResolvida10Dias.setDate(dResolvida10Dias.getDate() - 10)
        const sResolvida10Dias = formatYMD(dResolvida10Dias)

        const dResolvida2Dias = new Date()
        dResolvida2Dias.setDate(dResolvida2Dias.getDate() - 2)
        const sResolvida2Dias = formatYMD(dResolvida2Dias)

        const seedReclamacoes = [
          {
            cliente: c1.id,
            cliente_nome: c1.getString('nome'),
            cliente_telefone: c1.getString('telefone'),
            loja: 'Vila Olímpia (SP)',
            canal_origem: 'WhatsApp',
            categoria: 'Produto com defeito',
            gravidade: 'Alta',
            descricao:
              'Avaria identificada em duas placas de porcelanato Calacatta 120x240cm com fissura de transporte na borda esquerda.',
            responsavel: 'André Ramos',
            prazo_resolucao: sVencida3Dias, // Vencida propositalmente para destaque
            status: 'Aberta',
            resolucao_desfecho: '',
            data_resolucao: '',
          },
          {
            cliente: c2.id,
            cliente_nome: c2.getString('nome'),
            cliente_telefone: c2.getString('telefone'),
            loja: 'Higienópolis (SP)',
            canal_origem: 'Telefone',
            categoria: 'Atraso na entrega',
            gravidade: 'Alta',
            descricao:
              'Carga de rodapés e soleiras com atraso de 48 horas em relação ao cronograma de assentamento da obra no Pacaembu.',
            responsavel: 'Helena Martins',
            prazo_resolucao: dHoje,
            status: 'Em tratamento',
            resolucao_desfecho: '',
            data_resolucao: '',
          },
          {
            cliente: c3.id,
            cliente_nome: c3.getString('nome'),
            cliente_telefone: c3.getString('telefone'),
            loja: 'Alphaville (Barueri)',
            canal_origem: 'Loja',
            categoria: 'Troca/devolução',
            gravidade: 'Média',
            descricao:
              'Cliente solicitou a troca de 4 caixas de revestimento atérmico após recálculo da área da piscina pelo arquiteto.',
            responsavel: 'Camila Duarte',
            prazo_resolucao: sAmanha,
            status: 'Em tratamento',
            resolucao_desfecho: '',
            data_resolucao: '',
          },
          {
            cliente: c4.id,
            cliente_nome: c4.getString('nome'),
            cliente_telefone: c4.getString('telefone'),
            loja: 'Moema (SP)',
            canal_origem: 'WhatsApp',
            categoria: 'Atendimento',
            gravidade: 'Baixa',
            descricao:
              'Dúvida sobre orientações técnicas de impermeabilização prévia do contrapiso não respondida a tempo pela equipe de campo.',
            responsavel: 'Ricardo Salles',
            prazo_resolucao: sEm4Dias,
            status: 'Aberta',
            resolucao_desfecho: '',
            data_resolucao: '',
          },
          {
            cliente: c5.id,
            cliente_nome: c5.getString('nome'),
            cliente_telefone: c5.getString('telefone'),
            loja: 'Tatuapé (SP)',
            canal_origem: 'E-mail',
            categoria: 'Cobrança',
            gravidade: 'Média',
            descricao:
              'Divergência na emissão da NF complementar de frete dedicada para entrega agendada no sábado.',
            responsavel: 'Patrícia Prado',
            prazo_resolucao: sOntem,
            status: 'Resolvida',
            resolucao_desfecho:
              'NF retificada e cancelamento da cobrança indevida efetuado com envio do comprovante para a cliente.',
            data_resolucao: sOntem,
          },
          {
            cliente: c6.id,
            cliente_nome: c6.getString('nome'),
            cliente_telefone: c6.getString('telefone'),
            loja: 'Santana de Parnaíba',
            canal_origem: 'WhatsApp',
            categoria: 'Produto com defeito',
            gravidade: 'Alta',
            descricao:
              'Divergência de lote e tonalidade na pedra Hijau verde entregue na obra do Tamboré 10.',
            responsavel: 'Marcelo Bittencourt',
            prazo_resolucao: sResolvida2Dias,
            status: 'Resolvida',
            resolucao_desfecho:
              'Visita técnica in loco com reposição imediata das caixas do mesmo lote matriz pelo centro de distribuição.',
            data_resolucao: sResolvida2Dias,
          },
          {
            cliente: c7.id,
            cliente_nome: c7.getString('nome'),
            cliente_telefone: c7.getString('telefone'),
            loja: 'Guarulhos',
            canal_origem: 'Telefone',
            categoria: 'Outro',
            gravidade: 'Baixa',
            descricao:
              'Solicitação de certificado antibacteriano autenticado para o projeto da clínica médica premium.',
            responsavel: 'Renata Zanin',
            prazo_resolucao: sEm4Dias,
            status: 'Aberta',
            resolucao_desfecho: '',
            data_resolucao: '',
          },
        ]

        const recColInstance = app.findCollectionByNameOrId('reclamacoes')
        for (const item of seedReclamacoes) {
          const r = new Record(recColInstance)
          r.set('cliente', item.cliente)
          r.set('cliente_nome', item.cliente_nome)
          r.set('cliente_telefone', item.cliente_telefone)
          r.set('loja', item.loja)
          r.set('canal_origem', item.canal_origem)
          r.set('categoria', item.categoria)
          r.set('gravidade', item.gravidade)
          r.set('descricao', item.descricao)
          r.set('responsavel', item.responsavel)
          r.set('prazo_resolucao', item.prazo_resolucao)
          r.set('status', item.status)
          r.set('resolucao_desfecho', item.resolucao_desfecho)
          r.set('data_resolucao', item.data_resolucao)
          app.save(r)
        }
      }
    }
  },
  (app) => {
    try {
      const rec = app.findCollectionByNameOrId('reclamacoes')
      app.delete(rec)
    } catch (_) {}
  },
)
