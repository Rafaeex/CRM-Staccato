/// <reference path="../pb_data/types.d.ts" />

// Sincroniza cache somente-leitura de cliente_nome e cliente_telefone
// a partir da relação cliente em reclamacoes e follow_ups.
onRecordCreate(
  (e) => {
    try {
      const colName = e.record.collection().name
      if (colName === 'reclamacoes' || colName === 'follow_ups') {
        const clienteId = e.record.getString('cliente')
        if (clienteId) {
          const clienteRec = $app.findRecordById('clientes', clienteId)
          if (clienteRec) {
            e.record.set('cliente_nome', clienteRec.getString('nome'))
            e.record.set('cliente_telefone', clienteRec.getString('telefone'))
          }
        }
      }
    } catch (err) {
      console.log('Erro no hook de sincronização de cliente (create):', err)
    }
    e.next()
  },
  'reclamacoes',
  'follow_ups',
)

onRecordUpdate(
  (e) => {
    try {
      const colName = e.record.collection().name
      if (colName === 'reclamacoes' || colName === 'follow_ups') {
        const clienteId = e.record.getString('cliente')
        if (clienteId) {
          const clienteRec = $app.findRecordById('clientes', clienteId)
          if (clienteRec) {
            e.record.set('cliente_nome', clienteRec.getString('nome'))
            e.record.set('cliente_telefone', clienteRec.getString('telefone'))
          }
        }
      }
    } catch (err) {
      console.log('Erro no hook de sincronização de cliente (update):', err)
    }
    e.next()
  },
  'reclamacoes',
  'follow_ups',
)
