const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rinnovoService = require('../services/rinnovoService');
const emailService = require('../services/emailService');
const signatureLogService = require('../services/signatureLogService');
const firebaseAuthService = require('../services/firebaseAuthService');
const pdfService = require('../services/pdfService');
const documentArchiveService = require('../services/documentArchiveService');

// Validation middleware per rinnovo
const validateRinnovo = [
  body('nome').notEmpty().trim().escape().withMessage('Nome obbligatorio'),
  body('cognome').notEmpty().trim().escape().withMessage('Cognome obbligatorio'),
  body('email').isEmail().withMessage('Email non valida'), // Rimosso normalizeEmail() per mantenere email originale
  body('codiceFiscale').notEmpty().isLength({ min: 16, max: 16 }).toUpperCase().withMessage('Codice fiscale non valido'),
  body('consensoPrivacy').isBoolean().equals('true').withMessage('Devi accettare la privacy'),
  body('consensoSocial').optional().isBoolean(),
  body('signatureDataUrl').optional({ nullable: true, checkFalsy: true })
    .matches(/^data:image\/(png|jpeg|jpg);base64,/).withMessage('Formato firma non valido')
];

/**
 * POST /api/rinnovo/verifica-socio
 * Verifica se un socio esiste già tramite codice fiscale
 */
router.post('/verifica-socio', [
  body('codiceFiscale').notEmpty().isLength({ min: 16, max: 16 }).withMessage('Codice fiscale non valido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { codiceFiscale } = req.body;

    console.log(`🔍 Verifica socio esistente: ${codiceFiscale}`);

    // Verifica se esiste
    const verificaSocio = await rinnovoService.verificaSocioEsistente(codiceFiscale);

    if (!verificaSocio.exists) {
      return res.json({
        success: false,
        message: 'Codice fiscale non trovato. Se sei un nuovo socio, usa il form di prima iscrizione.',
        exists: false
      });
    }

    // Verifica se ha già rinnovato quest'anno
    const verificaRinnovo = await rinnovoService.verificaRinnovoAnnoCorrente(codiceFiscale);

    if (verificaRinnovo.haRinnovato) {
      return res.json({
        success: false,
        message: `Hai già rinnovato l'iscrizione quest'anno in data ${new Date(verificaRinnovo.dataRinnovo).toLocaleDateString('it-IT')}`,
        exists: true,
        alreadyRenewed: true,
        renewalDate: verificaRinnovo.dataRinnovo
      });
    }

    // Socio trovato e non ha ancora rinnovato
    res.json({
      success: true,
      message: 'Socio trovato! Puoi procedere con il rinnovo.',
      exists: true,
      alreadyRenewed: false,
      data: verificaSocio.data
    });

  } catch (error) {
    console.error('❌ Errore verifica socio:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Errore nella verifica del socio',
      details: error.message
    });
  }
});

/**
 * POST /api/rinnovo/submit
 * Gestisce il rinnovo iscrizione
 */
