const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

class PdfService {
  
  /**
   * Decodifica le entità HTML nei testi
   * @param {string} text - Testo da decodificare
   * @returns {string} - Testo decodificato
   */
  decodeHtmlEntities(text) {
    if (!text || typeof text !== 'string') return text;
    
    const htmlEntities = {
      '&#x27;': "'",
      '&#39;': "'",
      '&#x2F;': "/",
      '&#47;': "/",
      '&lt;': '<',
      '&gt;': '>',
      '&amp;': '&',
      '&quot;': '"',
      '&apos;': "'",
      '&agrave;': 'à',
      '&egrave;': 'è',
      '&igrave;': 'ì',
      '&ograve;': 'ò',
      '&ugrave;': 'ù',
      '&Agrave;': 'À',
      '&Egrave;': 'È',
      '&Igrave;': 'Ì',
      '&Ograve;': 'Ò',
      '&Ugrave;': 'Ù',
      '&eacute;': 'é',
      '&iacute;': 'í',
      '&oacute;': 'ó',
      '&uacute;': 'ú',
      '&Eacute;': 'É',
      '&Iacute;': 'Í',
      '&Oacute;': 'Ó',
      '&Uacute;': 'Ú'
    };
    
    let decodedText = text;
    
    // Sostituisci entità HTML specifiche
    Object.keys(htmlEntities).forEach(entity => {
      const regex = new RegExp(entity, 'g');
      decodedText = decodedText.replace(regex, htmlEntities[entity]);
    });
    
    // Gestisci anche entità numeriche generiche (&#xxx;)
    decodedText = decodedText.replace(/&#(\d+);/g, (match, dec) => {
      return String.fromCharCode(dec);
    });
    
    // Gestisci entità esadecimali (&#xHH;)
    decodedText = decodedText.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
    
    return decodedText;
  }

  /**
   * Pulisce tutti i campi di testo di un oggetto dalle entità HTML
   * @param {Object} data - Oggetto con i dati da pulire
   * @returns {Object} - Oggetto con dati puliti
   */
  cleanFormData(data) {
    const cleanedData = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        cleanedData[key] = this.decodeHtmlEntities(value);
      } else {
        cleanedData[key] = value;
      }
    }
    
    return cleanedData;
  }

  async fillPdf(formData) {
    try {
      // PULISCI I DATI PRIMA DI USARLI
      const cleanData = this.cleanFormData(formData);
      
      console.log('Dati originali:', {
        residenza: formData.residenza,
        natoA: formData.natoA
      });
      console.log('Dati puliti:', {
        residenza: cleanData.residenza,
        natoA: cleanData.natoA
      });
      
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
            // Usa i dati puliti e assicurati che non ci siano caratteri problematici
            const cleanValue = this.decodeHtmlEntities(String(value));
            field.setText(cleanValue);
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
      
      // Compila i campi del form - Dati personali (usa cleanData)
      fillFieldIfExists('nome', cleanData.nome);
      fillFieldIfExists('cognome', cleanData.cognome);
      fillFieldIfExists('email', cleanData.email);
      fillFieldIfExists('natoA', cleanData.natoA);
      fillFieldIfExists('natoIl', formatDate(cleanData.natoIl));
      fillFieldIfExists('residenza', cleanData.residenza);
      fillFieldIfExists('comune', cleanData.comune);
      fillFieldIfExists('provincia', cleanData.provincia);
      fillFieldIfExists('cap', cleanData.cap);
      fillFieldIfExists('codiceFiscale', cleanData.codiceFiscale);
      fillFieldIfExists('telefono', cleanData.telefono);
      
      // Compila i campi del primo cane
      fillFieldIfExists('nomeCane1', cleanData.nomeCane1);
      fillFieldIfExists('sessoCane1', cleanData.sessoCane1);
      fillFieldIfExists('razzaCane1', cleanData.razzaCane1);
      fillFieldIfExists('altezzaCane1', cleanData.altezzaCane1);
      fillFieldIfExists('microchipCane1', cleanData.microchipCane1);
      fillFieldIfExists('dataNascitaCane1', formatDate(cleanData.dataNascitaCane1));
      fillFieldIfExists('proprietarioCane1', cleanData.proprietarioCane1);
      fillFieldIfExists('conduttoreCane1', cleanData.conduttoreCane1);
      
      // Compila i campi del secondo cane (se presente)
      if (cleanData.aggiungiSecondoCane) {
        fillFieldIfExists('nomeCane2', cleanData.nomeCane2);
        fillFieldIfExists('sessoCane2', cleanData.sessoCane2);
        fillFieldIfExists('razzaCane2', cleanData.razzaCane2);
        fillFieldIfExists('altezzaCane2', cleanData.altezzaCane2);
        fillFieldIfExists('microchipCane2', cleanData.microchipCane2);
        fillFieldIfExists('dataNascitaCane2', formatDate(cleanData.dataNascitaCane2));
        fillFieldIfExists('proprietarioCane2', cleanData.proprietarioCane2);
        fillFieldIfExists('conduttoreCane2', cleanData.conduttoreCane2);
      }
      
      // Gestisci checkbox privacy
      checkFieldIfExists('consensoPrivacy', cleanData.consensoPrivacy);
      checkFieldIfExists('consensoSocial', cleanData.consensoSocial);
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
      // PULISCI I DATI ANCHE QUI
      const cleanData = this.cleanFormData(formData);
      
      const pdfPath = path.join(__dirname, '../templates/modulo_iscrizione.pdf');
      const existingPdfBytes = await fs.readFile(pdfPath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      // Qui dovrai definire manualmente le coordinate
      // Questo è un esempio - dovrai adattare le coordinate al tuo PDF
      const fields = {
        nome: { x: 150, y: 700, value: cleanData.nome },
        cognome: { x: 350, y: 700, value: cleanData.cognome },
        email: { x: 150, y: 670, value: cleanData.email },
        residenza: { x: 150, y: 640, value: cleanData.residenza },
        natoA: { x: 150, y: 610, value: cleanData.natoA },
        // ... aggiungi tutti gli altri campi con le coordinate corrette
      };
      
      // Scrivi i campi (usa dati puliti)
      Object.entries(fields).forEach(([key, field]) => {
        if (field.value) {
          const cleanValue = this.decodeHtmlEntities(String(field.value));
          firstPage.drawText(cleanValue, {
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