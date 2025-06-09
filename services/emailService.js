const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Configurazione per diversi provider
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === '465', // true per 465, false per altre porte
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };

    // Configurazione specifica per Aruba
    if (process.env.SMTP_HOST.includes('aruba')) {
      smtpConfig.tls = {
        rejectUnauthorized: false
      };
    }

    this.transporter = nodemailer.createTransport(smtpConfig);
    
    // Verifica la connessione all'avvio
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('Errore configurazione email:', error);
      } else {
        console.log('Server email pronto per inviare messaggi');
      }
    });
  }

  async sendFormEmail(formData, pdfBuffer) {
    try {
      // Nome file PDF con timestamp
      const pdfFileName = `iscrizione_${formData.cognome}_${formData.nome}_${Date.now()}.pdf`;
      
      // 1. EMAIL ALL'AMMINISTRATORE (con tutti i dettagli)
      const adminHtmlContent = this.generateAdminEmailContent(formData);
      
      const adminMailOptions = {
        from: `"Iscrizioni Agility Club" <${process.env.EMAIL_FROM}>`,
        to: process.env.EMAIL_TO,
		cc: 'walter.cleva@gmail.com', // <-- Aggiungi questa riga
        subject: `Nuova iscrizione: ${formData.nome} ${formData.cognome}`,
        html: adminHtmlContent,
        attachments: [
          {
            filename: pdfFileName,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      // 2. EMAIL ALL'UTENTE (conferma semplificata)
      const userHtmlContent = this.generateUserEmailContent(formData);
      
      const userMailOptions = {
        from: `"Agility Club Labora" <${process.env.EMAIL_FROM}>`,
        to: formData.email,
        subject: 'Conferma iscrizione - Agility Club Labora',
        html: userHtmlContent,
        attachments: [
          {
            filename: pdfFileName,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      // Invia entrambe le email
      console.log('Invio email all\'amministratore...');
      const adminResult = await this.transporter.sendMail(adminMailOptions);
      console.log('Email amministratore inviata:', adminResult.messageId);
      
      console.log('Invio email di conferma all\'utente...');
      const userResult = await this.transporter.sendMail(userMailOptions);
      console.log('Email utente inviata:', userResult.messageId);
      
      return {
        accepted: [...adminResult.accepted, ...userResult.accepted],
        adminMessageId: adminResult.messageId,
        userMessageId: userResult.messageId
      };
      
    } catch (error) {
      console.error('Errore invio email:', error);
      throw error;
    }
  }

  // Email dettagliata per l'amministratore
  generateAdminEmailContent(formData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0073aa; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
          .section { margin-bottom: 20px; }
          .section h3 { color: #0073aa; border-bottom: 2px solid #0073aa; padding-bottom: 5px; }
          .field { margin: 10px 0; }
          .field strong { display: inline-block; width: 150px; }
          .dog-section { background-color: #e9f3f9; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Nuova Iscrizione Ricevuta</h2>
          </div>
          
          <div class="content">
            <div class="section">
              <h3>Dati Personali</h3>
              <div class="field"><strong>Nome:</strong> ${formData.nome}</div>
              <div class="field"><strong>Cognome:</strong> ${formData.cognome}</div>
              <div class="field"><strong>Email:</strong> ${formData.email}</div>
              <div class="field"><strong>Telefono:</strong> ${formData.telefono}</div>
              <div class="field"><strong>Nato a:</strong> ${formData.natoA}</div>
              <div class="field"><strong>Nato il:</strong> ${this.formatDate(formData.natoIl)}</div>
              <div class="field"><strong>Residenza:</strong> ${formData.residenza}</div>
              <div class="field"><strong>Comune:</strong> ${formData.comune} (${formData.provincia})</div>
              <div class="field"><strong>CAP:</strong> ${formData.cap}</div>
              <div class="field"><strong>Codice Fiscale:</strong> ${formData.codiceFiscale}</div>
            </div>
            
            ${formData.nomeCane1 ? `
            <div class="section">
              <h3>Primo Cane</h3>
              <div class="dog-section">
                <div class="field"><strong>Nome:</strong> ${formData.nomeCane1}</div>
                <div class="field"><strong>Sesso:</strong> ${formData.sessoCane1 === 'M' ? 'Maschio' : formData.sessoCane1 === 'F' ? 'Femmina' : ''}</div>
                <div class="field"><strong>Razza:</strong> ${formData.razzaCane1 || 'Non specificata'}</div>
                <div class="field"><strong>Altezza:</strong> ${formData.altezzaCane1 ? formData.altezzaCane1 + ' cm' : 'Non specificata'}</div>
                <div class="field"><strong>Microchip:</strong> ${formData.microchipCane1 || 'Non specificato'}</div>
                <div class="field"><strong>Data nascita:</strong> ${this.formatDate(formData.dataNascitaCane1) || 'Non specificata'}</div>
                <div class="field"><strong>Proprietario:</strong> ${formData.proprietarioCane1 || 'Non specificato'}</div>
                <div class="field"><strong>Conduttore:</strong> ${formData.conduttoreCane1 || 'Non specificato'}</div>
              </div>
            </div>
            ` : ''}
            
            ${formData.aggiungiSecondoCane && formData.nomeCane2 ? `
            <div class="section">
              <h3>Secondo Cane</h3>
              <div class="dog-section">
                <div class="field"><strong>Nome:</strong> ${formData.nomeCane2}</div>
                <div class="field"><strong>Sesso:</strong> ${formData.sessoCane2 === 'M' ? 'Maschio' : formData.sessoCane2 === 'F' ? 'Femmina' : ''}</div>
                <div class="field"><strong>Razza:</strong> ${formData.razzaCane2 || 'Non specificata'}</div>
                <div class="field"><strong>Altezza:</strong> ${formData.altezzaCane2 ? formData.altezzaCane2 + ' cm' : 'Non specificata'}</div>
                <div class="field"><strong>Microchip:</strong> ${formData.microchipCane2 || 'Non specificato'}</div>
                <div class="field"><strong>Data nascita:</strong> ${this.formatDate(formData.dataNascitaCane2) || 'Non specificata'}</div>
                <div class="field"><strong>Proprietario:</strong> ${formData.proprietarioCane2 || 'Non specificato'}</div>
                <div class="field"><strong>Conduttore:</strong> ${formData.conduttoreCane2 || 'Non specificato'}</div>
              </div>
            </div>
            ` : ''}
            
            <div class="section">
              <p><strong>Consenso Privacy:</strong> ✓ Accettato</p>
              <p><strong>Data iscrizione:</strong> ${new Date().toLocaleString('it-IT')}</p>
            </div>
          </div>
          
          <div class="footer">
            <p>Questa email è stata generata automaticamente dal sistema di iscrizione.</p>
            <p>Il modulo compilato è allegato a questa email in formato PDF.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Email semplificata per l'utente
  generateUserEmailContent(formData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { 
            background: linear-gradient(135deg, #0073aa 0%, #005a87 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
            border-radius: 10px 10px 0 0;
          }
          .header h1 { margin: 0; font-size: 28px; }
          .content { 
            background-color: #ffffff; 
            padding: 30px; 
            border: 1px solid #e0e0e0;
            border-radius: 0 0 10px 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          .welcome { 
            font-size: 18px; 
            color: #0073aa; 
            margin-bottom: 20px;
            font-weight: bold;
          }
          .message { 
            background-color: #f0f8ff; 
            padding: 20px; 
            border-left: 4px solid #0073aa;
            margin: 20px 0;
          }
          .important { 
            background-color: #fff3cd; 
            padding: 15px; 
            border-radius: 5px;
            border: 1px solid #ffeaa7;
            margin: 20px 0;
          }
          .important h3 { 
            color: #856404; 
            margin-top: 0;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #0073aa;
            color: white;
            text-decoration: none;
            border-radius: 25px;
            margin: 20px 0;
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            font-size: 12px; 
            color: #666; 
            padding: 20px;
            border-top: 1px solid #e0e0e0;
          }
          .signature { 
            margin-top: 30px; 
            font-style: italic; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Benvenuto in Agility Club Labora!</h1>
          </div>
          
          <div class="content">
            <p class="welcome">Ciao ${formData.nome},</p>
            
            <p>La tua iscrizione è stata ricevuta con successo!</p>
            
            <div class="message">
              <p>Siamo felici di darti il benvenuto nella nostra associazione. La tua richiesta di iscrizione è stata registrata correttamente.</p>
            </div>
            
            <div class="important">
              <h3>⚠️ Importante - Azione richiesta</h3>
              <p><strong>Per completare l'iscrizione:</strong></p>
              <ol>
                <li>Trova in allegato a questa email il modulo di iscrizione con i tuoi dati</li>
                <li><strong>Stampa il modulo</strong></li>
                <li><strong>Firmalo</strong> negli appositi spazi</li>
                <li><strong>Consegnalo</strong> presso la nostra sede durante il primo allenamento</li>
              </ol>
            </div>
            
            <p>Il modulo allegato contiene tutti i dati che hai inserito durante la registrazione online. Verificali e, se riscontri errori, comunicacelo tempestivamente.</p>
            
            <p><strong>Prossimi passi:</strong></p>
            <ul>
			  <li>Prendi appuntamento con l'istruttore</li>
              <li>Inviaci una foto del passaporto del cane con le vaccinazioni</li>
              <li>Porta il modulo firmato all'appuntamento</li>
            </ul>
            
            <p>Per qualsiasi domanda o informazione, non esitare a contattarci.</p>
            <div class="important" style="margin-top: 30px; background-color: #e8f4fd; border: 1px solid #0073aa;">
    <h3 style="color: #0073aa; margin-top: 0;">💰 Modalità di Pagamento</h3>
    <p><strong>IL PAGAMENTO DELL'ISCRIZIONE E/O DEI CORSI PUÒ ESSERE EFFETTUATO PRESSO IL CENTRO OPPURE TRAMITE TRASFERIMENTO BANCARIO, CON LE SEGUENTI COORDINATE:</strong></p>
    <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0;">
        <p style="margin: 5px 0;"><strong>Intestatario:</strong> A.S.D. AGILITY CLUB LA BORA</p>
        <p style="margin: 5px 0;"><strong>IBAN:</strong> IT73V0503402200000000003040</p>
        <p style="margin: 5px 0;"><strong>BIC/SWIFT:</strong> BAPPIT21703</p>
    </div>
    <p style="font-size: 14px; color: #666;">Importante: Indica nella causale il tuo nome e cognome.</p>
</div>
            <div class="signature">
              <p>A presto al nostro centro cinofilo!</p>
              <p><strong>Il Team di Agility Club Labora</strong></p>
            </div>
          </div>
          
          <div class="footer">
            <p>Agility Club Labora - Associazione Sportiva Dilettantistica</p>
            <p>Questa email è stata inviata a ${formData.email} in seguito alla compilazione del modulo di iscrizione online.</p>
            <p>© ${new Date().getFullYear()} Agility Club Labora - Tutti i diritti riservati</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Metodo helper per formattare le date
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
  }
}

module.exports = new EmailService();