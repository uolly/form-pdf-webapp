require('dotenv').config();
const googleSheetsService = require('./services/googleSheetsService');

async function updateHeaders() {
    try {
        console.log('Aggiornamento headers in corso...');
        await googleSheetsService.updateHeaders();
        console.log('Headers aggiornati con successo!');
    } catch (error) {
        console.error('Errore:', error.message);
    }
}

updateHeaders();