router.post('/submit', validateRinnovo, async (req, res) => {
  try {
    // Controlla errori di validazione
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const rinnovoData = req.body;

    // Cattura metadati per firma elettronica
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    console.log('📝 Elaborazione rinnovo iscrizione...');
    console.log(`   Socio: ${rinnovoData.nome} ${rinnovoData.cognome}`);
    console.log(`   CF: ${rinnovoData.codiceFiscale}`);

    // Verifica che il socio esista
    const verificaSocio = await rinnovoService.verificaSocioEsistente(rinnovoData.codiceFiscale);
    if (!verificaSocio.exists) {
      return res.status(400).json({
        success: false,
        error: 'Codice fiscale non trovato nel database soci'
      });
    }

    // Verifica che non abbia già rinnovato
    const verificaRinnovo = await rinnovoService.verificaRinnovoAnnoCorrente(rinnovoData.codiceFiscale);
    if (verificaRinnovo.haRinnovato) {
      return res.status(400).json({
        success: false,
        error: 'Hai già rinnovato l\'iscrizione quest\'anno'
      });
    }

    // Genera PDF rinnovo
    console.log('📄 Generazione PDF rinnovo...');
    const pdfBuffer = await pdfService.fillRinnovoPdf(rinnovoData);
    console.log('✓ PDF rinnovo generato');

    // Crea log firma elettronica (se presente)
    let signatureLog = null;
    const hasSignature = rinnovoData.signatureDataUrl && rinnovoData.signatureDataUrl !== 'null';

    if (hasSignature) {
      console.log('Creando log firma elettronica per rinnovo...');
      signatureLog = signatureLogService.createSignatureLog({
        formData: rinnovoData,
        signatureDataUrl: rinnovoData.signatureDataUrl,
        pdfBuffer: pdfBuffer,
        ipAddress,
        userAgent
      });

      await signatureLogService.saveLogToFile(signatureLog);
      console.log('✓ Log firma salvato');
    }

    // ========================================
    // CREAZIONE ACCOUNT APP (se richiesto)
    // ========================================
    let accountCreated = false;
    let accountData = null;

    if (rinnovoData.createAppAccount && (rinnovoData.authMethod === 'google' || rinnovoData.authMethod === 'password')) {
      console.log(`📱 Creazione account app con metodo: ${rinnovoData.authMethod}`);

      try {
        accountData = await firebaseAuthService.createAccount({
          authMethod: rinnovoData.authMethod,
          googleIdToken: rinnovoData.googleIdToken,
          password: rinnovoData.appPassword,
          formData: rinnovoData
        });

        accountCreated = true;
        console.log(`✓ Account creato: ${accountData.email} (UID: ${accountData.uid})`);

      } catch (error) {
        console.error('❌ Errore creazione account:', error.message);
        accountCreated = false;
        accountData = { error: error.message };
      }
    }

    // Prepara i dati per il salvataggio
    const dataToSave = {
      ...rinnovoData,
      signatureTimestamp: signatureLog ? signatureLog.signatureTimestamp : null,
      signatureHash: signatureLog ? signatureLog.signatureHash : null,
      documentHash: signatureLog ? signatureLog.documentHash : null,
      signatureIP: signatureLog ? signatureLog.technical.ipAddress : null,
      signatureUserAgent: signatureLog ? signatureLog.technical.userAgent : null,
      hasDigitalSignature: hasSignature,
      accountCreated: accountCreated,
      accountUid: accountCreated ? accountData.uid : null,
      verificationStatus: 'VERIFIED' // Per ora non usiamo double opt-in per i rinnovi
    };

    // Salva il rinnovo su Google Sheets
    console.log('💾 Salvando rinnovo su Google Sheets...');
    await rinnovoService.salvaRinnovo(dataToSave);
    console.log('✓ Rinnovo salvato');

    // Archivia documento PDF
    console.log('📁 Archiviazione PDF rinnovo...');
    await documentArchiveService.archiveDocument({
      pdfBuffer,
      formData: rinnovoData,
      signatureLog,
      verificationData: { status: 'VERIFIED', method: 'renewal' },
      documentType: 'rinnovo' // Specifica che è un rinnovo
    });
    console.log('✓ PDF archiviato');

    // ========================================
    // AGGIORNA CONSENSI SU FIREBASE (sempre, anche se account esiste già)
    // ========================================
    console.log('🔄 Aggiornamento consensi su Firebase...');
    try {
      await firebaseAuthService.updateHandlerConsents(rinnovoData.email, {
        privacy: rinnovoData.consensoPrivacy,
        social: rinnovoData.consensoSocial,
        newsletter: rinnovoData.consensoNewsletter,
        regolamento: rinnovoData.consensoRegolamento
      });
      console.log('✓ Consensi aggiornati su Firebase');
    } catch (error) {
      console.error('⚠️ Errore aggiornamento consensi Firebase (non bloccante):', error.message);
      // Non bloccare il flusso se l'aggiornamento consensi fallisce
    }

    // Invia email di conferma
    console.log('📧 Invio email di conferma rinnovo...');
    await emailService.sendRinnovoEmails(rinnovoData, pdfBuffer, signatureLog);
    console.log('✓ Email inviate');

    // Risposta al client
    res.json({
      success: true,
      message: 'Rinnovo completato con successo!',
      data: {
        documentId: signatureLog ? signatureLog.documentId : 'N/A',
        documentHash: signatureLog ? signatureLog.documentHash : 'N/A',
        signatureTimestamp: signatureLog ? signatureLog.signatureTimestamp : null,
        hasDigitalSignature: hasSignature,
        emailSent: true,
        ...(accountCreated && {
          account: {
            uid: accountData.uid,
            email: accountData.email,
            authMethod: accountData.authMethod
          }
        })
      }
    });

  } catch (error) {
    console.error('❌ Errore nell\'elaborazione del rinnovo:', error);
    console.error('Stack trace completo:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Errore nell\'elaborazione del rinnovo',
      details: error.message
    });
  }
});

/**
 * GET /api/rinnovo/statistiche
 * Ottieni statistiche rinnovi per anno
 */
router.get('/statistiche', async (req, res) => {
  try {
    const anno = req.query.anno || new Date().getFullYear();
    const stats = await rinnovoService.getStatisticheRinnovi(anno);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Errore statistiche rinnovi:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel recupero statistiche',
      details: error.message
    });
  }
});

module.exports = router;
