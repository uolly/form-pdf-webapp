const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const googleSheetsService = require('../services/googleSheetsService');
const pdfService = require('../services/pdfService');
const emailService = require('../services/emailService');
const signatureLogService = require('../services/signatureLogService');
const verificationService = require('../services/verificationService');
const documentArchiveService = require('../services/documentArchiveService');
const firebaseAuthService = require('../services/firebaseAuthService');

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
  body('consensoPrivacy').isBoolean().equals('true').withMessage('Devi accettare la privacy'),

  // Firma elettronica (opzionale)
  body('signatureDataUrl').optional({ nullable: true, checkFalsy: true })
    .matches(/^data:image\/(png|jpeg|jpg);base64,/).withMessage('Formato firma non valido')
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

    // Cattura metadati per firma elettronica (GDPR compliant)
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    console.log('📝 Elaborazione form con firma elettronica...');

    // 1. Genera PDF compilato (con o senza firma)
    const hasSignature = formData.signatureDataUrl && formData.signatureDataUrl !== 'null';
    console.log(`Generando PDF ${hasSignature ? 'con firma elettronica' : 'senza firma (da firmare a mano)'}...`);
    const pdfBuffer = await pdfService.fillPdf(formData);
    console.log(`✓ PDF generato ${hasSignature ? 'con firma' : 'senza firma'}`);

    // 2. Crea log firma elettronica (solo se presente)
    let signatureLog = null;
    if (hasSignature) {
      console.log('Creando log firma elettronica...');
      signatureLog = signatureLogService.createSignatureLog({
        formData,
        signatureDataUrl: formData.signatureDataUrl,
        pdfBuffer,
        ipAddress,
        userAgent
      });

      // 3. Salva log firma su file (backup locale)
      await signatureLogService.saveLogToFile(signatureLog);
    } else {
      console.log('⚠️ Nessuna firma digitale - documento da firmare a mano');
    }

    // ========================================
    // CREAZIONE ACCOUNT APP (se richiesto)
    // ========================================
    let accountCreated = false;
    let accountData = null;

    console.log('🔍 Debug creazione account:', {
      createAppAccount: formData.createAppAccount,
      authMethod: formData.authMethod,
      hasGoogleToken: !!formData.googleIdToken,
      hasPassword: !!formData.appPassword
    });

    if (formData.createAppAccount && (formData.authMethod === 'google' || formData.authMethod === 'password')) {
      console.log(`📱 Creazione account app con metodo: ${formData.authMethod}`);

      try {
        accountData = await firebaseAuthService.createAccount({
          authMethod: formData.authMethod,
          googleIdToken: formData.googleIdToken,
          password: formData.appPassword,
          formData: formData
        });

        accountCreated = true;
        console.log(`✓ Account creato: ${accountData.email} (UID: ${accountData.uid})`);

      } catch (error) {
        console.error('❌ Errore creazione account:', error.message);
        console.error('Stack trace:', error.stack);
        // Non bloccare l'iscrizione se la creazione account fallisce
        accountCreated = false;
        accountData = { error: error.message };
      }
    } else {
      console.log('⏭️ Creazione account saltata');
    }

    // 4. Controlla se double opt-in è abilitato
    const doubleOptInEnabled = process.env.ENABLE_DOUBLE_OPTIN !== 'false'; // Default: true

    if (doubleOptInEnabled) {
      // MODALITÀ DOUBLE OPT-IN
      console.log('📧 Generando token verifica email (double opt-in)...');
      const verificationToken = verificationService.generateVerificationToken(formData);

      await verificationService.saveVerificationToken(verificationToken, {
        formData,
        signatureDataUrl: formData.signatureDataUrl,
        ipAddress,
        userAgent
      });

      const baseUrl = process.env.APP_URL || 'https://form-pdf-webapp.onrender.com';
      const verificationUrl = verificationService.generateVerificationUrl(verificationToken, baseUrl);

      // Invia email di verifica (NO PDF allegato ancora)
      console.log('📧 Invio email verifica...');
      const verificationEmail = verificationService.generateVerificationEmail(formData, verificationUrl);

      await emailService.sendEmail({
        from: `"Agility Club Labora" <${process.env.EMAIL_FROM}>`,
        to: formData.email,
        subject: '🔐 Conferma la tua email - Agility Club Labora',
        html: verificationEmail
      });

      // Salva su Google Sheets con status PENDING
      const sheetData = {
        ...formData,
        signatureTimestamp: signatureLog ? signatureLog.signatureTimestamp : 'N/A (no digital signature)',
        signatureHash: signatureLog ? signatureLog.signatureHash : 'N/A',
        documentHash: signatureLog ? signatureLog.documentHash : 'N/A',
        signatureIP: signatureLog ? signatureLog.technical.ipAddress : 'N/A',
        signatureUserAgent: signatureLog ? signatureLog.technical.userAgent : 'N/A',
        verificationStatus: 'PENDING',
        verificationToken: verificationToken.substring(0, 16) + '...'
      };

      console.log('Salvando su Google Sheets (status: PENDING)...');
      await googleSheetsService.appendData(sheetData);
      console.log('✓ Salvato su Google Sheets');

      // Archivia documento (status pending)
      console.log('📁 Archiviazione documento (pending verification)...');
      await documentArchiveService.archiveDocument({
        pdfBuffer,
        formData,
        signatureLog,
        verificationData: null // Non ancora verificato
      });

      // Risposta al client
      res.json({
        success: true,
        message: 'Iscrizione ricevuta. Controlla la tua email per confermare.',
        requiresVerification: true,
        accountCreated: accountCreated,
        data: {
          documentId: signatureLog ? signatureLog.documentId : 'N/A',
          documentHash: signatureLog ? signatureLog.documentHash : 'N/A',
          signatureTimestamp: signatureLog ? signatureLog.signatureTimestamp : null,
          hasDigitalSignature: hasSignature,
          verificationSent: true,
          verificationEmail: formData.email,
          ...(accountCreated && {
            account: {
              uid: accountData.uid,
              email: accountData.email,
              authMethod: accountData.authMethod
            }
          })
        }
      });

    } else {
      // MODALITÀ INVIO IMMEDIATO (senza double opt-in)
      console.log('📧 Double opt-in disabilitato - invio immediato email con PDF');

      // Invia email immediatamente (con PDF, signature log e account data)
      const emailResult = await emailService.sendFormEmail(formData, pdfBuffer, signatureLog, accountCreated ? accountData : null);
      console.log('✓ Email inviate agli amministratori e utente');

      // Salva su Google Sheets con status VERIFIED
      const sheetData = {
        ...formData,
        signatureTimestamp: signatureLog ? signatureLog.signatureTimestamp : 'N/A (no digital signature)',
        signatureHash: signatureLog ? signatureLog.signatureHash : 'N/A',
        documentHash: signatureLog ? signatureLog.documentHash : 'N/A',
        signatureIP: signatureLog ? signatureLog.technical.ipAddress : 'N/A',
        signatureUserAgent: signatureLog ? signatureLog.technical.userAgent : 'N/A',
        verificationStatus: 'VERIFIED',
        verificationToken: 'N/A (double opt-in disabled)'
      };

      console.log('Salvando su Google Sheets (status: VERIFIED)...');
      await googleSheetsService.appendData(sheetData);
      console.log('✓ Salvato su Google Sheets');

      // Archivia documento (già verificato)
      console.log('📁 Archiviazione documento (verified immediately)...');
      await documentArchiveService.archiveDocument({
        pdfBuffer,
        formData,
        signatureLog,
        verificationData: {
          verifiedAt: new Date().toISOString(),
          method: 'immediate'
        }
      });

      // Risposta al client
      res.json({
        success: true,
        message: 'Iscrizione completata con successo. Riceverai una email di conferma.',
        requiresVerification: false,
        accountCreated: accountCreated,
        data: {
          documentId: signatureLog ? signatureLog.documentId : 'N/A',
          documentHash: signatureLog ? signatureLog.documentHash : 'N/A',
          signatureTimestamp: signatureLog ? signatureLog.signatureTimestamp : null,
          hasDigitalSignature: hasSignature,
          emailSent: true,
          adminEmails: emailResult.accepted,
          ...(accountCreated && {
            account: {
              uid: accountData.uid,
              email: accountData.email,
              authMethod: accountData.authMethod
            }
          })
        }
      });
    }

  } catch (error) {
    console.error('❌ Errore nell\'elaborazione del form:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nell\'elaborazione del form',
      details: error.message
    });
  }
});

