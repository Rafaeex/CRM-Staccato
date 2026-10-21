migrate(
  (app) => {
    // 1. Atualizar users auth collection com suporte ao role 'comercial'
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const roleField = usersCol.fields.getByName('role')
    if (roleField) {
      roleField.values = ['gestor', 'atendente', 'comercial']
    } else {
      usersCol.fields.add(
        new SelectField({
          name: 'role',
          required: false,
          values: ['gestor', 'atendente', 'comercial'],
          maxSelect: 1,
        }),
      )
    }
    app.save(usersCol)

    // Criar usuário comercial de demonstração comercial@boutique.com / comercial1234
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'comercial@boutique.com')
    } catch (_) {
      const comRec = new Record(usersCol)
      comRec.setEmail('comercial@boutique.com')
      comRec.setPassword('comercial1234')
      comRec.setVerified(true)
      comRec.set('name', 'Lucas Pinheiro (Comercial)')
      comRec.set('role', 'comercial')
      comRec.set('loja', 'Higienópolis (SP)')
      app.save(comRec)
    }

    // 2. Criar coleção 'quebras_boem' com base no modelo do Trello
    const clientesColId = app.findCollectionByNameOrId('clientes').id
    let quebrasCol
    try {
      quebrasCol = app.findCollectionByNameOrId('quebras_boem')
    } catch (_) {
      quebrasCol = new Collection({
        name: 'quebras_boem',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'numero_pedido', type: 'text', required: true },
          { name: 'nf_saida', type: 'text', required: false },
          {
            name: 'cliente',
            type: 'relation',
            required: false,
            collectionId: clientesColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'cliente_nome', type: 'text', required: true },
          { name: 'loja', type: 'text', required: true },
          { name: 'produtos_envolvidos', type: 'text', required: false },
          {
            name: 'responsabilidade_apurada',
            type: 'select',
            required: false,
            values: [
              'Transportadora',
              'Fábrica / Fornecedor',
              'Armazém / Expedição',
              'Cliente / Obra',
              'Instalação / Assentamento',
              'Em apuração',
            ],
            maxSelect: 1,
          },
          { name: 'acao_adotada', type: 'text', required: false },
          {
            name: 'resultado_boem',
            type: 'select',
            required: false,
            values: [
              'Pendente',
              'Procedente (Reposição Autorizada)',
              'Procedente (Reembolso / Crédito)',
              'Improcedente',
              'Acordo Comercial',
            ],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['Registro', 'Em análise', 'Resolvida'],
            maxSelect: 1,
          },
          { name: 'responsavel', type: 'text', required: false },
          { name: 'data_ocorrencia', type: 'text', required: false },
          { name: 'data_resolucao', type: 'text', required: false },
          { name: 'descricao_detalhada', type: 'text', required: false },
          { name: 'origem_trello_id', type: 'text', required: false },
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
          'CREATE INDEX idx_quebras_pedido ON quebras_boem (numero_pedido)',
          'CREATE INDEX idx_quebras_cliente ON quebras_boem (cliente)',
          'CREATE INDEX idx_quebras_loja ON quebras_boem (loja)',
          'CREATE INDEX idx_quebras_status ON quebras_boem (status)',
          'CREATE INDEX idx_quebras_resp ON quebras_boem (responsabilidade_apurada)',
        ],
      })
      app.save(quebrasCol)
    }

    // 3. Semear dados demonstrativos realistas de Quebras & BOEM
    const countQuebras = app.countRecords('quebras_boem')
    if (countQuebras === 0) {
      const clientesList = app.findRecordsByFilter('clientes', '', '-created', 10, 0)
      const c1 = clientesList[0] // Mariana Alcantara
      const c2 = clientesList[1] || c1 // Eduardo Vasconcellos
      const c3 = clientesList[2] || c1 // Beatriz Nogueira
      const c4 = clientesList[3] || c1 // Carlos Eduardo Fontes
      const c5 = clientesList[4] || c2 // Fernanda Albuquerque

      const hoje = new Date().toISOString().split('T')[0]

      const seedQuebras = [
        {
          numero_pedido: 'VILA-104920',
          nf_saida: 'NF-048291',
          cliente: c1 ? c1.id : '',
          cliente_nome: c1 ? c1.getString('nome') : 'Mariana Alcantara',
          loja: 'Vila Olímpia (SP)',
          produtos_envolvidos: 'Porcelanato Calacatta Oro 120x240cm - 4 lâminas',
          responsabilidade_apurada: 'Transportadora',
          acao_adotada:
            'Abertura de BOEM de avaria na descarga. Vistoria fotográfica aprovada e solicitada reposição urgente com a fábrica.',
          resultado_boem: 'Procedente (Reposição Autorizada)',
          status: 'Em análise',
          responsavel: 'Rafael Teizen',
          data_ocorrencia: hoje,
          data_resolucao: '',
          descricao_detalhada:
            'Caixa 3 de 6 chegou com trinca longitudinal na ponta superior durante a descarga pela transportadora Expresso Cargas.',
        },
        {
          numero_pedido: 'HIG-092811',
          nf_saida: 'NF-047910',
          cliente: c2 ? c2.id : '',
          cliente_nome: c2 ? c2.getString('nome') : 'Eduardo Vasconcellos',
          loja: 'Higienópolis (SP)',
          produtos_envolvidos: 'Mosaico Travertino Romano Bruto 30x30cm (12 m²)',
          responsabilidade_apurada: 'Em apuração',
          acao_adotada:
            'Coleta de fotos in loco na obra pelo consultor técnico e envio de laudo para o departamento de qualidade.',
          resultado_boem: 'Pendente',
          status: 'Registro',
          responsavel: 'Lucas Pinheiro (Comercial)',
          data_ocorrencia: hoje,
          data_resolucao: '',
          descricao_detalhada:
            'Cliente reportou que ao abrir 5 caixas na obra no Pacaembu, 8 peças apresentavam quebra na quina.',
        },
        {
          numero_pedido: 'ALPH-081432',
          nf_saida: 'NF-046102',
          cliente: c3 ? c3.id : '',
          cliente_nome: c3 ? c3.getString('nome') : 'Beatriz Nogueira',
          loja: 'Alphaville (Barueri)',
          produtos_envolvidos: 'Borda Atérmica Peito de Pombo 50x50cm (30 peças)',
          responsabilidade_apurada: 'Fábrica / Fornecedor',
          acao_adotada:
            'Peças repostas diretamente do estoque central da fábrica para o endereço da obra com frete expresso.',
          resultado_boem: 'Procedente (Reposição Autorizada)',
          status: 'Resolvida',
          responsavel: 'Camila Duarte',
          data_ocorrencia: '2026-10-10',
          data_resolucao: '2026-10-15',
          descricao_detalhada:
            'Lote entregue com fissura térmica de cura de fábrica. Troca de 6 peças concluída e conferida pelo arquiteto.',
        },
        {
          numero_pedido: 'MOE-110245',
          nf_saida: 'NF-049015',
          cliente: c4 ? c4.id : '',
          cliente_nome: c4 ? c4.getString('nome') : 'Carlos Eduardo Fontes',
          loja: 'Moema (SP)',
          produtos_envolvidos: 'Porcelanato Ripado Noce 20x120cm (8 caixas)',
          responsabilidade_apurada: 'Armazém / Expedição',
          acao_adotada:
            'Identificado paletização inadequada no CD. Emitida nota de crédito e enviado novo pallet com proteção reforçada.',
          resultado_boem: 'Procedente (Reembolso / Crédito)',
          status: 'Resolvida',
          responsavel: 'Ricardo Salles',
          data_ocorrencia: '2026-10-12',
          data_resolucao: '2026-10-16',
          descricao_detalhada:
            'Quebra de encaixe macho/fêmea nas pontas devido à amarração com cinta excessiva no armazém.',
        },
        {
          numero_pedido: 'TAT-120554',
          nf_saida: 'NF-049880',
          cliente: c5 ? c5.id : '',
          cliente_nome: c5 ? c5.getString('nome') : 'Fernanda Albuquerque',
          loja: 'Tatuapé (SP)',
          produtos_envolvidos: 'Cuba Esculpida em Quartzito Mont Blanc (1 unidade)',
          responsabilidade_apurada: 'Instalação / Assentamento',
          acao_adotada:
            'Marmoraria parceira enviou técnico restaurador na residência com cola epóxi especial e polimento fino.',
          resultado_boem: 'Acordo Comercial',
          status: 'Resolvida',
          responsavel: 'Patrícia Prado',
          data_ocorrencia: '2026-10-08',
          data_resolucao: '2026-10-14',
          descricao_detalhada:
            'Pequena lasca ocorrida no momento da fixação da válvula oculta pelos instaladores do cliente.',
        },
      ]

      const quebrasInstance = app.findCollectionByNameOrId('quebras_boem')
      for (const item of seedQuebras) {
        const r = new Record(quebrasInstance)
        r.set('numero_pedido', item.numero_pedido)
        r.set('nf_saida', item.nf_saida)
        r.set('cliente', item.cliente)
        r.set('cliente_nome', item.cliente_nome)
        r.set('loja', item.loja)
        r.set('produtos_envolvidos', item.produtos_envolvidos)
        r.set('responsabilidade_apurada', item.responsabilidade_apurada)
        r.set('acao_adotada', item.acao_adotada)
        r.set('resultado_boem', item.resultado_boem)
        r.set('status', item.status)
        r.set('responsavel', item.responsavel)
        r.set('data_ocorrencia', item.data_ocorrencia)
        r.set('data_resolucao', item.data_resolucao)
        r.set('descricao_detalhada', item.descricao_detalhada)
        app.save(r)
      }
    }

    // 4. Atualizar as ferramentas do Agente de IA para consultar a coleção 'quebras_boem'
    try {
      $ai.agents.putTools(app, 'crm-followup-assistant', [
        { collection: 'quebras_boem', perms: { read: true, list: true } },
      ])
    } catch (_) {}
  },
  (app) => {
    try {
      const q = app.findCollectionByNameOrId('quebras_boem')
      app.delete(q)
    } catch (_) {}
    try {
      const u = app.findAuthRecordByEmail('_pb_users_auth_', 'comercial@boutique.com')
      app.delete(u)
    } catch (_) {}
  },
)
