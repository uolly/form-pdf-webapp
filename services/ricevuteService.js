const { google } = require('googleapis');

class RicevuteService {
  constructor() {
    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    //this.spreadsheetId = process.env.GOOGLE_SHEETS_RICEVUTE_ID || process.env.GOOGLE_SHEETS_ID;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_RICEVUTE_ID
    this.spreadsheetContattiID =  process.env.GOOGLE_SHEETS_ID

   
  }

  // Ottieni ultimo numero ricevuta
  async getUltimoNumero() {
    try {
      // Leggi dalla cella specifica dove salviamo l'ultimo numero
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Impostazioni!B1' // Foglio Impostazioni, cella B1
      });
      
      const value = response.data.values?.[0]?.[0];
      return parseInt(value) || 0;
    } catch (error) {
      console.log('Primo accesso o errore lettura ultimo numero:', error.message);
      // Se non esiste, crea il foglio Impostazioni
      await this.creaFoglioImpostazioni();
      return 0;
    }
  }

  // Aggiorna numero progressivo
  async aggiornaNumeroProgressivo(numero) {
    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Impostazioni!B1',
        valueInputOption: 'RAW',
        resource: {
          values: [[numero]]
        }
      });
    } catch (error) {
      console.error('Errore aggiornamento numero progressivo:', error);
      throw error;
    }
  }

// Ottieni lista contatti per autocompletamento
async getContatti() {
  try {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetContattiID,
      range: 'Soci!B2:D' // Colonne: Nome, Cognome, Email
    });
    
    const rows = response.data.values || [];
    return rows.map(row => ({
      nome: row[0] || '',        // Colonna B = Nome
      cognome: row[1] || '',     // Colonna C = Cognome  
      email: row[2] || ''        // Colonna D = Email
    })).filter(c => c.email && c.nome); // Solo contatti con email e nome
    
  } catch (error) {
    console.log('Errore lettura contatti:', error.message);
    // Se non esiste il foglio contatti, ritorna array vuoto
    return [];
  }
}

  // Salva ricevuta nel registro
  async salvaRicevuta(ricevutaData) {
    const range = 'Ricevute!A:K'; // Foglio principale ricevute
    
    const values = [[
      new Date().toLocaleString('it-IT'), // Timestamp
      ricevutaData.numeroRicevuta,
      ricevutaData.dataRicevuta,
      ricevutaData.ricevutoDa,
      ricevutaData.emailPagante,
      ricevutaData.ricevutaPer,
      ricevutaData.modalitaPagamento,
      ricevutaData.educatoreTecnico,
      parseFloat(ricevutaData.denaroRicevuto).toFixed(2),
      'Emessa', // Stato
      `Ricevuta n. ${ricevutaData.numeroRicevuta}` // Note
    ]];
    
    try {
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: { values }
      });
      
      return response.data;
    } catch (error) {
      // Se il foglio non esiste, crealo
      if (error.message.includes('Unable to parse range')) {
        await this.creaStrutturaFogli();
        // Riprova
        return this.salvaRicevuta(ricevutaData);
      }
      throw error;
    }
  }

  // Crea struttura fogli se non esiste
  async creaStrutturaFogli() {
    try {
      // Crea foglio Impostazioni
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Impostazioni',
                  gridProperties: { rowCount: 10, columnCount: 5 }
                }
              }
            },
            {
              addSheet: {
                properties: {
                  title: 'Ricevute',
                  gridProperties: { rowCount: 1000, columnCount: 15 }
                }
              }
            },
            {
              addSheet: {
                properties: {
                  title: 'Contatti',
                  gridProperties: { rowCount: 1000, columnCount: 10 }
                }
              }
            }
          ]
        }
      });
      
      // Aggiungi headers
      await this.aggiungiHeaders();
      
    } catch (error) {
      console.log('Fogli già esistenti o errore creazione:', error.message);
    }
  }

  async creaFoglioImpostazioni() {
    try {
      // Aggiungi foglio Impostazioni se non esiste
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: 'Impostazioni',
                gridProperties: { rowCount: 10, columnCount: 5 }
              }
            }
          }]
        }
      });
      
      // Aggiungi intestazione
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Impostazioni!A1:B1',
        valueInputOption: 'RAW',
        resource: {
          values: [['Ultimo Numero Ricevuta', '0']]
        }
      });
    } catch (error) {
      console.log('Foglio Impostazioni già esistente');
    }
  }

  async aggiungiHeaders() {
    // Headers per foglio Ricevute
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: 'Ricevute!A1:K1',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          'Data/Ora Emissione',
          'Numero',
          'Data Ricevuta',
          'Ricevuto Da',
          'Email',
          'Causale',
          'Modalità Pagamento',
          'Educatore/Tecnico',
          'Importo (€)',
          'Stato',
          'Note'
        ]]
      }
    });
    
    // Headers per foglio Contatti
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: 'Contatti!A1:C1',
      valueInputOption: 'RAW',
      resource: {
        values: [['Email', 'Nome', 'Cognome']]
      }
    });
    
    // Setup iniziale Impostazioni
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: 'Impostazioni!A1:B1',
      valueInputOption: 'RAW',
      resource: {
        values: [['Ultimo Numero Ricevuta', '0']]
      }
    });
  }
}

module.exports = new RicevuteService();