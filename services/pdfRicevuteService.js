const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

class PdfRicevuteService {
  async fillRicevuta(ricevutaData) {
    try {
      // Carica il PDF template
      const pdfPath = path.join(__dirname, '../templates/ricevuta.pdf');
      const existingPdfBytes = await fs.readFile(pdfPath);
      
      // Carica il documento PDF
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      // Ottieni il form del PDF
      const form = pdfDoc.getForm();
      
      // Mappa dei campi nel PDF
      const campiRicevuta = {
        'numeroRicevuta': ricevutaData.numeroRicevuta,
        'dataRicevuta': this.formatDate(ricevutaData.dataRicevuta),
        'ricevutoDa': ricevutaData.ricevutoDa,
        'ricevutaPer': ricevutaData.ricevutaPer,
        'denaroRicevuto': ricevutaData.denaroRicevuto
      };
      
      // Compila i campi
      for (const [fieldName, value] of Object.entries(campiRicevuta)) {
        try {
          const field = form.getTextField(fieldName);
          if (field && value) {
            field.setText(String(value));
          }
        } catch (e) {
          console.log(`Campo ${fieldName} non trovato nel PDF:`, e.message);
        }
      }
      
      // Appiattisci il form per renderlo non modificabile
      form.flatten();
      
      // Salva il PDF modificato
      const pdfBytes = await pdfDoc.save();
      
      // Debug: salva una copia locale in development
      if (process.env.NODE_ENV !== 'production') {
        const debugPath = path.join(__dirname, '../templates/debug_ricevuta.pdf');
        await fs.writeFile(debugPath, pdfBytes);
        console.log('PDF ricevuta di debug salvato in:', debugPath);
      }
      
      return Buffer.from(pdfBytes);
      
    } catch (error) {
      console.error('Errore nella compilazione del PDF ricevuta:', error);
      throw error;
    }
  }
  
  // Formatta la data in formato italiano
  formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  }
}

module.exports = new PdfRicevuteService();