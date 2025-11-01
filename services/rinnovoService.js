const { google } = require('googleapis');

class RinnovoService {
  constructor() {
    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  }

  /**
   * Verifica se un socio esiste già tramite codice fiscale
   * Cerca nel foglio "Soci" (iscrizioni originali)
   */
  async verificaSocioEsistente(codiceFiscale) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Soci!A2:T' // Tutte le colonne dei soci
      });

      const rows = response.data.values || [];

      // Cerca il socio per codice fiscale (colonna K = indice 10)
      const socio = rows.find(row => {
        const cf = row[10] ? row[10].toString().trim().toUpperCase() : '';
        return cf === codiceFiscale.trim().toUpperCase();
      });

      if (socio) {
        return {
          exists: true,
          data: {
            timestamp: socio[0] || '',
            nome: socio[1] || '',
            cognome: socio[2] || '',
            email: socio[3] || '',
            natoA: socio[4] || '',
            natoIl: socio[5] || '',
            residenza: socio[6] || '',
            comune: socio[7] || '',
            provincia: socio[8] || '',
            codiceFiscale: socio[10] || '',
            cap: socio[11] || '',
            telefono: socio[12] || ''
          }
        };
      }

      return { exists: false };

    } catch (error) {
      console.error('Errore verifica socio esistente:', error);
      throw error;
    }
  }

  /**
   * Salva il rinnovo nel foglio "Rinnovi"
   */
  async salvaRinnovo(rinnovoData) {
    try {
      // Verifica se il foglio Rinnovi esiste, altrimenti crealo
      await this.creaFoglioRinnoviSeNonEsiste();

      const range = 'Rinnovi!A:S'; // Colonne A-S

      const values = [[
        new Date().toLocaleString('it-IT'), // A: Timestamp rinnovo
        rinnovoData.nome,                   // B: Nome
        rinnovoData.cognome,                // C: Cognome
        rinnovoData.email,                  // D: Email
        rinnovoData.codiceFiscale,          // E: Codice Fiscale
        rinnovoData.consensoPrivacy ? 'Sì' : 'No',        // F: Consenso Privacy
        rinnovoData.consensoSocial ? 'Sì' : 'No',         // G: Consenso Social
        rinnovoData.consensoRegolamento ? 'Sì' : 'No',    // H: Consenso Regolamento
        rinnovoData.consensoNewsletter ? 'Sì' : 'No',     // I: Consenso Newsletter
        rinnovoData.signatureTimestamp || 'N/A',          // J: Timestamp firma
        rinnovoData.signatureHash || 'N/A',               // K: Hash firma
        rinnovoData.documentHash || 'N/A',                // L: Hash documento
        rinnovoData.signatureIP || 'N/A',                 // M: IP firma
        rinnovoData.signatureUserAgent || 'N/A',          // N: User Agent
        rinnovoData.verificationStatus || 'VERIFIED',     // O: Stato verifica
        rinnovoData.hasDigitalSignature ? 'Sì' : 'No',    // P: Firma digitale presente
        rinnovoData.accountCreated ? 'Sì' : 'No',         // Q: Account app creato
        rinnovoData.accountUid || 'N/A',                  // R: UID account
        new Date().getFullYear()                          // S: Anno rinnovo
      ]];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: { values }
      });

      console.log(`✓ Rinnovo salvato per ${rinnovoData.nome} ${rinnovoData.cognome} (CF: ${rinnovoData.codiceFiscale})`);
      return response.data;

    } catch (error) {
      console.error('Errore salvataggio rinnovo:', error);
      throw error;
    }
  }

  /**
   * Crea il foglio Rinnovi se non esiste
   */
  async creaFoglioRinnoviSeNonEsiste() {
    try {
      // Verifica se il foglio esiste già
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      const sheetExists = spreadsheet.data.sheets.some(
        sheet => sheet.properties.title === 'Rinnovi'
      );

      if (sheetExists) {
        return; // Il foglio esiste già
      }

      // Crea il foglio Rinnovi
      console.log('Creazione foglio Rinnovi...');
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: 'Rinnovi',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 20,
                  frozenRowCount: 1 // Congela la prima riga (headers)
                }
              }
            }
          }]
        }
      });

      // Aggiungi gli headers
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Rinnovi!A1:S1',
        valueInputOption: 'RAW',
        resource: {
          values: [[
            'Timestamp Rinnovo',
            'Nome',
            'Cognome',
            'Email',
            'Codice Fiscale',
            'Consenso Privacy',
            'Consenso Social',
            'Consenso Regolamento',
            'Consenso Newsletter',
            'Timestamp Firma',
            'Hash Firma',
            'Hash Documento',
            'IP Firma',
            'User Agent',
            'Stato Verifica',
            'Firma Digitale',
            'Account Creato',
            'Account UID',
            'Anno Rinnovo'
          ]]
        }
      });

      console.log('✓ Foglio Rinnovi creato con successo');

    } catch (error) {
      // Se il foglio esiste già, ignora l'errore
      if (error.message && error.message.includes('already exists')) {
        console.log('Foglio Rinnovi già esistente');
        return;
      }
      console.error('Errore creazione foglio Rinnovi:', error);
      throw error;
    }
  }

  /**
   * Ottieni statistiche rinnovi
   */
  async getStatisticheRinnovi(anno = new Date().getFullYear()) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Rinnovi!A2:Q'
      });

      const rows = response.data.values || [];

      // Filtra per anno
      const rinnoviAnno = rows.filter(row => {
        const annoRinnovo = row[16]; // Colonna Q
        return parseInt(annoRinnovo) === parseInt(anno);
      });

      return {
        totaleRinnovi: rinnoviAnno.length,
        conFirmaDigitale: rinnoviAnno.filter(row => row[13] === 'Sì').length,
        conAccount: rinnoviAnno.filter(row => row[14] === 'Sì').length,
        anno: anno
      };

    } catch (error) {
      console.error('Errore statistiche rinnovi:', error);
      return {
        totaleRinnovi: 0,
        conFirmaDigitale: 0,
        conAccount: 0,
        anno: anno
      };
    }
  }

  /**
   * Verifica se un socio ha già rinnovato quest'anno
   */
  async verificaRinnovoAnnoCorrente(codiceFiscale) {
    try {
      const annoCorrente = new Date().getFullYear();

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Rinnovi!A2:S' // Esteso a colonna S per includere l'anno
      });

      const rows = response.data.values || [];

      // Cerca rinnovi per questo CF nell'anno corrente
      const rinnovoEsistente = rows.find(row => {
        const cf = row[4] ? row[4].toString().trim().toUpperCase() : ''; // Colonna E: CF
        const anno = row[18] ? parseInt(row[18]) : 0; // Colonna S: Anno rinnovo
        return cf === codiceFiscale.trim().toUpperCase() && anno === annoCorrente;
      });

      return {
        haRinnovato: !!rinnovoEsistente,
        dataRinnovo: rinnovoEsistente ? rinnovoEsistente[0] : null
      };

    } catch (error) {
      console.error('Errore verifica rinnovo anno corrente:', error);
      return { haRinnovato: false, dataRinnovo: null };
    }
  }
}

module.exports = new RinnovoService();
