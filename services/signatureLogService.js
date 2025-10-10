const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

/**
 * Servizio per il logging sicuro delle firme elettroniche
 * Conforme GDPR - registra solo dati necessari per la tracciabilità
 */
class SignatureLogService {
  constructor() {
    this.logsDir = path.join(__dirname, '../logs');
    this.ensureLogsDirectory();
  }

  /**
   * Assicura che la directory logs esista
   */
  async ensureLogsDirectory() {
    try {
      await fs.mkdir(this.logsDir, { recursive: true });
    } catch (error) {
      console.error('Errore creazione directory logs:', error);
    }
  }

  /**
   * Genera hash SHA256 del documento firmato
   * @param {Buffer} pdfBuffer - Buffer del PDF
   * @returns {string} Hash esadecimale
   */
  generateDocumentHash(pdfBuffer) {
    return crypto.createHash('sha256').update(pdfBuffer).digest('hex');
  }

  /**
   * Genera hash della firma per verifica integrità
   * @param {string} signatureDataUrl - Data URL della firma
   * @returns {string} Hash esadecimale
   */
  generateSignatureHash(signatureDataUrl) {
    return crypto.createHash('sha256').update(signatureDataUrl).digest('hex');
  }

  /**
   * Anonimizza l'IP per conformità GDPR
   * @param {string} ip - Indirizzo IP completo
   * @returns {string} IP anonimizzato
   */
  anonymizeIP(ip) {
    if (!ip) return 'unknown';

    // Rimuovi prefisso IPv6 se presente
    const cleanIp = ip.replace(/^::ffff:/, '');

    // IPv4: mantieni solo i primi 3 ottetti
    if (cleanIp.includes('.')) {
      const parts = cleanIp.split('.');
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }

    // IPv6: mantieni solo i primi 4 gruppi
    if (cleanIp.includes(':')) {
      const parts = cleanIp.split(':');
      return `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}::`;
    }

    return 'unknown';
  }

  /**
   * Crea un log completo della firma
   * @param {Object} params - Parametri del log
   * @returns {Object} Oggetto log strutturato
   */
  createSignatureLog(params) {
    const {
      formData,
      signatureDataUrl,
      pdfBuffer,
      ipAddress,
      userAgent
    } = params;

    const timestamp = new Date().toISOString();
    const documentHash = this.generateDocumentHash(pdfBuffer);
    const signatureHash = this.generateSignatureHash(signatureDataUrl);
    const anonymizedIP = this.anonymizeIP(ipAddress);

    const logEntry = {
      // Identificazione documento
      documentId: `${formData.cognome}_${formData.nome}_${Date.now()}`,
      documentHash,

      // Informazioni firma
      signatureHash,
      signatureTimestamp: timestamp,

      // Dati utente (GDPR compliant)
      signer: {
        nome: formData.nome,
        cognome: formData.cognome,
        email: formData.email,
        codiceFiscale: formData.codiceFiscale
      },

      // Metadati tecnici (anonimizzati)
      technical: {
        ipAddress: anonymizedIP, // IP anonimizzato
        userAgent: this.sanitizeUserAgent(userAgent),
        signatureMethod: 'html5-canvas',
        pdfVersion: '1.7'
      },

      // Conformità legale
      legal: {
        gdprCompliant: true,
        dataRetentionYears: 10, // Conforme normativa ASD
        consentGiven: formData.consensoPrivacy,
        consentTimestamp: timestamp
      },

      // Consensi per firma digitale
      consents: {
        regolamento: formData.consensoRegolamento || false,
        privacy: formData.consensoPrivacy || false,
        social: formData.consensoSocial || false,
        newsletter: formData.consensoNewsletter || false,
        timestamp: timestamp,
        method: 'digital-signature-form',
        note: 'Consenso regolamento obbligatorio per firma digitale. Privacy già fornito nella sezione apposita. Newsletter facoltativa.'
      },

      // Audit trail
      audit: {
        createdAt: timestamp,
        version: '1.0',
        service: 'signatureLogService'
      }
    };

    return logEntry;
  }

