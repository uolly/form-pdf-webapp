const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

/**
 * Servizio Double Opt-in per verifica email associati
 * Conforme GDPR - Art. 7 (consenso esplicito)
 */
class VerificationService {
  constructor() {
    this.verificationDir = path.join(__dirname, '../verification_tokens');
    this.tokenExpiry = 48 * 60 * 60 * 1000; // 48 ore
    this.ensureVerificationDirectory();
  }

  /**
   * Assicura che la directory tokens esista
   */
  async ensureVerificationDirectory() {
    try {
      await fs.mkdir(this.verificationDir, { recursive: true });
    } catch (error) {
      console.error('Errore creazione directory verification:', error);
    }
  }

  /**
   * Genera token sicuro per verifica email
   * @param {Object} formData - Dati del form
   * @returns {string} Token univoco
   */
  generateVerificationToken(formData) {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    const data = `${formData.email}|${formData.codiceFiscale}|${timestamp}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return `${hash.substring(0, 32)}_${randomBytes}`;
  }

  /**
   * Salva token di verifica con dati associati
   * @param {string} token - Token generato
   * @param {Object} data - Dati da salvare
   */
  async saveVerificationToken(token, data) {
    try {
      const tokenData = {
        token,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.tokenExpiry).toISOString(),
        formData: data.formData,
        signatureDataUrl: data.signatureDataUrl,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        verified: false,
        verifiedAt: null
      };

      const fileName = `token_${token}.json`;
      const filePath = path.join(this.verificationDir, fileName);

      await fs.writeFile(
        filePath,
        JSON.stringify(tokenData, null, 2),
        'utf8'
      );

      console.log(`✓ Token verifica salvato: ${token.substring(0, 16)}...`);
      return tokenData;
    } catch (error) {
      console.error('Errore salvataggio token:', error);
      throw error;
    }
  }

  /**
   * Verifica token e restituisce dati
   * @param {string} token - Token da verificare
   * @returns {Object|null} Dati se valido, null altrimenti
   */
  async verifyToken(token) {
    try {
      const fileName = `token_${token}.json`;
      const filePath = path.join(this.verificationDir, fileName);

      const content = await fs.readFile(filePath, 'utf8');
      const tokenData = JSON.parse(content);

      // Verifica scadenza
      const now = Date.now();
      const expiresAt = new Date(tokenData.expiresAt).getTime();

      if (now > expiresAt) {
        console.log('❌ Token scaduto');
        return { valid: false, error: 'Token scaduto (48h)' };
      }

      // Verifica se già utilizzato
      if (tokenData.verified) {
        console.log('⚠️ Token già utilizzato');
        return { valid: false, error: 'Token già utilizzato' };
      }

      return { valid: true, data: tokenData };
    } catch (error) {
      console.error('Errore verifica token:', error);
      return { valid: false, error: 'Token non valido' };
    }
  }

  /**
   * Marca token come verificato
   * @param {string} token - Token da marcare
   */
  async markTokenAsVerified(token) {
    try {
      const fileName = `token_${token}.json`;
      const filePath = path.join(this.verificationDir, fileName);

      const content = await fs.readFile(filePath, 'utf8');
      const tokenData = JSON.parse(content);

      tokenData.verified = true;
      tokenData.verifiedAt = new Date().toISOString();

      await fs.writeFile(
        filePath,
        JSON.stringify(tokenData, null, 2),
        'utf8'
      );

      console.log(`✓ Token verificato: ${token.substring(0, 16)}...`);
      return tokenData;
    } catch (error) {
      console.error('Errore marcatura token:', error);
      throw error;
    }
  }

  /**
   * Genera URL di verifica
   * @param {string} token - Token di verifica
   * @param {string} baseUrl - URL base applicazione
   * @returns {string} URL completo
   */
  generateVerificationUrl(token, baseUrl = process.env.APP_URL) {
    return `${baseUrl}/api/form/verify-email?token=${token}`;
  }

  /**
   * Genera email HTML per double opt-in
   * @param {Object} formData - Dati form
   * @param {string} verificationUrl - URL verifica
   * @returns {string} HTML email
   */
  generateVerificationEmail(formData, verificationUrl) {
    return `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Conferma Email - Agility Club Labora</title>
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
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #0073aa 0%, #005a87 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 30px 20px;
          }
          .verify-box {
            background: #e3f2fd;
            border: 2px solid #2196f3;
            border-radius: 8px;
            padding: 25px;
            margin: 20px 0;
            text-align: center;
          }
          .verify-box h2 {
            margin: 0 0 15px 0;
            color: #1565c0;
            font-size: 20px;
          }
          .verify-button {
            display: inline-block;
            background: #4caf50;
            color: white !important;
            text-decoration: none;
            padding: 15px 40px;
            border-radius: 50px;
            font-weight: bold;
            font-size: 16px;
            margin: 15px 0;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
            transition: all 0.3s;
          }
          .verify-button:hover {
            background: #45a049;
            transform: translateY(-2px);
          }
          .warning-box {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
          }
          .info-list {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .info-list dt {
            font-weight: bold;
            color: #0073aa;
            margin-top: 10px;
          }
          .info-list dd {
            margin: 5px 0 15px 0;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #dee2e6;
          }
          .security-note {
            background: #e8f5e9;
            border-left: 4px solid #4caf50;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Conferma la tua Email</h1>
            <p style="margin: 10px 0 0 0;">Agility Club Labora - A.S.D.</p>
          </div>

          <div class="content">
            <p><strong>Gentile ${formData.nome} ${formData.cognome},</strong></p>

            <p>Grazie per aver compilato il modulo di iscrizione all'Agility Club Labora!</p>

            <div class="verify-box">
              <h2>📧 Verifica il tuo indirizzo email</h2>
              <p>Per completare l'iscrizione e confermare la tua firma elettronica, clicca sul pulsante qui sotto:</p>
              <a href="${verificationUrl}" class="verify-button">
                ✓ CONFERMA EMAIL
              </a>
              <p style="margin-top: 15px; font-size: 14px; color: #666;">
                Questo link è valido per <strong>48 ore</strong>
              </p>
            </div>

            <div class="warning-box">
              <strong>⚠️ Importante:</strong> Fino alla conferma dell'email, la tua iscrizione rimarrà in stato "Pending". Solo dopo la verifica il documento firmato verrà processato e archiviato.
            </div>

            <div class="info-list">
              <dl>
                <dt>📋 Riepilogo dati iscrizione:</dt>
                <dd>
                  <strong>Nome:</strong> ${formData.nome} ${formData.cognome}<br>
                  <strong>Email:</strong> ${formData.email}<br>
                  <strong>Codice Fiscale:</strong> ${formData.codiceFiscale}<br>
                  ${formData.nomeCane1 ? `<strong>Cane:</strong> ${formData.nomeCane1}<br>` : ''}
                </dd>

                <dt>🔒 Sicurezza e Privacy:</dt>
                <dd>
                  Questa email fa parte del sistema di <strong>double opt-in</strong> obbligatorio per legge (GDPR Art. 7). Garantisce che:<br>
                  • Sei realmente tu ad aver compilato il form<br>
                  • Il tuo indirizzo email è valido e attivo<br>
                  • Hai dato consenso esplicito al trattamento dati<br>
                  • La firma elettronica è associata a te personalmente
                </dd>
              </dl>
            </div>

            <div class="security-note">
              <strong>🛡️ Nota di sicurezza:</strong> Se non hai compilato questo modulo, ignora questa email. Il link scadrà automaticamente dopo 48 ore e nessun dato verrà conservato.
            </div>

            <p style="margin-top: 30px;">
              <strong>Problemi con il link?</strong><br>
              Copia e incolla questo URL nel tuo browser:<br>
              <code style="background: #f4f4f4; padding: 5px 10px; display: inline-block; margin-top: 5px; word-break: break-all; font-size: 12px;">
                ${verificationUrl}
              </code>
            </p>

            <p style="margin-top: 30px;">
              Per domande contatta: <a href="mailto:laboratrieste@gmail.com">laboratrieste@gmail.com</a>
            </p>
          </div>

          <div class="footer">
            <p><strong>Agility Club Labora - A.S.D.</strong></p>
            <p>Questo messaggio è stato generato automaticamente dal sistema di gestione iscrizioni.</p>
            <p>© ${new Date().getFullYear()} - Tutti i diritti riservati</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Pulisce token scaduti (cron job)
   * @param {number} daysOld - Giorni vecchiaia
   */
  async cleanExpiredTokens(daysOld = 7) {
    try {
      const files = await fs.readdir(this.verificationDir);
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;
      let cleaned = 0;

      for (const file of files) {
        if (!file.startsWith('token_')) continue;

        const filePath = path.join(this.verificationDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const tokenData = JSON.parse(content);

        const createdAt = new Date(tokenData.createdAt).getTime();
        const age = now - createdAt;

        if (age > maxAge) {
          await fs.unlink(filePath);
          cleaned++;
        }
      }

      console.log(`✓ Puliti ${cleaned} token scaduti`);
      return cleaned;
    } catch (error) {
      console.error('Errore pulizia token:', error);
      throw error;
    }
  }

  /**
   * Ottieni statistiche verifiche
   */
  async getVerificationStats() {
    try {
      const files = await fs.readdir(this.verificationDir);
      let total = 0;
      let verified = 0;
      let pending = 0;
      let expired = 0;

      const now = Date.now();

      for (const file of files) {
        if (!file.startsWith('token_')) continue;
        total++;

        const filePath = path.join(this.verificationDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const tokenData = JSON.parse(content);

        const expiresAt = new Date(tokenData.expiresAt).getTime();

        if (tokenData.verified) {
          verified++;
        } else if (now > expiresAt) {
          expired++;
        } else {
          pending++;
        }
      }

      return {
        total,
        verified,
        pending,
        expired,
        verificationRate: total > 0 ? ((verified / total) * 100).toFixed(2) : 0
      };
    } catch (error) {
      console.error('Errore statistiche:', error);
      return { total: 0, verified: 0, pending: 0, expired: 0, verificationRate: 0 };
    }
  }
}

module.exports = new VerificationService();
