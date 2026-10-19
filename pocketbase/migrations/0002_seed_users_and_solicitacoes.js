migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Usuário rafaelteizen@gmail.com
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'rafaelteizen@gmail.com')
    } catch (_) {
      const record = new Record(users)
      record.setEmail('rafaelteizen@gmail.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Rafael Teizen')
      app.save(record)
    }

    // 2. Usuário de demonstração demo@boutique.com
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'demo@boutique.com')
    } catch (_) {
      const demoRecord = new Record(users)
      demoRecord.setEmail('demo@boutique.com')
      demoRecord.setPassword('demo1234')
      demoRecord.setVerified(true)
      demoRecord.set('name', 'Consultor Boutique')
      app.save(demoRecord)
    }

    // 3. 3 Solicitações de demonstração com status variados
    const solicitacoes = app.findCollectionByNameOrId('solicitacoes')
    const count = app.countRecords('solicitacoes')
    if (count === 0) {
      const samples = [
        {
          cliente_nome: 'Mariana Alcantara',
          telefone: '(11) 98452-1134',
          email: 'mariana.alcantara@email.com',
          servico: 'Projeto de Revestimentos',
          loja: 'Vila Olímpia (SP)',
          data_preferida: '2025-04-10',
          horario_preferido: '10:30',
          mensagem:
            'Estou reformando apartamento de 240m² e busco porcelanatos de grandes formatos para living e varanda gourmet.',
          status: 'Pendente',
        },
        {
          cliente_nome: 'Eduardo Vasconcellos',
          telefone: '(11) 97120-4498',
          email: 'eduardo.arq@design.com.br',
          servico: 'Assessoria para Profissionais',
          loja: 'Higienópolis (SP)',
          data_preferida: '2025-04-12',
          horario_preferido: '14:00',
          mensagem:
            'Sou arquiteto e preciso especificar mármores especiais e metais escovados para casa de alto padrão em condomínio.',
          status: 'Confirmado',
        },
        {
          cliente_nome: 'Beatriz Nogueira',
          telefone: '(11) 99633-8821',
          email: 'beatriz.nogueira@terra.com.br',
          servico: 'Amostras em Domicílio',
          loja: 'Alphaville (Barueri)',
          data_preferida: '2025-04-15',
          horario_preferido: '11:00',
          mensagem:
            'Gostaria de avaliar na iluminação da minha residência três opções de revestimentos acetinados para suítes.',
          status: 'Concluído',
        },
      ]

      for (const data of samples) {
        const rec = new Record(solicitacoes)
        rec.set('cliente_nome', data.cliente_nome)
        rec.set('telefone', data.telefone)
        rec.set('email', data.email)
        rec.set('servico', data.servico)
        rec.set('loja', data.loja)
        rec.set('data_preferida', data.data_preferida)
        rec.set('horario_preferido', data.horario_preferido)
        rec.set('mensagem', data.mensagem)
        rec.set('status', data.status)
        app.save(rec)
      }
    }
  },
  (app) => {
    // rollback opcional
  },
)