// ============================================
// ROUTE VERIFICA EMAIL (Double Opt-in)
// ============================================
router.get('/verify-email', [
  query('token').notEmpty().withMessage('Token richiesto')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(`
        <html><body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1 style="color: #dc3545;">❌ Token mancante</h1>
          <p>Il link di verifica non è valido.</p>
        </body></html>
      `);
    }

    const { token } = req.query;

    console.log(`📧 Verifica token: ${token.substring(0, 16)}...`);

    // Verifica token
    const verification = await verificationService.verifyToken(token);

    if (!verification.valid) {
      return res.status(400).send(`
        <html><body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1 style="color: #dc3545;">❌ ${verification.error}</h1>
          <p>Il link potrebbe essere scaduto o già utilizzato.</p>
          <p>Contatta <a href="mailto:laboratrieste@gmail.com">laboratrieste@gmail.com</a> per assistenza.</p>
        </body></html>
      `);
    }

    const tokenData = verification.data;

    // Marca token come verificato
    await verificationService.markTokenAsVerified(token);

    // Rigenera PDF e firma
    const pdfBuffer = await pdfService.fillPdf(tokenData.formData);

    // Crea signature log
    const signatureLog = signatureLogService.createSignatureLog({
      formData: tokenData.formData,
      signatureDataUrl: tokenData.signatureDataUrl,
      pdfBuffer,
      ipAddress: tokenData.ipAddress,
      userAgent: tokenData.userAgent
    });

    // Aggiorna archivio con verifica completata
    await documentArchiveService.archiveDocument({
      pdfBuffer,
      formData: tokenData.formData,
      signatureLog,
      verificationData: {
        verified: true,
        verifiedAt: new Date().toISOString(),
        token: token.substring(0, 16)
      }
    });

    // Invia email FINALE con PDF agli admin e utente
    console.log('📧 Invio email conferma con PDF...');
    await emailService.sendFormEmail(tokenData.formData, pdfBuffer, signatureLog);

    // Aggiorna Google Sheets status
    // (Qui potresti implementare un update su Sheets per cambiare status da PENDING a VERIFIED)

    console.log(`✅ Email verificata: ${tokenData.formData.email}`);

    // Pagina HTML di conferma
    res.send(`
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verificata - Agility Club Labora</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 40px;
            text-align: center;
            max-width: 500px;
            margin: 20px;
          }
          .icon {
            width: 100px;
            height: 100px;
            background: #4caf50;
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 50px;
            color: white;
          }
          h1 {
            color: #2e7d32;
            margin: 0 0 15px 0;
          }
          p {
            color: #666;
            line-height: 1.6;
            margin: 15px 0;
          }
          .info-box {
            background: #e8f5e9;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: left;
          }
          .btn {
            display: inline-block;
            background: #0073aa;
            color: white;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 25px;
            margin-top: 20px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h1>Email Verificata con Successo!</h1>
          <p><strong>Complimenti ${tokenData.formData.nome}!</strong></p>
          <p>La tua iscrizione è stata confermata e il documento firmato è stato processato.</p>

          <div class="info-box">
            <p><strong>✉️ Email inviate:</strong></p>
            <p style="margin: 5px 0;">• Copia del documento firmato inviata a <strong>${tokenData.formData.email}</strong></p>
            <p style="margin: 5px 0;">• Notifica inviata agli amministratori</p>
          </div>

          <p style="font-size: 14px; color: #999; margin-top: 30px;">
            <strong>ID Documento:</strong> ${signatureLog.documentId}<br>
            <strong>Timestamp:</strong> ${new Date().toLocaleString('it-IT')}
          </p>

          <a href="https://www.agilityclub-labora.it" class="btn">Torna al sito</a>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('❌ Errore verifica email:', error);
    res.status(500).send(`
      <html><body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1 style="color: #dc3545;">❌ Errore del Server</h1>
        <p>Si è verificato un errore. Riprova più tardi.</p>
        <p><small>${error.message}</small></p>
      </body></html>
    `);
  }
});

// ============================================
// ROUTE ESPORTAZIONE DOCUMENTI ASSOCIATO
// ============================================
router.post('/export-documents', [
  body('codiceFiscale').notEmpty().isLength({ min: 16, max: 16 }).withMessage('Codice fiscale non valido'),
  body('email').isEmail().withMessage('Email non valida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { codiceFiscale, email } = req.body;

    console.log(`📦 Richiesta esportazione per CF: ${codiceFiscale}`);

    // Genera pacchetto export
    const exportPackage = await documentArchiveService.generateExportPackage(
      codiceFiscale.toUpperCase(),
      email
    );

    if (!exportPackage.success) {
      return res.status(404).json({
        success: false,
        error: exportPackage.error
      });
    }

    // Invia email con link download o allegato JSON
    const exportEmail = `
      <html>
      <body style="font-family: Arial; padding: 20px;">
        <h2>Esportazione Documenti - Agility Club Labora</h2>
        <p>Gentile associato,</p>
        <p>In allegato trovi l'esportazione completa dei tuoi documenti.</p>
        <p><strong>Totale documenti:</strong> ${exportPackage.exportData.totalDocuments}</p>
        <p><strong>Data esportazione:</strong> ${new Date().toLocaleString('it-IT')}</p>
        <p>Questa esportazione include:</p>
        <ul>
          <li>PDF firmati (Base64)</li>
          <li>Metadata completi</li>
          <li>Hash integrità</li>
          <li>Timestamp firme</li>
        </ul>
        <p><small>Conservare in luogo sicuro. Valido per 10 anni dalla data di iscrizione.</small></p>
      </body>
      </html>
    `;

    await emailService.sendEmail({
      from: `"Agility Club Labora" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Esportazione Documenti - Agility Club Labora',
      html: exportEmail,
      attachments: [{
        filename: exportPackage.fileName,
        content: JSON.stringify(exportPackage.exportData, null, 2),
        contentType: 'application/json'
      }]
    });

    res.json({
      success: true,
      message: 'Esportazione inviata via email',
      totalDocuments: exportPackage.exportData.totalDocuments
    });

  } catch (error) {
    console.error('❌ Errore esportazione documenti:', error);
    res.status(500).json({
      success: false,
      error: 'Errore esportazione',
      details: error.message
    });
  }
});

// ============================================
// ROUTE LISTA DOCUMENTI ASSOCIATO
// ============================================
router.get('/my-documents', [
  query('codiceFiscale').notEmpty().isLength({ min: 16, max: 16 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { codiceFiscale } = req.query;

    const listing = await documentArchiveService.listDocuments(codiceFiscale.toUpperCase());

    res.json({
      success: true,
      ...listing
    });

  } catch (error) {
    console.error('❌ Errore listing documenti:', error);
    res.status(500).json({
      success: false,
      error: 'Errore recupero documenti',
      details: error.message
    });
  }
});

// ============================================
// ROUTE AUDIT LOG E STATISTICHE (Admin)
// ============================================
router.get('/admin/stats', async (req, res) => {
  try {
    const archiveStats = await documentArchiveService.getArchiveStats();
    const verificationStats = await verificationService.getVerificationStats();
    const integrityCheck = await documentArchiveService.verifyArchiveIntegrity();

    res.json({
      success: true,
      stats: {
        archive: archiveStats,
        verification: verificationStats,
        integrity: integrityCheck
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Errore statistiche:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;