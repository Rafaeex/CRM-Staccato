migrate(
  (app) => {
    const kanbanCol = app.findCollectionByNameOrId('kanban_cartoes')

    // 1. Atualizar campo 'coluna' com os valores das 9 colunas do Trello SAC + retrocompatibilidade
    // 'NOVOS', 'EM TRATAMENTO', 'RETORNO DA LOJA', 'ANALISE DIRETORIA', 'A PAGAR', 'COMPRAS', 'AT', 'COLETA/ENTREGA', 'RESOLVIDO'
    // Mantemos os antigos temporariamente no select para permitir atualização dos registros
    const colunaField = kanbanCol.fields.getByName('coluna')
    if (colunaField) {
      colunaField.values = [
        'NOVOS',
        'EM TRATAMENTO',
        'RETORNO DA LOJA',
        'ANALISE DIRETORIA',
        'A PAGAR',
        'COMPRAS',
        'AT',
        'COLETA/ENTREGA',
        'RESOLVIDO',
        // Legados para suportar migração
        'A fazer',
        'Fazendo hoje',
        'Aguardando cliente',
        'Resolvido',
      ]
    }

    // 2. Adicionar campo 'comentarios_json' se ainda não existir
    if (!kanbanCol.fields.getByName('comentarios_json')) {
      kanbanCol.fields.add(
        new TextField({
          name: 'comentarios_json',
          required: false,
        }),
      )
    }

    // 3. Adicionar campo 'etiquetas_json' para suportar tags do Trello no cartão
    if (!kanbanCol.fields.getByName('etiquetas_json')) {
      kanbanCol.fields.add(
        new TextField({
          name: 'etiquetas_json',
          required: false,
        }),
      )
    }

    app.save(kanbanCol)

    // 4. Mapear e atualizar registros antigos de 'coluna' para o novo padrão SAC
    // 'A fazer' -> 'NOVOS'
    // 'Fazendo hoje' -> 'EM TRATAMENTO'
    // 'Aguardando cliente' -> 'RETORNO DA LOJA'
    // 'Resolvido' -> 'RESOLVIDO'
    app
      .db()
      .newQuery(`UPDATE kanban_cartoes SET coluna = 'NOVOS' WHERE coluna = 'A fazer'`)
      .execute()

    app
      .db()
      .newQuery(`UPDATE kanban_cartoes SET coluna = 'EM TRATAMENTO' WHERE coluna = 'Fazendo hoje'`)
      .execute()

    app
      .db()
      .newQuery(
        `UPDATE kanban_cartoes SET coluna = 'RETORNO DA LOJA' WHERE coluna = 'Aguardando cliente'`,
      )
      .execute()

    app
      .db()
      .newQuery(`UPDATE kanban_cartoes SET coluna = 'RESOLVIDO' WHERE coluna = 'Resolvido'`)
      .execute()

    // 5. Adicionar comentários de exemplo aos cartões existentes para demonstrar badges
    const records = app.findRecordsByFilter('kanban_cartoes', '', 'created', 10, 0)
    for (let i = 0; i < records.length; i++) {
      const rec = records[i]
      const comentsRaw = rec.getString('comentarios_json')
      if (!comentsRaw || comentsRaw === '[]' || comentsRaw === '') {
        const seedComentarios = []
        if (i === 0) {
          seedComentarios.push({
            id: 'c1',
            autor: 'Aline (SAC)',
            texto: 'Amostras de Calacatta entregues na obra. Aguardando validação do arquiteto.',
            data: new Date().toISOString(),
          })
          seedComentarios.push({
            id: 'c2',
            autor: 'Ricardo (Logística)',
            texto: 'Motorista confirmou descarga sem avarias no sábado.',
            data: new Date().toISOString(),
          })
        } else if (i === 1) {
          seedComentarios.push({
            id: 'c3',
            autor: 'Helena Martins',
            texto: 'Kit separado no CD de Higienópolis com catálogo.',
            data: new Date().toISOString(),
          })
        }
        if (seedComentarios.length > 0) {
          rec.set('comentarios_json', JSON.stringify(seedComentarios))
          app.save(rec)
        }
      }
    }
  },
  (app) => {
    // Reverter caso necessário
    const kanbanCol = app.findCollectionByNameOrId('kanban_cartoes')
    const colunaField = kanbanCol.fields.getByName('coluna')
    if (colunaField) {
      colunaField.values = ['A fazer', 'Fazendo hoje', 'Aguardando cliente', 'Resolvido']
    }
    app.save(kanbanCol)
  },
)
