migrate(
  (app) => {
    // 1. Seed Lojas (as 7 lojas reais)
    const lojasCol = app.findCollectionByNameOrId('lojas')
    const lojasCount = app.countRecords('lojas')
    if (lojasCount === 0) {
      const lojasSeed = [
        {
          nome: 'Vila Olímpia (SP)',
          slug: 'vila-olimpia',
          cidade: 'São Paulo',
          bairro: 'Vila Olímpia',
          endereco: 'Rua Funchal, 418 — Vila Olímpia, São Paulo - SP',
          telefone: '(11) 3044-8900',
          whatsapp: '5511984521134',
          gerente: 'André Ramos',
        },
        {
          nome: 'Higienópolis (SP)',
          slug: 'higienopolis',
          cidade: 'São Paulo',
          bairro: 'Higienópolis',
          endereco: 'Av. Higienópolis, 618 — Higienópolis, São Paulo - SP',
          telefone: '(11) 3825-7200',
          whatsapp: '5511971204498',
          gerente: 'Helena Martins',
        },
        {
          nome: 'Moema (SP)',
          slug: 'moema',
          cidade: 'São Paulo',
          bairro: 'Moema',
          endereco: 'Av. Moema, 310 — Moema, São Paulo - SP',
          telefone: '(11) 5051-6400',
          whatsapp: '5511988992200',
          gerente: 'Ricardo Salles',
        },
        {
          nome: 'Tatuapé (SP)',
          slug: 'tatuape',
          cidade: 'São Paulo',
          bairro: 'Tatuapé',
          endereco: 'Rua Emílio Mallet, 875 — Tatuapé, São Paulo - SP',
          telefone: '(11) 2092-4100',
          whatsapp: '5511977663311',
          gerente: 'Patrícia Prado',
        },
        {
          nome: 'Alphaville (Barueri)',
          slug: 'alphaville',
          cidade: 'Barueri',
          bairro: 'Alphaville',
          endereco: 'Al. Rio Negro, 1030 — Alphaville, Barueri - SP',
          telefone: '(11) 4195-2300',
          whatsapp: '5511996338821',
          gerente: 'Camila Duarte',
        },
        {
          nome: 'Santana de Parnaíba',
          slug: 'santana-de-parnaiba',
          cidade: 'Santana de Parnaíba',
          bairro: 'Tamboré',
          endereco: 'Av. Marcos Penteado de Ulhôa Rodrigues, 3800 — Santana de Parnaíba - SP',
          telefone: '(11) 4153-8800',
          whatsapp: '5511985551234',
          gerente: 'Marcelo Bittencourt',
        },
        {
          nome: 'Guarulhos',
          slug: 'guarulhos',
          cidade: 'Guarulhos',
          bairro: 'Bosque Maia',
          endereco: 'Av. Paulo Faccini, 1420 — Bosque Maia, Guarulhos - SP',
          telefone: '(11) 2440-9700',
          whatsapp: '5511973335544',
          gerente: 'Renata Zanin',
        },
      ]

      for (const l of lojasSeed) {
        const r = new Record(lojasCol)
        r.set('nome', l.nome)
        r.set('slug', l.slug)
        r.set('cidade', l.cidade)
        r.set('bairro', l.bairro)
        r.set('endereco', l.endereco)
        r.set('telefone', l.telefone)
        r.set('whatsapp', l.whatsapp)
        r.set('gerente', l.gerente)
        app.save(r)
      }
    }

    // 2. Clientes Realistas
    const clientesCol = app.findCollectionByNameOrId('clientes')
    const clientesCount = app.countRecords('clientes')
    let clientesRecords = []

    if (clientesCount === 0) {
      const clientesSeed = [
        {
          nome: 'Mariana Alcantara',
          telefone: '11984521134',
          email: 'mariana.alcantara@email.com',
          loja_origem: 'Vila Olímpia (SP)',
          etapa_funil: 'Em atendimento',
          interesse_principal: 'Porcelanatos grandes formatos 120x240cm e cubas esculpidas',
          arquiteto_parceiro: 'Studio Arthur Casas',
          cidade: 'São Paulo',
          notas_internas:
            'Apartamento de 280m² no Itaim Bibi. Gosta de tons acinzentados e acabamento acetinado.',
        },
        {
          nome: 'Eduardo Vasconcellos',
          telefone: '11971204498',
          email: 'eduardo.arq@design.com.br',
          loja_origem: 'Higienópolis (SP)',
          etapa_funil: 'Proposta enviada',
          interesse_principal: 'Mármores nobres (Calacatta) e Metais escovados Champagne',
          arquiteto_parceiro: 'Eduardo Vasconcellos Arquitetura',
          cidade: 'São Paulo',
          notas_internas:
            'Especificação para residência de alto padrão no Pacaembu. Orçamento em aprovação com o proprietário.',
        },
        {
          nome: 'Beatriz Nogueira',
          telefone: '11996338821',
          email: 'beatriz.nogueira@terra.com.br',
          loja_origem: 'Alphaville (Barueri)',
          etapa_funil: 'Cliente fechado',
          interesse_principal: 'Revestimentos para área externa atérmicos e deck em porcelanato',
          arquiteto_parceiro: 'Fernanda Marques Interiores',
          cidade: 'Barueri',
          notas_internas:
            'Pedido aprovado para residência no Residencial 2. Agendar entrega técnica para o próximo mês.',
        },
        {
          nome: 'Carlos Eduardo Fontes',
          telefone: '11988992200',
          email: 'carlos.fontes@invest.com.br',
          loja_origem: 'Moema (SP)',
          etapa_funil: 'Em atendimento',
          interesse_principal: 'Porcelanato madeira ripada e revestimentos 3D',
          arquiteto_parceiro: 'Carolina Maluhy',
          cidade: 'São Paulo',
          notas_internas:
            'Reforma cobertura duplex em Moema Pássaros. Quer ver paginação em 3D antes de decidir.',
        },
        {
          nome: 'Fernanda Albuquerque',
          telefone: '11977663311',
          email: 'fernanda.albuquerque@gmail.com',
          loja_origem: 'Tatuapé (SP)',
          etapa_funil: 'Lead',
          interesse_principal: 'Bancadas de quartzo e metais dourados foscos',
          arquiteto_parceiro: '',
          cidade: 'São Paulo',
          notas_internas:
            'Entrou pelo contato de WhatsApp interessada em trocar os metais e pedras dos 4 banheiros.',
        },
        {
          nome: 'Rodrigo Mendonça',
          telefone: '11985551234',
          email: 'rodrigo.mendonca@agrocorp.com.br',
          loja_origem: 'Santana de Parnaíba',
          etapa_funil: 'Proposta enviada',
          interesse_principal: 'Pedras naturais Hijau e pisos para borda infinita',
          arquiteto_parceiro: 'Guilherme Torres',
          cidade: 'Santana de Parnaíba',
          notas_internas: 'Casa em construção no Tamboré 10. Proposta enviada de R$ 94.000,00.',
        },
        {
          nome: 'Juliana Pires',
          telefone: '11973335544',
          email: 'juliana.pires@clinica.com.br',
          loja_origem: 'Guarulhos',
          etapa_funil: 'Em atendimento',
          interesse_principal: 'Porcelanatos antibacterianos e metais sensorizados',
          arquiteto_parceiro: 'Studio MK27',
          cidade: 'Guarulhos',
          notas_internas: 'Projeto comercial de clínica médica premium perto do Bosque Maia.',
        },
      ]

      for (const c of clientesSeed) {
        const r = new Record(clientesCol)
        r.set('nome', c.nome)
        r.set('telefone', c.telefone)
        r.set('email', c.email)
        r.set('loja_origem', c.loja_origem)
        r.set('etapa_funil', c.etapa_funil)
        r.set('interesse_principal', c.interesse_principal)
        r.set('arquiteto_parceiro', c.arquiteto_parceiro)
        r.set('cidade', c.cidade)
        r.set('notas_internas', c.notas_internas)
        app.save(r)
        clientesRecords.push(r)
      }
    } else {
      clientesRecords = app.findRecordsByFilter('clientes', '', '-created', 10, 0)
    }

    // 3. Atendimentos Realistas
    const atendimentosCol = app.findCollectionByNameOrId('atendimentos')
    const atendimentosCount = app.countRecords('atendimentos')
    const hojeStr = new Date().toISOString().split('T')[0]

    if (atendimentosCount === 0 && clientesRecords.length >= 3) {
      const c1 = clientesRecords[0]
      const c2 = clientesRecords[1]
      const c3 = clientesRecords[2]
      const c4 = clientesRecords[3] || c1
      const c6 = clientesRecords[5] || c2

      const atendimentosSeed = [
        {
          cliente: c1.id,
          cliente_nome: c1.getString('nome'),
          loja: 'Vila Olímpia (SP)',
          responsavel: 'André Ramos',
          canal: 'Presencial',
          data_atendimento: hojeStr,
          horario: '10:30',
          interesse: 'Porcelanatos Grandes Formatos e Cubas',
          resumo:
            'Visita na sala de especificações da Vila Olímpia. Apresentadas opções em 120x240 da linha Calacatta e Sahara Noir.',
          status: 'Em negociação',
          valor_estimado: 45000,
        },
        {
          cliente: c2.id,
          cliente_nome: c2.getString('nome'),
          loja: 'Higienópolis (SP)',
          responsavel: 'Helena Martins',
          canal: 'Reunião Online',
          data_atendimento: hojeStr,
          horario: '14:00',
          interesse: 'Mármores Nobres e Metais Escovados',
          resumo:
            'Alinhamento com o arquiteto sobre quantitativo de soleiras e metais champagne para os banhos das suítes.',
          status: 'Em negociação',
          valor_estimado: 78000,
        },
        {
          cliente: c3.id,
          cliente_nome: c3.getString('nome'),
          loja: 'Alphaville (Barueri)',
          responsavel: 'Camila Duarte',
          canal: 'Presencial',
          data_atendimento: hojeStr,
          horario: '16:00',
          interesse: 'Pisos Atérmicos e Decks',
          resumo:
            'Fechamento do pedido com assinatura do memorial descritivo e agendamento da medição conferencial in loco.',
          status: 'Fechado',
          valor_estimado: 62000,
        },
        {
          cliente: c4.id,
          cliente_nome: c4.getString('nome'),
          loja: 'Moema (SP)',
          responsavel: 'Ricardo Salles',
          canal: 'WhatsApp',
          data_atendimento: hojeStr,
          horario: '11:15',
          interesse: 'Porcelanato Ripada Madeira',
          resumo:
            'Envio de catálogo digital e fotos em alta resolução de paginação aplicada em obra semelhante.',
          status: 'Aberto',
          valor_estimado: 32000,
        },
        {
          cliente: c6.id,
          cliente_nome: c6.getString('nome'),
          loja: 'Santana de Parnaíba',
          responsavel: 'Marcelo Bittencourt',
          canal: 'Presencial',
          data_atendimento: hojeStr,
          horario: '15:30',
          interesse: 'Pedra Hijau para Piscina',
          resumo:
            'Cliente visitou o showroom de Santana de Parnaíba para ver o painel molhado com iluminação subaquática.',
          status: 'Em negociação',
          valor_estimado: 94000,
        },
      ]

      for (const a of atendimentosSeed) {
        const r = new Record(atendimentosCol)
        r.set('cliente', a.cliente)
        r.set('cliente_nome', a.cliente_nome)
        r.set('loja', a.loja)
        r.set('responsavel', a.responsavel)
        r.set('canal', a.canal)
        r.set('data_atendimento', a.data_atendimento)
        r.set('horario', a.horario)
        r.set('interesse', a.interesse)
        r.set('resumo', a.resumo)
        r.set('status', a.status)
        r.set('valor_estimado', a.valor_estimado)
        app.save(r)
      }
    }

    // 4. Follow-ups Realistas
    const followUpsCol = app.findCollectionByNameOrId('follow_ups')
    const followUpsCount = app.countRecords('follow_ups')

    if (followUpsCount === 0 && clientesRecords.length >= 3) {
      const c1 = clientesRecords[0]
      const c2 = clientesRecords[1]
      const c4 = clientesRecords[3] || c1
      const c5 = clientesRecords[4] || c2
      const c6 = clientesRecords[5] || c1

      const followUpsSeed = [
        {
          cliente: c1.id,
          cliente_nome: c1.getString('nome'),
          cliente_telefone: c1.getString('telefone'),
          loja: 'Vila Olímpia (SP)',
          responsavel: 'André Ramos',
          canal: 'WhatsApp',
          data_prevista: hojeStr,
          horario_previsto: '15:00',
          assunto: 'Confirmar aprovação das amostras de porcelanato 120x240cm',
          mensagem_sugerida:
            'Olá Mariana, aqui é o André da Boutique Vila Olímpia. Conseguiram avaliar as amostras de 120x240 na luz do apartamento com o arquiteto?',
          status: 'Pendente',
        },
        {
          cliente: c2.id,
          cliente_nome: c2.getString('nome'),
          cliente_telefone: c2.getString('telefone'),
          loja: 'Higienópolis (SP)',
          responsavel: 'Helena Martins',
          canal: 'Telefone',
          data_prevista: hojeStr,
          horario_previsto: '17:00',
          assunto: 'Retorno sobre a proposta comercial dos mármores Calacatta',
          mensagem_sugerida:
            'Olá Eduardo, boa tarde! Gostaria de verificar se houve retorno do proprietário sobre a proposta enviada na terça-feira.',
          status: 'Pendente',
        },
        {
          cliente: c4.id,
          cliente_nome: c4.getString('nome'),
          cliente_telefone: c4.getString('telefone'),
          loja: 'Moema (SP)',
          responsavel: 'Ricardo Salles',
          canal: 'WhatsApp',
          data_prevista: hojeStr,
          horario_previsto: '11:30',
          assunto: 'Enviar simulação 3D de paginação madeira ripada',
          mensagem_sugerida:
            'Olá Carlos, Ricardo da Boutique Moema. Finalizamos o render da paginação com a madeira ripada para sua cobertura. Posso enviar o PDF?',
          status: 'Pendente',
        },
        {
          cliente: c5.id,
          cliente_nome: c5.getString('nome'),
          cliente_telefone: c5.getString('telefone'),
          loja: 'Tatuapé (SP)',
          responsavel: 'Patrícia Prado',
          canal: 'WhatsApp',
          data_prevista: hojeStr,
          horario_previsto: '14:30',
          assunto: 'Agendar visita ao showroom para escolha dos metais dourados',
          mensagem_sugerida:
            'Olá Fernanda! Temos os novos mostradores de metais dourados foscos na loja Tatuapé. Qual dia ficaria melhor para você tomar um café conosco?',
          status: 'Pendente',
        },
        {
          cliente: c6.id,
          cliente_nome: c6.getString('nome'),
          cliente_telefone: c6.getString('telefone'),
          loja: 'Santana de Parnaíba',
          responsavel: 'Marcelo Bittencourt',
          canal: 'WhatsApp',
          data_prevista: hojeStr,
          horario_previsto: '18:00',
          assunto: 'Confirmar recebimento do laudo técnico da pedra Hijau',
          mensagem_sugerida:
            'Olá Rodrigo, Marcelo da Boutique Santana de Parnaíba. Segue o certificado de resistência ao cloro e laudo de atérmica da Hijau conforme combinamos.',
          status: 'Pendente',
        },
      ]

      for (const fu of followUpsSeed) {
        const r = new Record(followUpsCol)
        r.set('cliente', fu.cliente)
        r.set('cliente_nome', fu.cliente_nome)
        r.set('cliente_telefone', fu.cliente_telefone)
        r.set('loja', fu.loja)
        r.set('responsavel', fu.responsavel)
        r.set('canal', fu.canal)
        r.set('data_prevista', fu.data_prevista)
        r.set('horario_previsto', fu.horario_previsto)
        r.set('assunto', fu.assunto)
        r.set('mensagem_sugerida', fu.mensagem_sugerida)
        r.set('status', fu.status)
        app.save(r)
      }
    }
  },
  (app) => {
    // rollback opcional
  },
)
