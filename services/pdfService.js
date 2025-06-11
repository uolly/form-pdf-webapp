const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

class PdfService {
  async fillPdf(formData) {
    try {
      // Carica il PDF template
      const pdfPath = path.join(__dirname, '../templates/iscrizione.pdf');
      const existingPdfBytes = await fs.readFile(pdfPath);
      
      // Carica il documento PDF
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      // Ottieni il form del PDF
      const form = pdfDoc.getForm();
      
      // Funzione helper per riempire campo se esiste
      const fillFieldIfExists = (fieldName, value) => {
        try {
          if (value !== undefined && value !== null && value !== '') {
            const field = form.getTextField(fieldName);
            field.setText(String(value));
          }
        } catch (e) {
          console.log(`Campo ${fieldName} non trovato nel PDF`);
        }
      };
      
      // Funzione helper per checkbox
      const checkFieldIfExists = (fieldName, value) => {
        try {
          if (value === true || value === 'true' || value === 'Checked') {
            const field = form.getCheckBox(fieldName);
            field.check();
          }
        } catch (e) {
          console.log(`Checkbox ${fieldName} non trovata nel PDF`);
        }
      };
      
      // Funzione helper per formattare le date
      const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT');
      };
      
      // Compila i campi del form - Dati personali
      fillFieldIfExists('nome', formData.nome);
      fillFieldIfExists('cognome', formData.cognome);
      fillFieldIfExists('email', formData.email);
      fillFieldIfExists('natoA', formData.natoA);
      fillFieldIfExists('natoIl', formatDate(formData.natoIl));
      fillFieldIfExists('residenza', formData.residenza);
      fillFieldIfExists('comune', formData.comune);
      fillFieldIfExists('provincia', formData.provincia);
      fillFieldIfExists('cap', formData.cap);
      fillFieldIfExists('codiceFiscale', formData.codiceFiscale);
      fillFieldIfExists('telefono', formData.telefono);
      
      // Compila i campi del primo cane
      fillFieldIfExists('nomeCane1', formData.nomeCane1);
      fillFieldIfExists('sessoCane1', formData.sessoCane1);
      fillFieldIfExists('razzaCane1', formData.razzaCane1);
      fillFieldIfExists('altezzaCane1', formData.altezzaCane1);
      fillFieldIfExists('microchipCane1', formData.microchipCane1);
      fillFieldIfExists('dataNascitaCane1', formatDate(formData.dataNascitaCane1));
      fillFieldIfExists('proprietarioCane1', formData.proprietarioCane1);
      fillFieldIfExists('conduttoreCane1', formData.conduttoreCane1);
      
      // Compila i campi del secondo cane (se presente)
      if (formData.aggiungiSecondoCane) {
        fillFieldIfExists('nomeCane2', formData.nomeCane2);
        fillFieldIfExists('sessoCane2', formData.sessoCane2);
        fillFieldIfExists('razzaCane2', formData.razzaCane2);
        fillFieldIfExists('altezzaCane2', formData.altezzaCane2);
        fillFieldIfExists('microchipCane2', formData.microchipCane2);
        fillFieldIfExists('dataNascitaCane2', formatDate(formData.dataNascitaCane2));
        fillFieldIfExists('proprietarioCane2', formData.proprietarioCane2);
        fillFieldIfExists('conduttoreCane2', formData.conduttoreCane2);
      }
      
      // Gestisci checkbox privacy
      checkFieldIfExists('consensoPrivacy', formData.consensoPrivacy);
      checkFieldIfExists('consensoSocial', formData.consensoSocial);
      // Opzionale: Aggiungi data di compilazione se c'è un campo per questo
      fillFieldIfExists('dataCompilazione', new Date().toLocaleDateString('it-IT'));
      
      // Appiattisci il form per renderlo non modificabile (opzionale)
      form.flatten();
      
      // Salva il PDF modificato
      const pdfBytes = await pdfDoc.save();
      
      // Opzionale: Salva una copia locale per debug
      if (process.env.NODE_ENV === 'development') {
        const debugPath = path.join(__dirname, '../templates/debug_compilato.pdf');
        await fs.writeFile(debugPath, pdfBytes);
        console.log('PDF di debug salvato in:', debugPath);
      }
      
      return Buffer.from(pdfBytes);
      
    } catch (error) {
      console.error('Errore nella compilazione del PDF:', error);
      
      // Se il PDF non ha campi form, proviamo il metodo alternativo
      if (error.message.includes('form') || error.message.includes('field')) {
        console.log('Il PDF non ha campi form, uso il metodo di scrittura diretta...');
        return this.fillPdfWithText(formData);
      }
      
      throw error;
    }
  }
  
  // Metodo alternativo per PDF senza campi form
  async fillPdfWithText(formData) {
    try {
      const pdfPath = path.join(__dirname, '../templates/modulo_iscrizione.pdf');
      const existingPdfBytes = await fs.readFile(pdfPath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      // Qui dovrai definire manualmente le coordinate
      // Questo è un esempio - dovrai adattare le coordinate al tuo PDF
      const fields = {
        nome: { x: 150, y: 700, value: formData.nome },
        cognome: { x: 350, y: 700, value: formData.cognome },
        email: { x: 150, y: 670, value: formData.email },
        // ... aggiungi tutti gli altri campi con le coordinate corrette
      };
      
      // Scrivi i campi
      Object.entries(fields).forEach(([key, field]) => {
        if (field.value) {
          firstPage.drawText(String(field.value), {
            x: field.x,
            y: field.y,
            size: 10,
            font: helveticaFont,
            color: rgb(0, 0, 0)
          });
        }
      });
      
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      console.error('Errore nel metodo alternativo:', error);
      throw error;
    }
  }
}

module.exports = new PdfService();