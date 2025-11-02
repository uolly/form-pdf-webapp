const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    console.log('🔍 EMAILSERVICE CONSTRUCTOR - Inizio debug versione SendGrid');
    console.log('🔍 SENDGRID_API_KEY presente:', !!process.env.SENDGRID_API_KEY);
    console.log('🔍 SENDGRID_API_KEY lunghezza:', process.env.SENDGRID_API_KEY?.length || 0);
    console.log('🔍 Tutte le variabili ENV email:', Object.keys(process.env).filter(key => 
      key.includes('SENDGRID') || key.includes('SMTP') || key.includes('EMAIL')
    ));

    // Configura SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.sendGridEnabled = true;
      console.log('✅ SendGrid configurato e abilitato');
    } else {
      this.sendGridEnabled = false;
      console.log('❌ SENDGRID_API_KEY mancante - SendGrid disabilitato');
    }

    console.log('🔍 EMAILSERVICE CONSTRUCTOR - sendGridEnabled:', this.sendGridEnabled);
  }

  // Metodo principale per invio email con SendGrid
  async sendEmail(mailOptions) {
    console.log('📧 SENDEMAIL chiamato - sendGridEnabled:', this.sendGridEnabled);

    // Modalità TEST: simula invio senza inviare realmente
    if (process.env.DISABLE_EMAIL_SENDING === 'true') {
      console.log('⚠️ MODALITÀ TEST: Email NON inviata (DISABLE_EMAIL_SENDING=true)');
      console.log('📧 Email simulata:', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        attachments: mailOptions.attachments?.length || 0
      });
      return {
        method: 'test-mode',
        messageId: 'test-' + Date.now(),
        accepted: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to]
      };
    }

    if (!this.sendGridEnabled) {
      console.log('❌ SendGrid non abilitato, errore!');
      throw new Error('SendGrid non configurato - controllare SENDGRID_API_KEY');
    }

    console.log('📧 Usando SendGrid per invio email...');

    try {
      const message = {
        to: this.ensureArray(mailOptions.to),
        from: {
          email: this.extractEmail(mailOptions.from),
          name: this.extractName(mailOptions.from) || 'Agility Club Labora'
        },
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: 'Questa email contiene informazioni importanti. Si prega di visualizzare la versione HTML per tutti i dettagli.', // Testo fisso

        
        // Ottimizzazioni anti-spam
        tracking_settings: {
          click_tracking: { enable: false },
          open_tracking: { enable: false },
          subscription_tracking: { enable: false }
        },

        // Headers professionali
        custom_args: {
          source: 'agility_club_system',
          version: '2.0'
        }
      };

      // Aggiungi CC se presente
      if (mailOptions.cc) {
        message.cc = this.ensureArray(mailOptions.cc);
      }

      // Aggiungi allegati se presenti
      if (mailOptions.attachments && mailOptions.attachments.length > 0) {
        message.attachments = mailOptions.attachments.map(att => ({
          content: att.content.toString('base64'),
          filename: att.filename,
          type: att.contentType || 'application/octet-stream',
          disposition: 'attachment'
        }));
      }

      console.log('📧 Invio con SendGrid...');
      const response = await sgMail.send(message);
      
      console.log('✅ Email inviata con SendGrid - Status:', response[0].statusCode);
      return {
        method: 'sendgrid',
        messageId: response[0].headers['x-message-id'] || 'sg-' + Date.now(),
        accepted: message.to
      };

    } catch (error) {
      console.error('❌ Errore SendGrid:', error.message);
      if (error.response) {
        console.error('❌ SendGrid response:', JSON.stringify(error.response.body, null, 2));
      }
      throw error;
    }
  }

  // Metodo per iscrizioni - usa SendGrid
  async sendFormEmail(formData, pdfBuffer, signatureLog = null, accountData = null) {
    try {
      console.log('📧 SENDFORMEMAIL chiamato per:', formData.nome, formData.cognome);

      const timestamp = Date.now();
      const pdfFileName = `modulo_iscrizione_${formData.cognome}_${formData.nome}_${timestamp}.pdf`;

      // 1. EMAIL ALL'AMMINISTRATORE
      const attachments = [
        {
          filename: pdfFileName,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ];

      // Aggiungi signature log JSON se presente
      if (signatureLog) {
        const logFileName = `signature_log_${formData.cognome}_${formData.nome}_${timestamp}.json`;
        attachments.push({
          filename: logFileName,
          content: Buffer.from(JSON.stringify(signatureLog, null, 2), 'utf-8'),
          contentType: 'application/json'
        });
      }

      const adminMailOptions = {
        from: `"Agility Club Labora" <${process.env.EMAIL_FROM}>`,
        to: 'laboratrieste@gmail.com',
        cc: 'walter.cleva@gmail.com',
        subject: `Nuova iscrizione ricevuta - ${formData.nome} ${formData.cognome}${accountData ? ' (con account app)' : ''}`,
        html: this.generateAdminEmailContent(formData, signatureLog, accountData),
        attachments: attachments
      };

      // 2. EMAIL ALL'UTENTE
      const userMailOptions = {
        from: `"Agility Club Labora" <${process.env.EMAIL_FROM}>`,
        to: formData.email,
        subject: 'Conferma iscrizione - Agility Club Labora',
        html: this.generateUserEmailContent(formData, signatureLog, accountData),
        attachments: [
          {
            filename: pdfFileName,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      // Invia entrambe le email con SendGrid
      console.log('📧 Invio email amministratore con SendGrid...');
      const adminResult = await this.sendEmail(adminMailOptions);
      
      console.log('📧 Invio email conferma utente con SendGrid...');
      const userResult = await this.sendEmail(userMailOptions);
      
      return {
        success: true,
        admin: adminResult,
        user: userResult,
        accepted: [
          ...(adminResult.accepted || []),
          ...(userResult.accepted || [])
        ],
        adminMessageId: adminResult.messageId,
        userMessageId: userResult.messageId
      };
      
    } catch (error) {
      console.error('💥 Errore invio email iscrizione:', error);
      throw error;
    }
  }

  // Metodo per ricevute - usa SendGrid
  async sendRicevutaEmails(ricevutaData, pdfBuffer) {
    try {
      console.log('📧 SENDRICEVUTAEMAILS chiamato per ricevuta:', ricevutaData.numeroRicevuta);
      
      const timestamp = Date.now();
      const pdfFileName = `ricevuta_${ricevutaData.numeroRicevuta}_${timestamp}.pdf`;
      
      // 1. EMAIL AL PAGANTE
      const userMailOptions = {
        from: `"Agility Club Labora" <${process.env.EMAIL_FROM}>`,
        to: ricevutaData.emailPagante,
        subject: `Ricevuta pagamento n. ${ricevutaData.numeroRicevuta} - Agility Club Labora`,
        html: this.generateRicevutaUserEmail(ricevutaData),
        attachments: [
          {
            filename: pdfFileName,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      // 2. EMAIL AGLI AMMINISTRATORI
      const adminEmailsString = process.env.EMAIL_RICEVUTE_ADMIN || process.env.EMAIL_TO;
const adminEmailsArray = adminEmailsString.split(',').map(email => email.trim());

const adminMailOptions = {
  from: `"Sistema Amministrativo" <${process.env.EMAIL_FROM}>`,
  to: adminEmailsArray, // Array invece di stringa
  subject: `Ricevuta n. ${ricevutaData.numeroRicevuta} - Agility Club Labora`,
  html: this.generateRicevutaAdminEmail(ricevutaData),
        attachments: [
          {
            filename: pdfFileName,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      // Invia entrambe le email con SendGrid
      console.log('📧 Invio ricevuta al pagante con SendGrid...');
      const userResult = await this.sendEmail(userMailOptions);
      
      console.log('📧 Invio notifica amministratori con SendGrid...');
      const adminResult = await this.sendEmail(adminMailOptions);
      
      return {
        success: true,
        user: userResult,
        admin: adminResult,
        userMessageId: userResult.messageId,
        adminMessageId: adminResult.messageId
      };
      
    } catch (error) {
      console.error('💥 Errore invio email ricevuta:', error);
      throw error;
    }
  }

  // Metodo di test
  async testSendGridOptimized() {
    if (!this.sendGridEnabled) {
      throw new Error('SendGrid non configurato');
    }

    const testEmail = {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      subject: 'Test configurazione sistema email - Agility Club Labora',
      html: `
        <!DOCTYPE html>
        <html lang="it">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; background: white; }
            .header { background-color: #2c5aa0; color: white; padding: 25px; text-align: center; }
            .content { padding: 30px; }
            .success { background-color: #d4edda; padding: 20px; border: 1px solid #c3e6cb; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">Test Sistema Email SendGrid</h1>
              <p style="margin: 10px 0 0 0;">Agility Club Labora - A.S.D.</p>
            </div>
            <div class="content">
              <p>Gentile Amministratore,</p>
              <p>questo messaggio conferma che il sistema SendGrid è attivo e funzionante.</p>
              <div class="success">
                <h3 style="margin-top: 0; color: #155724;">Sistema Operativo</h3>
                <p style="margin-bottom: 0;">SendGrid è configurato correttamente e le email vengono inviate senza timeout.</p>
              </div>
              <p><strong>Data test:</strong> ${new Date().toLocaleDateString('it-IT')}</p>
              <p><strong>Ora test:</strong> ${new Date().toLocaleTimeString('it-IT')}</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p>Cordiali saluti,<br><strong>Sistema Gestione Email</strong></p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    return await this.sendEmail(testEmail);
  }

  // Email utente ottimizzata per non finire nello spam
  generateUserEmailContent(formData, signatureLog = null, accountData = null) {
    const signatureInfo = signatureLog ? `
      <div class="info-box" style="background-color: #e8f5e9; border-left-color: #4caf50;">
        <h3 style="margin-top: 0; color: #2e7d32;">✓ Documento firmato digitalmente</h3>
        <p><strong>Data e ora firma:</strong> ${new Date(signatureLog.signatureTimestamp).toLocaleString('it-IT')}</p>
        <p><strong>ID Documento:</strong> ${signatureLog.documentId}</p>
        <p><strong>Hash documento:</strong> <code style="font-size: 11px; word-break: break-all;">${signatureLog.documentHash.substring(0, 32)}...</code></p>
        <p style="margin-bottom: 0;"><small>Il documento allegato contiene la tua firma elettronica e ha pieno valore probatorio ai sensi del Regolamento eIDAS (UE) 910/2014.</small></p>
      </div>
    ` : '';

    const accountInfo = accountData ? `
      <div class="info-box" style="background-color: ${accountData.alreadyExists ? '#fff3cd' : '#e3f2fd'}; border-left-color: ${accountData.alreadyExists ? '#ffc107' : '#2196f3'};">
        <h3 style="margin-top: 0; color: ${accountData.alreadyExists ? '#856404' : '#1565c0'};">${accountData.alreadyExists ? '📱 Account App Esistente' : '📱 Account App Creato'}</h3>
        ${accountData.alreadyExists ?
          '<p>Hai già un account per l\'app Agility Club Labora! Abbiamo aggiornato i tuoi dati del profilo.</p>' :
          '<p>Il tuo account per l\'app Agility Club Labora è stato creato con successo!</p>'
        }
        <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${accountData.email}</p>
          <p style="margin: 5px 0;"><strong>Metodo accesso:</strong> ${accountData.authMethod === 'google' ? 'Google Sign-In' : 'Email e Password'}</p>
          ${accountData.authMethod === 'password' && !accountData.alreadyExists ?
            '<p style="margin: 5px 0; color: #666;"><small>Usa la password che hai creato durante la registrazione</small></p>' :
            accountData.alreadyExists ?
              '<p style="margin: 5px 0; color: #856404;"><small>⚠️ Usa la password del tuo account esistente per accedere</small></p>' :
              ''
          }
        </div>
        <p><strong>📲 Accedi all'app:</strong></p>
        <div style="margin: 15px 0;">
          <a href="https://app.agilityclublabora.com" style="display: inline-block; background-color: #2196f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            🌐 Apri Web App
          </a>
        </div>
        <p style="margin-top: 10px; color: #666; font-size: 14px;">
          <em>Puoi accedere all'app direttamente dal tuo browser, su qualsiasi dispositivo.</em>
        </p>
        <p style="margin-top: 15px;"><strong>Cosa puoi fare con l'app:</strong></p>
        <ul>
          <li>📅 Prenotare lezioni e allenamenti</li>
          <li>🐕 Gestire i tuoi binomi (cane-conduttore)</li>
          <li>📊 Monitorare i progressi</li>
          <li>💬 Comunicare con gli istruttori</li>
        </ul>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Conferma iscrizione</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background-color: #ffffff;
            border: 1px solid #dddddd;
          }
          .header { 
            background-color: #2c5aa0; 
            color: white; 
            padding: 30px 20px; 
            text-align: center;
          }
          .header h1 { 
            margin: 0; 
            font-size: 24px;
            font-weight: normal;
          }
          .content { 
            padding: 30px 20px;
          }
          .welcome { 
            font-size: 18px; 
            color: #2c5aa0; 
            margin-bottom: 20px;
          }
          .info-box { 
            background-color: #f0f8ff; 
            padding: 20px; 
            border-left: 4px solid #2c5aa0;
            margin: 20px 0;
          }
          .important { 
            background-color: #fff3cd; 
            padding: 20px; 
            border: 1px solid #ffeaa7;
            margin: 20px 0;
          }
          .important h3 { 
            color: #856404; 
            margin-top: 0;
            font-size: 16px;
          }
          .footer { 
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center; 
            font-size: 12px; 
            color: #666666; 
            border-top: 1px solid #e9ecef;
          }
          .contact-info {
            background-color: #e3f2fd;
            padding: 15px;
            margin: 20px 0;
            border: 1px solid #bbdefb;
          }
          ol, ul { margin: 10px 0; padding-left: 20px; }
          li { margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Agility Club Labora</h1>
            <p style="margin: 10px 0 0 0;">Associazione Sportiva Dilettantistica</p>
          </div>
          
          <div class="content">
            <p class="welcome">Gentile ${formData.nome} ${formData.cognome},</p>
            
            <p>la ringraziamo per aver compilato il modulo di iscrizione alla nostra associazione.</p>
            
            <div class="info-box">
              <p><strong>La sua richiesta di iscrizione è stata ricevuta correttamente</strong> e verrà elaborata dal nostro staff.</p>
            </div>

            ${signatureInfo}

            ${accountInfo}

           <div class="important">
              <h3>Documenti richiesti per completare l'iscrizione</h3>
              ${signatureLog ? `
                <p><strong>✓ Modulo di iscrizione:</strong> Già firmato digitalmente, non è necessario stamparlo né consegnarlo.</p>
              ` : `
                <p><strong>Modulo di iscrizione:</strong> Il modulo allegato deve essere stampato, firmato e consegnato durante il primo appuntamento.</p>
              `}
              <p><strong>✓ Passaporto del cane:</strong> La fotocopia del passaporto del cane con vaccinazioni aggiornate può essere inviata:</p>
              <ul style="margin: 10px 0;">
                <li>Via email a: <a href="mailto:laboratrieste@gmail.com" style="color: #2c5aa0;">laboratrieste@gmail.com</a></li>
                <li>Via WhatsApp al: <a href="https://wa.me/393500693832" style="color: #25D366;">+39 350 0693832</a></li>
                <li>Consegnata al campo in forma di fotocopia
              </ul>
              <p style="font-size: 14px; color: #666; margin-top: 15px;"><em>Inviando i documenti digitalmente contribuisci alla riduzione del consumo di carta.</em></p>
            </div>
            
                        
            <div class="contact-info">
              <h3 style="margin-top: 0; color: #1976d2;">Modalità di pagamento</h3>
              <p><strong>Il pagamento può essere effettuato presso il centro oppure tramite bonifico bancario:</strong></p>
              <p style="margin: 10px 0 5px 0;"><strong>Intestatario:</strong> A.S.D. AGILITY CLUB LA BORA</p>
              <p style="margin: 5px 0;"><strong>IBAN:</strong> IT73V0503402200000000003040</p>
              <p style="margin: 5px 0;"><strong>BIC/SWIFT:</strong> BAPPIT21703</p>
              <p style="margin: 15px 0 5px 0; font-size: 14px;"><em>Nella causale indicare nome e cognome</em></p>
            </div>
            
            <p>Per qualsiasi informazione, non esiti a contattarci all'indirizzo laboratrieste@gmail.com</p>
            
            <p style="margin-top: 30px;">Cordiali saluti,<br>
            <strong>Lo Staff di Agility Club Labora</strong></p>
          </div>
          
          <div class="footer">
            <p><strong>Agility Club Labora - A.S.D.</strong></p>
            <p>Comunicazione inviata a ${formData.email} in seguito alla compilazione del modulo di iscrizione.</p>
            <p>Anno ${new Date().getFullYear()} - Tutti i diritti riservati</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Email admin ottimizzata
  generateAdminEmailContent(formData, signatureLog = null, accountData = null) {
    const accountSection = accountData ? `
      <tr>
        <td colspan="2" style="padding: 15px; background-color: #e3f2fd; border-left: 4px solid #2196f3;">
          <h3 style="margin: 0 0 10px 0; color: #1565c0;">📱 Account App Creato</h3>
          <p style="margin: 5px 0;"><strong>UID:</strong> ${accountData.uid}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${accountData.email}</p>
          <p style="margin: 5px 0;"><strong>Metodo:</strong> ${accountData.authMethod === 'google' ? 'Google Sign-In' : 'Email e Password'}</p>
        </td>
      </tr>
    ` : '';
    const signatureSection = signatureLog ? `
      <div class="section">
        <h3>🔐 Firma Elettronica</h3>
        <div style="background-color: #e8f5e9; padding: 15px; border-left: 3px solid #4caf50;">
          <div class="field">
            <span class="field-label">Timestamp firma:</span>
            <span class="field-value">${new Date(signatureLog.signatureTimestamp).toLocaleString('it-IT')}</span>
          </div>
          <div class="field">
            <span class="field-label">ID Documento:</span>
            <span class="field-value"><code>${signatureLog.documentId}</code></span>
          </div>
          <div class="field">
            <span class="field-label">Hash documento:</span>
            <span class="field-value"><code style="font-size: 10px; word-break: break-all;">${signatureLog.documentHash}</code></span>
          </div>
          <div class="field">
            <span class="field-label">Hash firma:</span>
            <span class="field-value"><code style="font-size: 10px; word-break: break-all;">${signatureLog.signatureHash}</code></span>
          </div>
          <div class="field">
            <span class="field-label">IP (anon.):</span>
            <span class="field-value">${signatureLog.technical.ipAddress}</span>
          </div>
          <div class="field">
            <span class="field-label">User Agent:</span>
            <span class="field-value">${signatureLog.technical.userAgent}</span>
          </div>
          <div class="field">
            <span class="field-label">GDPR Compliant:</span>
            <span class="field-value">✓ Sì</span>
          </div>
        </div>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nuova iscrizione</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.5; 
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container { 
            max-width: 700px; 
            margin: 20px auto; 
            background-color: #ffffff;
            border: 1px solid #ddd;
          }
          .header { 
            background-color: #1565c0; 
            color: white; 
            padding: 20px; 
            text-align: center;
          }
          .content { 
            padding: 25px;
          }
          .section { 
            margin-bottom: 25px;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
          }
          .section:last-child {
            border-bottom: none;
          }
          .section h3 { 
            color: #1565c0; 
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 16px;
          }
          .field { 
            margin: 8px 0;
            display: flex;
          }
          .field-label { 
            font-weight: bold;
            min-width: 140px;
            color: #555;
          }
          .field-value {
            flex: 1;
          }
          .dog-info { 
            background-color: #f8f9fa; 
            padding: 15px; 
            margin: 10px 0; 
            border-left: 3px solid #1565c0;
          }
          .summary {
            background-color: #e3f2fd;
            padding: 15px;
            border: 1px solid #bbdefb;
            margin-bottom: 20px;
          }
          .footer { 
            background-color: #f8f9fa;
            padding: 15px;
            text-align: center; 
            font-size: 12px; 
            color: #666;
            border-top: 1px solid #e9ecef;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">Nuova Iscrizione Ricevuta</h2>
            <p style="margin: 10px 0 0 0;">Sistema Gestione Iscrizioni</p>
          </div>
          
          <div class="content">
            <div class="summary">
              <h3 style="margin-top: 0;">Riepilogo iscrizione</h3>
              <p><strong>Socio:</strong> ${formData.nome} ${formData.cognome}</p>
              <p><strong>Email:</strong> ${formData.email}</p>
              <p><strong>Data iscrizione:</strong> ${new Date().toLocaleDateString('it-IT')}</p>
            </div>
            
            <div class="section">
              <h3>Dati anagrafici</h3>
              <div class="field">
                <span class="field-label">Nome completo:</span>
                <span class="field-value">${formData.nome} ${formData.cognome}</span>
              </div>
              <div class="field">
                <span class="field-label">Data di nascita:</span>
                <span class="field-value">${this.formatDate(formData.natoIl)} - ${formData.natoA}</span>
              </div>
              <div class="field">
                <span class="field-label">Residenza:</span>
                <span class="field-value">${formData.residenza}, ${formData.comune} (${formData.provincia}) ${formData.cap}</span>
              </div>
              <div class="field">
                <span class="field-label">Codice Fiscale:</span>
                <span class="field-value">${formData.codiceFiscale}</span>
              </div>
              <div class="field">
                <span class="field-label">Contatti:</span>
                <span class="field-value">${formData.email} - Tel. ${formData.telefono}</span>
              </div>
            </div>
            
            ${formData.nomeCane1 ? `
            <div class="section">
              <h3>Informazioni cane</h3>
              <div class="dog-info">
                <div class="field">
                  <span class="field-label">Nome:</span>
                  <span class="field-value">${formData.nomeCane1}</span>
                </div>
                <div class="field">
                  <span class="field-label">Sesso e razza:</span>
                  <span class="field-value">${formData.sessoCane1 === 'M' ? 'Maschio' : formData.sessoCane1 === 'F' ? 'Femmina' : 'Non specificato'} - ${formData.razzaCane1 || 'Razza non specificata'}</span>
                </div>
                <div class="field">
                  <span class="field-label">Altezza:</span>
                  <span class="field-value">${formData.altezzaCane1 ? formData.altezzaCane1 + ' cm' : 'Non specificata'}</span>
                </div>
                <div class="field">
                  <span class="field-label">Microchip:</span>
                  <span class="field-value">${formData.microchipCane1 || 'Non specificato'}</span>
                </div>
                <div class="field">
                  <span class="field-label">Data nascita:</span>
                  <span class="field-value">${this.formatDate(formData.dataNascitaCane1) || 'Non specificata'}</span>
                </div>
              </div>
            </div>
            ` : ''}
            
            ${formData.aggiungiSecondoCane && formData.nomeCane2 ? `
            <div class="section">
              <h3>Secondo cane</h3>
              <div class="dog-info">
                <div class="field">
                  <span class="field-label">Nome:</span>
                  <span class="field-value">${formData.nomeCane2}</span>
                </div>
                <div class="field">
                  <span class="field-label">Sesso e razza:</span>
                  <span class="field-value">${formData.sessoCane2 === 'M' ? 'Maschio' : formData.sessoCane2 === 'F' ? 'Femmina' : 'Non specificato'} - ${formData.razzaCane2 || 'Razza non specificata'}</span>
                </div>
                <div class="field">
                  <span class="field-label">Altezza:</span>
                  <span class="field-value">${formData.altezzaCane2 ? formData.altezzaCane2 + ' cm' : 'Non specificata'}</span>
                </div>
                <div class="field">
                  <span class="field-label">Microchip:</span>
                  <span class="field-value">${formData.microchipCane2 || 'Non specificato'}</span>
                </div>
                <div class="field">
                  <span class="field-label">Data nascita:</span>
                  <span class="field-value">${this.formatDate(formData.dataNascitaCane2) || 'Non specificata'}</span>
                </div>
              </div>
            </div>
            ` : ''}

            ${accountData ? `
            <div class="section">
              <h3>📱 Account App</h3>
              <div style="background-color: #e3f2fd; padding: 15px; border-left: 3px solid #2196f3;">
                <div class="field">
                  <span class="field-label">UID Firebase:</span>
                  <span class="field-value">${accountData.uid}</span>
                </div>
                <div class="field">
                  <span class="field-label">Email:</span>
                  <span class="field-value">${accountData.email}</span>
                </div>
                <div class="field">
                  <span class="field-label">Metodo accesso:</span>
                  <span class="field-value">${accountData.authMethod === 'google' ? '🔐 Google Sign-In' : '📧 Email e Password'}</span>
                </div>
              </div>
            </div>
            ` : ''}

            ${signatureSection}
          </div>

          <div class="footer">
            <p>Email generata automaticamente dal sistema - ${new Date().toLocaleString('it-IT')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Email ricevuta per utente
  generateRicevutaUserEmail(ricevutaData) {
    return `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ricevuta pagamento</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background-color: #ffffff;
            border: 1px solid #dddddd;
          }
          .header { 
            background-color: #2c3e50; 
            color: white; 
            padding: 25px 20px; 
            text-align: center;
          }
          .content { 
            padding: 30px 20px;
          }
          .receipt-box { 
            background-color: #f8f9fa; 
            padding: 20px; 
            border: 1px solid #dee2e6;
            margin: 20px 0;
          }
          .amount { 
            font-size: 22px; 
            color: #28a745; 
            font-weight: bold;
            margin: 15px 0;
          }
          .footer { 
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center; 
            font-size: 12px; 
            color: #666;
            border-top: 1px solid #e9ecef;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Ricevuta di Pagamento</h1>
            <p style="margin: 10px 0 0 0;">Agility Club Labora</p>
          </div>
          
          <div class="content">
            <p>Gentile <strong>${ricevutaData.ricevutoDa}</strong>,</p>
            
            <p>confermiamo di aver ricevuto il pagamento come di seguito dettagliato.</p>
            
            <div class="receipt-box">
              <h3>Ricevuta n. ${ricevutaData.numeroRicevuta}</h3>
              <p><strong>Data:</strong> ${this.formatDate(ricevutaData.dataRicevuta)}</p>
              <p><strong>Causale:</strong> ${ricevutaData.ricevutaPer}</p>
              <p><strong>Modalità:</strong> ${ricevutaData.modalitaPagamento}</p>
              <div class="amount">Importo: € ${parseFloat(ricevutaData.denaroRicevuto).toFixed(2)}</div>
            </div>
            
            <p>La ricevuta in formato PDF è allegata a questa comunicazione.</p>
            
            <p>Cordiali saluti,<br><strong>Agility Club Labora</strong></p>
          </div>
          
          <div class="footer">
            <p>Agility Club Labora - Associazione Sportiva Dilettantistica</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Email ricevuta per admin
  generateRicevutaAdminEmail(ricevutaData) {
    return `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <title>Ricevuta emessa</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 0; }
          .container { max-width: 700px; margin: 20px auto; background: white; border: 1px solid #ddd; }
          .header { background-color: #34495e; color: white; padding: 20px; text-align: center; }
          .content { padding: 25px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { text-align: left; padding: 10px; border-bottom: 1px solid #ddd; }
          th { background-color: #ecf0f1; }
          .amount { font-size: 18px; color: #27ae60; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">Ricevuta Emessa</h2>
            <p style="margin: 10px 0 0 0;">Sistema Amministrativo</p>
          </div>
          
          <div class="content">
            <h3>Ricevuta n. ${ricevutaData.numeroRicevuta}</h3>
            
            <table>
              <tr><td><strong>Data</strong></td><td>${this.formatDate(ricevutaData.dataRicevuta)}</td></tr>
              <tr><td><strong>Pagante</strong></td><td>${ricevutaData.ricevutoDa}</td></tr>
              <tr><td><strong>Email</strong></td><td>${ricevutaData.emailPagante}</td></tr>
              <tr><td><strong>Causale</strong></td><td>${ricevutaData.ricevutaPer}</td></tr>
              <tr><td><strong>Modalità</strong></td><td>${ricevutaData.modalitaPagamento}</td></tr>
              <tr><td><strong>Istruttore</strong></td><td>${ricevutaData.educatoreTecnico}</td></tr>
              <tr><td><strong>Importo</strong></td><td class="amount">€ ${parseFloat(ricevutaData.denaroRicevuto).toFixed(2)}</td></tr>
            </table>
            
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString('it-IT')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Helper functions
  ensureArray(value) {
    return Array.isArray(value) ? value : [value];
  }

  extractEmail(fromString) {
    if (!fromString) return process.env.EMAIL_FROM;
    const match = fromString.match(/<(.+)>/);
    return match ? match[1] : fromString;
  }

  extractName(fromString) {
    if (!fromString) return 'Agility Club Labora';
    const match = fromString.match(/^"?(.+?)"?\s*</);
    return match ? match[1] : '';
  }

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
  }

  // ============================================
  // EMAIL PER RINNOVI ISCRIZIONE
  // ============================================

  /**
   * Invia email per rinnovo iscrizione
   */
  async sendRinnovoEmails(rinnovoData, pdfBuffer = null, signatureLog = null, accountData = null) {
    try {
      console.log('📧 SENDRINNOVOEMAILS chiamato per:', rinnovoData.nome, rinnovoData.cognome);

      // Controllo modalità test
      if (process.env.DISABLE_EMAIL_SENDING === 'true') {
        console.log('⚠️ MODALITÀ TEST: Email rinnovo NON inviata (DISABLE_EMAIL_SENDING=true)');
        console.log('Dettagli email che sarebbe stata inviata:');
        console.log('- A:', rinnovoData.email);
        console.log('- Admin: laboratrieste@gmail.com');
        console.log('- Oggetto: Conferma rinnovo iscrizione');
        console.log('- PDF allegato:', pdfBuffer ? 'Sì' : 'No');
        console.log('- Firma digitale:', signatureLog ? 'Sì' : 'No');

        return {
          success: true,
          method: 'test-mode',
          message: 'Email simulate (non inviate) - modalità test attiva'
        };
      }

      const timestamp = Date.now();
      const attachments = [];

      // Aggiungi PDF se disponibile
      if (pdfBuffer) {
        const pdfFileName = `rinnovo_iscrizione_${rinnovoData.cognome}_${rinnovoData.nome}_${timestamp}.pdf`;
        attachments.push({
          filename: pdfFileName,
          content: pdfBuffer,
          contentType: 'application/pdf'
        });
      }

      // Aggiungi signature log JSON se presente
      if (signatureLog) {
        const logFileName = `signature_log_rinnovo_${rinnovoData.cognome}_${rinnovoData.nome}_${timestamp}.json`;
        attachments.push({
          filename: logFileName,
          content: Buffer.from(JSON.stringify(signatureLog, null, 2), 'utf-8'),
          contentType: 'application/json'
        });
      }

      // 1. EMAIL ALL'AMMINISTRATORE
      const adminMailOptions = {
        from: `"Agility Club Labora" <${process.env.EMAIL_FROM}>`,
        to: 'laboratrieste@gmail.com',
        cc: 'walter.cleva@gmail.com',
        subject: `Rinnovo iscrizione - ${rinnovoData.nome} ${rinnovoData.cognome}${accountData ? ' (con account app)' : ''}`,
        html: this.generateRinnovoAdminEmailContent(rinnovoData, signatureLog, accountData),
        attachments: attachments
      };

      // 2. EMAIL ALL'UTENTE
      const userMailOptions = {
        from: `"Agility Club Labora" <${process.env.EMAIL_FROM}>`,
        to: rinnovoData.email,
        subject: `Conferma rinnovo iscrizione ${new Date().getFullYear()} - Agility Club Labora`,
        html: this.generateRinnovoUserEmailContent(rinnovoData, signatureLog, accountData),
        attachments: pdfBuffer ? [{
          filename: `rinnovo_iscrizione_${rinnovoData.cognome}_${rinnovoData.nome}_${timestamp}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }] : []
      };

      // Invia entrambe le email
      console.log('📧 Invio email amministratore (rinnovo)...');
      const adminResult = await this.sendEmail(adminMailOptions);

      console.log('📧 Invio email conferma utente (rinnovo)...');
      const userResult = await this.sendEmail(userMailOptions);

      return {
        success: true,
        admin: adminResult,
        user: userResult,
        accepted: [
          ...(adminResult.accepted || []),
          ...(userResult.accepted || [])
        ],
        adminMessageId: adminResult.messageId,
        userMessageId: userResult.messageId
      };

    } catch (error) {
      console.error('💥 Errore invio email rinnovo:', error);
      throw error;
    }
  }

  /**
   * Genera HTML email per utente (rinnovo)
   */
  generateRinnovoUserEmailContent(rinnovoData, signatureLog = null, accountData = null) {
    const signatureInfo = signatureLog ? `
      <div class="info-box" style="background-color: #e8f5e9; border-left-color: #4caf50;">
        <h3 style="margin-top: 0; color: #2e7d32;">✓ Documento firmato digitalmente</h3>
        <p><strong>Data e ora firma:</strong> ${new Date(signatureLog.signatureTimestamp).toLocaleString('it-IT')}</p>
        <p><strong>ID Documento:</strong> ${signatureLog.documentId}</p>
        <p><strong>Hash documento:</strong> <code style="font-size: 11px; word-break: break-all;">${signatureLog.documentHash.substring(0, 32)}...</code></p>
        <p style="margin-bottom: 0;"><small>Il documento allegato contiene la tua firma elettronica e ha pieno valore probatorio ai sensi del Regolamento eIDAS (UE) 910/2014.</small></p>
      </div>
    ` : '';

    const accountInfo = accountData ? `
      <div class="info-box" style="background-color: ${accountData.alreadyExists ? '#fff3cd' : '#e3f2fd'}; border-left-color: ${accountData.alreadyExists ? '#ffc107' : '#2196f3'};">
        <h3 style="margin-top: 0; color: ${accountData.alreadyExists ? '#856404' : '#1565c0'};">${accountData.alreadyExists ? '📱 Account App Esistente' : '📱 Account App Creato'}</h3>
        ${accountData.alreadyExists ?
          '<p>Hai già un account per l\'app Agility Club Labora! Abbiamo aggiornato i tuoi dati del profilo.</p>' :
          '<p>Il tuo account per l\'app Agility Club Labora è stato creato con successo!</p>'
        }
        <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${accountData.email}</p>
          <p style="margin: 5px 0;"><strong>Metodo accesso:</strong> ${accountData.authMethod === 'google' ? 'Google Sign-In' : 'Email e Password'}</p>
          ${accountData.authMethod === 'password' && !accountData.alreadyExists ?
            '<p style="margin: 5px 0; color: #666;"><small>Usa la password che hai creato durante la registrazione</small></p>' :
            accountData.alreadyExists ?
              '<p style="margin: 5px 0; color: #856404;"><small>⚠️ Usa la password del tuo account esistente per accedere</small></p>' :
              ''
          }
        </div>
        <p><strong>📲 Accedi all'app:</strong></p>
        <div style="margin: 15px 0;">
          <a href="https://app.agilityclublabora.com" style="display: inline-block; background-color: #2196f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            🌐 Apri Web App
          </a>
        </div>
        <p style="margin-top: 10px; color: #666; font-size: 14px;">
          <em>Puoi accedere all'app direttamente dal tuo browser, su qualsiasi dispositivo.</em>
        </p>
        <p style="margin-top: 15px;"><strong>Cosa puoi fare con l'app:</strong></p>
        <ul>
          <li>📅 Prenotare lezioni e allenamenti</li>
          <li>🐕 Gestire i tuoi binomi (cane-conduttore)</li>
          <li>📊 Monitorare i progressi</li>
          <li>💬 Comunicare con gli istruttori</li>
        </ul>
      </div>
    ` : '';

    const annoCorrente = new Date().getFullYear();

    return `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Conferma rinnovo iscrizione</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border: 1px solid #dddddd;
          }
          .header {
            background-color: #28a745;
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: normal;
          }
          .content {
            padding: 30px 20px;
          }
          .welcome {
            font-size: 18px;
            color: #28a745;
            margin-bottom: 20px;
            font-weight: bold;
          }
          .info-box {
            background-color: #f0f8ff;
            padding: 20px;
            border-left: 4px solid #2c5aa0;
            margin: 20px 0;
          }
          .important {
            background-color: #fff3cd;
            padding: 20px;
            border: 1px solid #ffeaa7;
            margin: 20px 0;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666666;
            border-top: 1px solid #e9ecef;
          }
          .contact-info {
            background-color: #e3f2fd;
            padding: 15px;
            margin: 20px 0;
            border: 1px solid #bbdefb;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Rinnovo Iscrizione </h1>
            <p style="margin: 10px 0 0 0;">Agility Club Labora - A.S.D.</p>
          </div>

          <div class="content">
            <p class="welcome">Gentile ${rinnovoData.nome} ${rinnovoData.cognome},</p>

            <p>il tuo rinnovo dell'iscrizione per l'anno corrente è stato completato con successo!</p>

            <div class="info-box">
              <p><strong>✓ La tua iscrizione è stata rinnovata</strong> e sei nuovamente socio attivo della nostra associazione.</p>
              
            </div>

            ${signatureInfo}

            ${accountInfo}

            <div class="important">
              <h3 style="margin-top: 0; color: #856404;">📋 Prossimi passi</h3>
              ${signatureLog ? `
                <p><strong>✓ Modulo firmato digitalmente</strong><br>
                Il tuo modulo è stato firmato elettronicamente e non necessita di essere stampato.</p>
              ` : `
                <p><strong>📄 Modulo da firmare</strong><br>
                Il modulo allegato deve essere <strong>stampato e firmato a mano</strong>, poi consegnato al campo o inviato via email/WhatsApp.</p>
              `}
              <p><strong>💶 Pagamento quota annuale: €15,00</strong></p>
              <p>Per completare il rinnovo, versa la quota di <strong>15 euro</strong>:</p>
              <ul style="margin: 10px 0 10px 20px; line-height: 1.8;">
                <li><strong>In contanti al campo</strong> durante gli orari di apertura</li>
                <li><strong>Bonifico bancario:</strong><br>
                    IBAN: IT73V0503402200000000003040<br>
                    Intestatario: A.S.D. AGILITY CLUB LA BORA<br>
                    Causale: Quota associativa - ${rinnovoData.nome} ${rinnovoData.cognome}
                </li>
              </ul>
              <p style="margin-bottom: 0;"><strong>Ti aspettiamo al campo!</strong></p>
            </div>

            <div class="contact-info">
              <h3 style="margin-top: 0; color: #1976d2;">📞 Contatti</h3>
              <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:laboratrieste@gmail.com" style="color: #2c5aa0;">laboratrieste@gmail.com</a></p>
              <p style="margin: 5px 0;"><strong>WhatsApp:</strong> <a href="https://wa.me/393500693832" style="color: #25D366;">+39 350 0693832</a></p>
            </div>

            <p>Per qualsiasi informazione, non esitare a contattarci!</p>

            <p style="margin-top: 30px;">Cordiali saluti,<br>
            <strong>Lo Staff di Agility Club Labora</strong></p>
          </div>

          <div class="footer">
            <p><strong>Agility Club Labora - A.S.D.</strong></p>
            <p>Email inviata a ${rinnovoData.email} in seguito al rinnovo iscrizione</p>
            <p>Anno ${annoCorrente} - Tutti i diritti riservati</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Genera HTML email per admin (rinnovo)
   */
  generateRinnovoAdminEmailContent(rinnovoData, signatureLog = null, accountData = null) {
    const signatureSection = signatureLog ? `
      <div class="section">
        <h3>🔐 Firma Elettronica</h3>
        <div style="background-color: #e8f5e9; padding: 15px; border-left: 3px solid #4caf50;">
          <div class="field">
            <span class="field-label">Timestamp firma:</span>
            <span class="field-value">${new Date(signatureLog.signatureTimestamp).toLocaleString('it-IT')}</span>
          </div>
          <div class="field">
            <span class="field-label">ID Documento:</span>
            <span class="field-value"><code>${signatureLog.documentId}</code></span>
          </div>
          <div class="field">
            <span class="field-label">Hash documento:</span>
            <span class="field-value"><code style="font-size: 10px; word-break: break-all;">${signatureLog.documentHash}</code></span>
          </div>
          <div class="field">
            <span class="field-label">IP (anon.):</span>
            <span class="field-value">${signatureLog.technical.ipAddress}</span>
          </div>
        </div>
      </div>
    ` : '';

    const accountSection = accountData ? `
      <div class="section">
        <h3>📱 Account App</h3>
        <div style="background-color: #e3f2fd; padding: 15px; border-left: 3px solid #2196f3;">
          <div class="field">
            <span class="field-label">UID Firebase:</span>
            <span class="field-value">${accountData.uid}</span>
          </div>
          <div class="field">
            <span class="field-label">Email:</span>
            <span class="field-value">${accountData.email}</span>
          </div>
          <div class="field">
            <span class="field-label">Metodo accesso:</span>
            <span class="field-value">${accountData.authMethod === 'google' ? '🔐 Google Sign-In' : '📧 Email e Password'}</span>
          </div>
          <div class="field">
            <span class="field-label">Stato:</span>
            <span class="field-value">${accountData.alreadyExists ? '⚠️ Account esistente aggiornato' : '✓ Nuovo account creato'}</span>
          </div>
        </div>
      </div>
    ` : '';

    const annoCorrente = new Date().getFullYear();

    return `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rinnovo iscrizione</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.5;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 700px;
            margin: 20px auto;
            background-color: #ffffff;
            border: 1px solid #ddd;
          }
          .header {
            background-color: #28a745;
            color: white;
            padding: 20px;
            text-align: center;
          }
          .content {
            padding: 25px;
          }
          .section {
            margin-bottom: 25px;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
          }
          .section:last-child {
            border-bottom: none;
          }
          .section h3 {
            color: #28a745;
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 16px;
          }
          .field {
            margin: 8px 0;
            display: flex;
          }
          .field-label {
            font-weight: bold;
            min-width: 140px;
            color: #555;
          }
          .field-value {
            flex: 1;
          }
          .summary {
            background-color: #d4edda;
            padding: 15px;
            border: 1px solid #c3e6cb;
            margin-bottom: 20px;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #e9ecef;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">Rinnovo Iscrizione Ricevuto</h2>
            
          </div>

          <div class="content">
            <div class="summary">
              <h3 style="margin-top: 0; color: #155724;">Riepilogo rinnovo</h3>
              <p><strong>Socio:</strong> ${rinnovoData.nome} ${rinnovoData.cognome}</p>
              <p><strong>Email:</strong> ${rinnovoData.email}</p>
              <p><strong>Codice Fiscale:</strong> ${rinnovoData.codiceFiscale}</p>
              <p style="margin-bottom: 0;"><strong>Data rinnovo:</strong> ${new Date().toLocaleDateString('it-IT')}</p>
            </div>

            <div class="section">
              <h3>Consensi</h3>
              <div class="field">
                <span class="field-label">Privacy:</span>
                <span class="field-value">${rinnovoData.consensoPrivacy ? '✓ Accettato' : '✗ Non accettato'}</span>
              </div>
              <div class="field">
                <span class="field-label">Utilizzo social:</span>
                <span class="field-value">${rinnovoData.consensoSocial ? '✓ Accettato' : '✗ Non accettato'}</span>
              </div>
              <div class="field">
                <span class="field-label">Regolamento:</span>
                <span class="field-value">${rinnovoData.consensoRegolamento ? '✓ Accettato' : '✗ Non accettato'}</span>
              </div>
              <div class="field">
                <span class="field-label">Newsletter:</span>
                <span class="field-value">${rinnovoData.consensoNewsletter ? '✓ Accettato' : '✗ Non accettato'}</span>
              </div>
            </div>

            ${signatureSection}

            ${accountSection}

            <div class="section">
              <h3>Stato Modulo</h3>
              ${signatureLog ? `
                <p style="color: #28a745;"><strong>✓ Modulo firmato digitalmente</strong> - Non necessita firma cartacea</p>
              ` : `
                <p style="color: #ffc107;"><strong>⚠️ Modulo da firmare a mano</strong> - Il socio deve stampare, firmare e consegnare</p>
              `}
            </div>

            <div class="section">
              <h3>Pagamento</h3>
              <p><strong>Quota annuale: €15,00</strong></p>
              <p>Il socio deve versare la quota tramite:</p>
              <ul style="margin: 5px 0 0 20px;">
                <li>Contanti al campo</li>
                <li>Bonifico bancario (IBAN: IT73V0503402200000000003040)</li>
              </ul>
            </div>

            <div class="section">
              <h3>Note</h3>
              <p>Il socio ha completato il rinnovo per l'anno ${annoCorrente}. I dati sono stati salvati nel foglio "Rinnovi".</p>
              <p style="margin-bottom: 0;">I consensi sono stati aggiornati su Firebase.</p>
            </div>
          </div>

          <div class="footer">
            <p>Email generata automaticamente dal sistema - ${new Date().toLocaleString('it-IT')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();