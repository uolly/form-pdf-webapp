const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const googleSheetsService = require('../services/googleSheetsService');
const pdfService = require('../services/pdfService');
const emailService = require('../services/emailService');

// Validation middleware aggiornata
const validateForm = [
  // Dati personali - tutti obbligatori
  body('nome').notEmpty().trim().escape().withMessage('Nome obbligatorio'),
  body('cognome').notEmpty().trim().escape().withMessage('Cognome obbligatorio'),
  body('email').isEmail().normalizeEmail().withMessage('Email non valida'),
  body('natoA').notEmpty().trim().escape().withMessage('Luogo di nascita obbligatorio'),
  body('natoIl').notEmpty().isISO8601().withMessage('Data di nascita non valida'),
  body('residenza').notEmpty().trim().escape().withMessage('Residenza obbligatoria'),
  body('comune').notEmpty().trim().escape().withMessage('Comune obbligatorio'),
  body('provincia').notEmpty().isLength({ min: 2, max: 2 }).isAlpha().toUpperCase().withMessage('Provincia non valida (2 lettere)'),
  body('cap').notEmpty().isPostalCode('IT').withMessage('CAP non valido'),
  body('codiceFiscale').notEmpty().isLength({ min: 16, max: 16 }).toUpperCase().withMessage('Codice fiscale non valido'),
  body('consensoSocial').optional().isBoolean(),
  body('telefono').notEmpty().withMessage('Numero di telefono obbligatorio'),
  
  // Dati primo cane - tutti facoltativi
  body('nomeCane1').optional({ checkFalsy: true }).trim().escape(),
  body('sessoCane1').optional({ checkFalsy: true }).isIn(['M', 'F', '']),
  body('razzaCane1').optional({ checkFalsy: true }).trim().escape(),
  body('altezzaCane1').optional({ checkFalsy: true }).isInt({ min: 1, max: 200 }),
  body('microchipCane1').optional({ checkFalsy: true }).trim().escape(),
  body('dataNascitaCane1').optional({ checkFalsy: true }).isISO8601(),
  body('proprietarioCane1').optional({ checkFalsy: true }).trim().escape(),
  body('conduttoreCane1').optional({ checkFalsy: true }).trim().escape(),
  
  // Dati secondo cane - tutti facoltativi
  body('nomeCane2').optional({ checkFalsy: true }).trim().escape(),
  body('sessoCane2').optional({ checkFalsy: true }).isIn(['M', 'F', '']),
  body('razzaCane2').optional({ checkFalsy: true }).trim().escape(),
  body('altezzaCane2').optional({ checkFalsy: true }).isInt({ min: 1, max: 200 }),
  body('microchipCane2').optional({ checkFalsy: true }).trim().escape(),
  body('dataNascitaCane2').optional({ checkFalsy: true }).isISO8601(),
  body('proprietarioCane2').optional({ checkFalsy: true }).trim().escape(),
  body('conduttoreCane2').optional({ checkFalsy: true }).trim().escape(),
  
  // Checkbox
  body('aggiungiSecondoCane').isBoolean(),
  body('consensoPrivacy').isBoolean().equals('true').withMessage('Devi accettare la privacy')
];

router.post('/submit', validateForm, async (req, res) => {
  try {
    // Controlla errori di validazione
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const formData = req.body;
    
    // 1. Salva su Google Sheets
    console.log('Salvando su Google Sheets...');
    const sheetResult = await googleSheetsService.appendData(formData);
    console.log('Salvato su Google Sheets');
    
    // 2. Genera PDF compilato
    console.log('Generando PDF...');
    const pdfBuffer = await pdfService.fillPdf(formData);
    console.log('PDF generato');
    
    // 3. Invia email con PDF allegato (commentato per ora)
     console.log('Inviando email...');
     const emailResult = await emailService.sendFormEmail(formData, pdfBuffer);
     console.log('Email inviata');
    
   res.json({
  success: true,
  message: 'Form elaborato con successo',
  data: {
    sheetId: sheetResult.spreadsheetId,
    emailSent: emailResult.accepted.length > 0
  }
});
    
  } catch (error) {
    console.error('Errore nell\'elaborazione del form:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nell\'elaborazione del form',
      details: error.message
    });
  }
});

module.exports = router;