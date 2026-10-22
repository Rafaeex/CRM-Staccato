migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('follow_ups')
    if (!col.fields.getByName('situacao_atual')) {
      col.fields.add(new TextField({ name: 'situacao_atual' }))
    }
    if (!col.fields.getByName('proximos_passos')) {
      col.fields.add(new TextField({ name: 'proximos_passos' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('follow_ups')
    try {
      const f1 = col.fields.getByName('situacao_atual')
      if (f1) col.fields.removeByName('situacao_atual')
      const f2 = col.fields.getByName('proximos_passos')
      if (f2) col.fields.removeByName('proximos_passos')
      app.save(col)
    } catch (_) {}
  },
)
