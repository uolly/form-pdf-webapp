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
      // Prepara il contenuto HTML dell'email
      const htmlContent = `
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

      const mailOptions = {
        from: `"Iscrizioni Agility Club" <${process.env.EMAIL_FROM}>`,
        to: process.env.EMAIL_TO,
        cc: formData.email, // Copia all'iscritto
        subject: `Nuova iscrizione: ${formData.nome} ${formData.cognome}`,
        html: htmlContent,
        attachments: [
          {
            filename: `iscrizione_${formData.cognome}_${formData.nome}_${Date.now()}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email inviata:', result.messageId);
      return result;
      
    } catch (error) {
      console.error('Errore invio email:', error);
      throw error;
    }
  }

  // Metodo helper per formattare le date
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
  }
}

module.exports = new EmailService();