  /**
   * Sanitizza lo user agent rimuovendo info potenzialmente sensibili
   * @param {string} userAgent - User agent completo
   * @returns {string} User agent sanitizzato
   */
  sanitizeUserAgent(userAgent) {
    if (!userAgent) return 'unknown';

    // Mantieni solo browser e sistema operativo principale
    const patterns = [
      /(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/i,
      /(Windows|Mac|Linux|Android|iOS)[\s\w.]*/i
    ];

    const matches = patterns.map(pattern => {
      const match = userAgent.match(pattern);
      return match ? match[0] : '';
    }).filter(Boolean);

    return matches.join(' ') || 'unknown';
  }

  /**
   * Salva il log su file JSON (backup locale)
   * @param {Object} logEntry - Entry del log
   */
  async saveLogToFile(logEntry) {
    try {
      const fileName = `signature_log_${logEntry.documentId}.json`;
      const filePath = path.join(this.logsDir, fileName);

      await fs.writeFile(
        filePath,
        JSON.stringify(logEntry, null, 2),
        'utf8'
      );

      console.log(`Log firma salvato: ${fileName}`);
      return filePath;
    } catch (error) {
      console.error('Errore salvataggio log su file:', error);
      throw error;
    }
  }

  /**
   * Prepara i dati del log per Google Sheets
   * @param {Object} logEntry - Entry del log
   * @returns {Array} Array di valori per Google Sheets
   */
  prepareLogForGoogleSheets(logEntry) {
    return [
      logEntry.documentId,
      logEntry.signatureTimestamp,
      logEntry.signer.nome,
      logEntry.signer.cognome,
      logEntry.signer.email,
      logEntry.signer.codiceFiscale,
      logEntry.documentHash,
      logEntry.signatureHash,
      logEntry.technical.ipAddress,
      logEntry.technical.userAgent,
      logEntry.legal.consentGiven ? 'Sì' : 'No',
      logEntry.legal.gdprCompliant ? 'Sì' : 'No'
    ];
  }

  /**
   * Genera un report leggibile della firma
   * @param {Object} logEntry - Entry del log
   * @returns {string} Report formattato
   */
  generateSignatureReport(logEntry) {
    return `
╔════════════════════════════════════════════════════════════════╗
║           CERTIFICATO DI FIRMA ELETTRONICA                     ║
╚════════════════════════════════════════════════════════════════╝

DOCUMENTO
  ID Documento:     ${logEntry.documentId}
  Hash SHA-256:     ${logEntry.documentHash}
  Data/Ora:         ${new Date(logEntry.signatureTimestamp).toLocaleString('it-IT')}

FIRMATARIO
  Nome:             ${logEntry.signer.nome} ${logEntry.signer.cognome}
  Codice Fiscale:   ${logEntry.signer.codiceFiscale}
  Email:            ${logEntry.signer.email}

FIRMA
  Hash Firma:       ${logEntry.signatureHash}
  Metodo:           ${logEntry.technical.signatureMethod}
  Timestamp:        ${logEntry.signatureTimestamp}

METADATI TECNICI
  IP (anonimizzato): ${logEntry.technical.ipAddress}
  User Agent:        ${logEntry.technical.userAgent}

CONFORMITÀ LEGALE
  GDPR Compliant:    ${logEntry.legal.gdprCompliant ? '✓' : '✗'}
  Consenso Privacy:  ${logEntry.legal.consentGiven ? '✓' : '✗'}
  Retention:         ${logEntry.legal.dataRetentionYears} anni

════════════════════════════════════════════════════════════════
Questo certificato è generato automaticamente dal sistema di
gestione iscrizioni Agility Club Labora ed ha valore probatorio
ai sensi del Regolamento eIDAS (UE) 910/2014.
════════════════════════════════════════════════════════════════
    `.trim();
  }

  /**
   * Verifica l'integrità di un documento firmato
   * @param {Buffer} pdfBuffer - Buffer del PDF da verificare
   * @param {string} originalHash - Hash originale del documento
   * @returns {boolean} True se il documento è integro
   */
  verifyDocumentIntegrity(pdfBuffer, originalHash) {
    const currentHash = this.generateDocumentHash(pdfBuffer);
    return currentHash === originalHash;
  }

  /**
   * Recupera un log salvato
   * @param {string} documentId - ID del documento
   * @returns {Object|null} Log entry o null se non trovato
   */
  async getLog(documentId) {
    try {
      const fileName = `signature_log_${documentId}.json`;
      const filePath = path.join(this.logsDir, fileName);
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Log non trovato per documentId: ${documentId}`);
      return null;
    }
  }

  /**
   * Pulisce log più vecchi di N anni (conformità retention GDPR)
   * @param {number} years - Anni di retention
   */
  async cleanOldLogs(years = 10) {
    try {
      const files = await fs.readdir(this.logsDir);
      const now = Date.now();
      const maxAge = years * 365 * 24 * 60 * 60 * 1000; // Anni in millisecondi

      for (const file of files) {
        if (!file.startsWith('signature_log_')) continue;

        const filePath = path.join(this.logsDir, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          await fs.unlink(filePath);
          console.log(`Log eliminato (retention scaduta): ${file}`);
        }
      }
    } catch (error) {
      console.error('Errore pulizia log vecchi:', error);
    }
  }
}

module.exports = new SignatureLogService();
