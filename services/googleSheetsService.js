const { google } = require('googleapis');

class GoogleSheetsService {
  constructor() {
    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  async appendData(formData) {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    const range = 'Sheet1!A:AK'; // Aggiornato per includere tutte le colonne necessarie
    
    // Prepara i valori nell'ordine corretto
    const values = [[
      new Date().toLocaleString('it-IT'), // Data/ora di registrazione
      
      // Dati personali
      formData.nome,
      formData.cognome,
      formData.email,
      formData.natoA,
      formData.natoIl,
      formData.residenza,
      formData.comune,
      formData.provincia,
      formData.cap,
      formData.codiceFiscale,
      formData.telefono,
      
      // Dati primo cane
      formData.nomeCane1 || '',
      formData.sessoCane1 || '',
      formData.razzaCane1 || '',
      formData.altezzaCane1 || '',
      formData.microchipCane1 || '',
      formData.dataNascitaCane1 || '',
      formData.proprietarioCane1 || '',
      formData.conduttoreCane1 || '',
      
      // Checkbox secondo cane
      formData.aggiungiSecondoCane ? 'Sì' : 'No',
      
      // Dati secondo cane (se presente)
      formData.nomeCane2 || '',
      formData.sessoCane2 || '',
      formData.razzaCane2 || '',
      formData.altezzaCane2 || '',
      formData.microchipCane2 || '',
      formData.dataNascitaCane2 || '',
      formData.proprietarioCane2 || '',
      formData.conduttoreCane2 || '',
      
      // Consenso privacy
 	formData.consensoPrivacy ? 'Checked' : 'Not checked',
	// Consenso social
	formData.consensoSocial ? 'Checked' : 'Not checked'
    ]];
    
    try {
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: { values }
      });
      
      console.log('Dati inseriti nel Google Sheet:', values[0].length, 'colonne');
      return response.data;
    } catch (error) {
      console.error('Errore nell\'inserimento dati in Google Sheets:', error);
      throw error;
    }
  }

  // Metodo helper per creare/aggiornare gli headers nel Google Sheet
  async updateHeaders() {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    const range = 'Sheet1!A1:AK1';
    //const range = 'IscrizioniOnLine!A1:AK1';
    
    const headers = [
      'Data/Ora',
      // Dati personali
      'Nome',
      'Cognome',
      'Email',
      'Nato a',
      'Nato il',
      'Residenza',
      'Comune',
      'Provincia',
      'CAP',
      'Codice Fiscale',
      'Telefono',
      // Primo cane
      'Nome Cane 1',
      'Sesso Cane 1',
      'Razza Cane 1',
      'Altezza Cane 1',
      'Microchip Cane 1',
      'Data Nascita Cane 1',
      'Proprietario Cane 1',
      'Conduttore Cane 1',
      // Checkbox
      'Secondo Cane',
      // Secondo cane
      'Nome Cane 2',
      'Sesso Cane 2',
      'Razza Cane 2',
      'Altezza Cane 2',
      'Microchip Cane 2',
      'Data Nascita Cane 2',
      'Proprietario Cane 2',
      'Conduttore Cane 2',
      // Privacy
      'Consenso Privacy'
    ];
    
    const values = [headers];
    
    try {
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: { values }
      });
      
      console.log('Headers aggiornati nel Google Sheet');
      return response.data;
    } catch (error) {
      console.error('Errore nell\'aggiornamento headers:', error);
      throw error;
    }
  }
}

module.exports = new GoogleSheetsService();