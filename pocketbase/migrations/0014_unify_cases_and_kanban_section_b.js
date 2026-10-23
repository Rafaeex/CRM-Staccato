migrate(
  (app) => {
    // teste de migração básica
    const recCol = app.findCollectionByNameOrId('reclamacoes')
    if (!recCol.fields.getByName('codigo')) {
      recCol.fields.add(
        new TextField({
          name: 'codigo',
          required: false,
        }),
      )
      app.save(recCol)
    }
  },
  (app) => {},
)
