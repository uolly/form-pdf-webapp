const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const ricevuteService = require('../services/ricevuteService');
const pdfRicevuteService = require('../services/pdfRicevuteService');
const emailService = require('../services/emailService');

// Validation middleware
const validateRicevuta = [
  body('numeroRicevuta').isInt({ min: 1 }).withMessage('Numero ricevuta non valido'),
  body('dataRicevuta').isISO8601().withMessage('Data non valida'),
  body('ricevutoDa').notEmpty().trim().escape().withMessage('Nome pagante obbligatorio'),
  body('emailPagante').isEmail().normalizeEmail().withMessage('Email non valida'),
  body('ricevutaPer').notEmpty().trim().withMessage('Causale obbligatoria'),
  body('modalitaPagamento').isIn(['contanti', 'bonifico', 'pos', 'paypal']).withMessage('Modalità pagamento non valida'),
  body('educatoreTecnico').notEmpty().trim().escape().withMessage('Educatore/tecnico obbligatorio'),
  body('denaroRicevuto').isFloat({ min: 0 }).withMessage('Importo non valido')
];

// GET /api/ricevute/init - Ottieni dati iniziali
router.get('/init', async (req, res) => {
  try {
    // Ottieni ultimo numero ricevuta
    const ultimoNumero = await ricevuteService.getUltimoNumero();
    
    // Ottieni lista contatti per autocompletamento
    const contatti = await ricevuteService.getContatti();
    
    res.json({
      success: true,
      ultimoNumero,
      contatti
    });
  } catch (error) {
    console.error('Errore init ricevute:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel caricamento dati iniziali'
    });
  }
});

// POST /api/ricevute/submit - Genera ricevuta
router.post('/submit', validateRicevuta, async (req, res) => {
  try {
    // Controlla errori di validazione
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const ricevutaData = req.body;
    const inviaRicevuta = ricevutaData.inviaRicevuta !== false; // Default true se non specificato

    // Se la checkbox "INVIA RICEVUTA" NON è spuntata
    if (!inviaRicevuta) {
      console.log('Modalità senza ricevuta - salvando solo dati educatore e cassa b...');

      // Salva nel foglio dell'educatore
      await ricevuteService.SalvaIstruttore(ricevutaData);

      // Se è contanti, salva solo in "Cassa b" (non in "Cassa")
      if (ricevutaData.modalitaPagamento.toLowerCase() === 'contanti') {
        await ricevuteService.salvaNellaCassaB(ricevutaData);
      }

      console.log('Dati salvati senza generare ricevuta');

      return res.json({
        success: true,
        message: 'Dati salvati con successo (nessuna ricevuta generata)',
        data: {
          inviaRicevuta: false
        }
      });
    }

    // Se la checkbox "INVIA RICEVUTA" è spuntata (comportamento originale)
    console.log('Modalità con ricevuta - elaborazione completa...');

    // 1. Aggiorna numero progressivo
    await ricevuteService.aggiornaNumeroProgressivo(ricevutaData.numeroRicevuta);

    // 2. Genera PDF
    console.log('Generando PDF ricevuta...');
    const pdfData = {
      numeroRicevuta: ricevutaData.numeroRicevuta.toString(),
      dataRicevuta: ricevutaData.dataRicevuta,
      ricevutoDa: ricevutaData.ricevutoDa,
      ricevutaPer: ricevutaData.ricevutaPer,
      denaroRicevuto: `€ ${parseFloat(ricevutaData.denaroRicevuto).toFixed(2)}`
    };

    const pdfBuffer = await pdfRicevuteService.fillRicevuta(pdfData);
    console.log('PDF ricevuta generato');

    // 3. Salva su Google Sheets (include Ricevute, Cassa se contanti, e foglio educatore)
    console.log('Salvando su Google Sheets...');
    const sheetResult = await ricevuteService.salvaRicevuta(ricevutaData);
    console.log('Salvato su Google Sheets');

    // 4. Invia email
    console.log('Invio email...');
    const emailResult = await emailService.sendRicevutaEmails(ricevutaData, pdfBuffer);
    console.log('Email inviate');

    res.json({
      success: true,
      message: 'Ricevuta emessa con successo',
      data: {
        numeroRicevuta: ricevutaData.numeroRicevuta,
        emailSent: emailResult.success,
        inviaRicevuta: true
      }
    });

  } catch (error) {
    console.error('Errore nell\'emissione ricevuta:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nell\'emissione della ricevuta',
      details: error.message
    });
  }
});

module.exports = router;