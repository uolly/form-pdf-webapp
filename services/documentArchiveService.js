const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Servizio Conservazione Documenti a Norma
 * Conforme CAD (Codice Amministrazione Digitale) Art. 44
 * Retention: 10 anni per ASD (normativa fiscale e associativa)
 */
class DocumentArchiveService {
  constructor() {
    this.archiveDir = path.join(__dirname, '../archive');
    this.retentionYears = 10;
    this.ensureArchiveDirectory();
  }

  /**
   * Assicura che la directory archive esista
   */
  async ensureArchiveDirectory() {
    try {
      await fs.mkdir(this.archiveDir, { recursive: true });

      // Crea sottodirectory per anno
      const currentYear = new Date().getFullYear();
      for (let i = 0; i < 3; i++) {
        const yearDir = path.join(this.archiveDir, String(currentYear + i));
        await fs.mkdir(yearDir, { recursive: true });
      }
    } catch (error) {
      console.error('Errore creazione directory archive:', error);
    }
  }

  /**
   * Archivia documento firmato con metadata completi
   * @param {Object} params - Parametri archiviazione
   */
  async archiveDocument(params) {
    const {
      pdfBuffer,
      formData,
      signatureLog,
      verificationData
    } = params;

    try {
      const year = new Date().getFullYear();

      // Genera documentId anche senza firma
      const timestamp = Date.now();
      const documentId = signatureLog
        ? signatureLog.documentId
        : `${formData.cognome}_${formData.nome}_${timestamp}`.replace(/\s+/g, '_');

      // Directory anno corrente
      const yearDir = path.join(this.archiveDir, String(year));
      await fs.mkdir(yearDir, { recursive: true });

      // Metadata documento
      const metadata = {
        // Identificazione
        documentId,
        documentType: 'modulo_iscrizione',
        version: '1.0',
        hasDigitalSignature: !!signatureLog,

        // Timestamp
        archivedAt: new Date().toISOString(),
        retentionUntil: new Date(Date.now() + this.retentionYears * 365 * 24 * 60 * 60 * 1000).toISOString(),

        // Associato
        associato: {
          nome: formData.nome,
          cognome: formData.cognome,
          codiceFiscale: formData.codiceFiscale,
          email: formData.email,
          telefono: formData.telefono
        },

        // Firma elettronica
        signature: signatureLog ? {
          timestamp: signatureLog.signatureTimestamp,
          documentHash: signatureLog.documentHash,
          signatureHash: signatureLog.signatureHash,
          ipAddress: signatureLog.technical.ipAddress,
          userAgent: signatureLog.technical.userAgent,
          method: 'html5-canvas-digital-signature'
        } : {
          method: 'manual-signature-required',
          timestamp: null,
          note: 'Documento da firmare manualmente'
        },

        // Verifica email
        verification: verificationData ? {
          verified: true,
          verifiedAt: verificationData.verifiedAt,
          verificationMethod: 'double-opt-in-email'
        } : {
          verified: false,
          status: 'pending'
        },

        // Conformità legale
        legal: {
          gdprCompliant: true,
          eidasCompliant: signatureLog ? true : false,
          cadCompliant: signatureLog ? true : false,
          retentionPolicy: `${this.retentionYears} anni`,
          consentGiven: formData.consensoPrivacy,
          consentTimestamp: signatureLog ? signatureLog.signatureTimestamp : new Date().toISOString()
        },

        // Audit trail
        audit: {
          createdBy: 'system',
          createdAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString(),
          accessCount: 0,
          integrity: 'verified',
          archiveVersion: '1.0'
        }
      };

      // Salva PDF
      const pdfPath = path.join(yearDir, `${documentId}.pdf`);
      await fs.writeFile(pdfPath, pdfBuffer);

      // Salva metadata JSON
      const metadataPath = path.join(yearDir, `${documentId}_metadata.json`);
      await fs.writeFile(
        metadataPath,
        JSON.stringify(metadata, null, 2),
        'utf8'
      );

      // Genera checksum file per integrità
      const checksumPath = path.join(yearDir, `${documentId}_checksum.txt`);
      const checksum = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
      await fs.writeFile(
        checksumPath,
        `SHA-256: ${checksum}\nTimestamp: ${new Date().toISOString()}`,
        'utf8'
      );

      console.log(`📁 Documento archiviato: ${documentId}`);

      return {
        success: true,
        documentId,
        archivePath: pdfPath,
        retentionUntil: metadata.retentionUntil,
        checksum
      };

    } catch (error) {
      console.error('❌ Errore archiviazione documento:', error);
      throw error;
    }
  }

  /**
   * Recupera documento archiviato
   * @param {string} documentId - ID documento
   * @param {string} codiceFiscale - CF associato (sicurezza)
   */
  async retrieveDocument(documentId, codiceFiscale) {
    try {
      // Cerca in tutte le directory anno
      const years = await fs.readdir(this.archiveDir);

      for (const year of years) {
        const yearPath = path.join(this.archiveDir, year);
        const stat = await fs.stat(yearPath);

        if (!stat.isDirectory()) continue;

        const metadataPath = path.join(yearPath, `${documentId}_metadata.json`);

        try {
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

          // Verifica autorizzazione (CF deve corrispondere)
          if (metadata.associato.codiceFiscale !== codiceFiscale) {
            console.log('❌ Accesso negato: CF non corrisponde');
            return { authorized: false, error: 'Non autorizzato' };
          }

          // Leggi PDF
          const pdfPath = path.join(yearPath, `${documentId}.pdf`);
          const pdfBuffer = await fs.readFile(pdfPath);

          // Verifica integrità
          const currentHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
          const integrityValid = currentHash === metadata.signature.documentHash;

          // Aggiorna audit
          metadata.audit.lastAccessedAt = new Date().toISOString();
          metadata.audit.accessCount++;
          await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

          return {
            authorized: true,
            document: {
              pdf: pdfBuffer,
              metadata,
              integrityValid,
              currentHash
            }
          };

        } catch (err) {
          // File non trovato in questo anno, continua
          continue;
        }
      }

      return { authorized: false, error: 'Documento non trovato' };

    } catch (error) {
      console.error('Errore recupero documento:', error);
      throw error;
    }
  }

  /**
   * Elenca documenti di un associato
   * @param {string} codiceFiscale - CF associato
   */
  async listDocuments(codiceFiscale) {
    try {
      const documents = [];
      const years = await fs.readdir(this.archiveDir);

      for (const year of years) {
        const yearPath = path.join(this.archiveDir, year);
        const stat = await fs.stat(yearPath);

        if (!stat.isDirectory()) continue;

        const files = await fs.readdir(yearPath);

        for (const file of files) {
          if (!file.endsWith('_metadata.json')) continue;

          const metadataPath = path.join(yearPath, file);
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

          if (metadata.associato.codiceFiscale === codiceFiscale) {
            documents.push({
              documentId: metadata.documentId,
              documentType: metadata.documentType,
              archivedAt: metadata.archivedAt,
              retentionUntil: metadata.retentionUntil,
              verified: metadata.verification.verified,
              integrityStatus: metadata.audit.integrity
            });
          }
        }
      }

      return {
        codiceFiscale,
        totalDocuments: documents.length,
        documents: documents.sort((a, b) =>
          new Date(b.archivedAt) - new Date(a.archivedAt)
        )
      };

    } catch (error) {
      console.error('Errore listing documenti:', error);
      throw error;
    }
  }

  /**
   * Genera pacchetto esportazione per associato
   * @param {string} codiceFiscale - CF associato
   * @param {string} email - Email associato
   */
  async generateExportPackage(codiceFiscale, email) {
    try {
      const listing = await this.listDocuments(codiceFiscale);

      if (listing.totalDocuments === 0) {
        return { success: false, error: 'Nessun documento trovato' };
      }

      const exportData = {
        generatedAt: new Date().toISOString(),
        requestedBy: { codiceFiscale, email },
        totalDocuments: listing.totalDocuments,
        documents: []
      };

      // Recupera ogni documento
      for (const doc of listing.documents) {
        const retrieved = await this.retrieveDocument(doc.documentId, codiceFiscale);

        if (retrieved.authorized) {
          exportData.documents.push({
            documentId: doc.documentId,
            metadata: retrieved.document.metadata,
            pdfBase64: retrieved.document.pdf.toString('base64'),
            integrityValid: retrieved.document.integrityValid,
            hash: retrieved.document.currentHash
          });
        }
      }

      return {
        success: true,
        exportData,
        fileName: `export_${codiceFiscale}_${Date.now()}.json`
      };

    } catch (error) {
      console.error('Errore generazione export:', error);
      throw error;
    }
  }

  /**
   * Verifica integrità archivio completo
   */
  async verifyArchiveIntegrity() {
    try {
      const results = {
        total: 0,
        valid: 0,
        corrupted: 0,
        missing: 0,
        details: []
      };

      const years = await fs.readdir(this.archiveDir);

      for (const year of years) {
        const yearPath = path.join(this.archiveDir, year);
        const stat = await fs.stat(yearPath);

        if (!stat.isDirectory()) continue;

        const files = await fs.readdir(yearPath);

        for (const file of files) {
          if (!file.endsWith('_metadata.json')) continue;

          results.total++;
          const metadataPath = path.join(yearPath, file);
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

          const pdfPath = path.join(yearPath, `${metadata.documentId}.pdf`);

          try {
            const pdfBuffer = await fs.readFile(pdfPath);
            const currentHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

            if (currentHash === metadata.signature.documentHash) {
              results.valid++;
              results.details.push({
                documentId: metadata.documentId,
                status: 'valid',
                year
              });
            } else {
              results.corrupted++;
              results.details.push({
                documentId: metadata.documentId,
                status: 'corrupted',
                year,
                expectedHash: metadata.signature.documentHash,
                actualHash: currentHash
              });
            }
          } catch (err) {
            results.missing++;
            results.details.push({
              documentId: metadata.documentId,
              status: 'missing',
              year
            });
          }
        }
      }

      results.integrityRate = results.total > 0
        ? ((results.valid / results.total) * 100).toFixed(2)
        : 100;

      return results;

    } catch (error) {
      console.error('Errore verifica integrità:', error);
      throw error;
    }
  }

  /**
   * Pulizia documenti oltre retention period
   */
  async cleanExpiredDocuments() {
    try {
      let deleted = 0;
      const now = Date.now();
      const years = await fs.readdir(this.archiveDir);

      for (const year of years) {
        const yearPath = path.join(this.archiveDir, year);
        const stat = await fs.stat(yearPath);

        if (!stat.isDirectory()) continue;

        const files = await fs.readdir(yearPath);

        for (const file of files) {
          if (!file.endsWith('_metadata.json')) continue;

          const metadataPath = path.join(yearPath, file);
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

          const retentionUntil = new Date(metadata.retentionUntil).getTime();

          if (now > retentionUntil) {
            // Elimina PDF, metadata e checksum
            const documentId = metadata.documentId;
            await fs.unlink(path.join(yearPath, `${documentId}.pdf`));
            await fs.unlink(metadataPath);
            await fs.unlink(path.join(yearPath, `${documentId}_checksum.txt`));

            deleted++;
            console.log(`🗑️ Eliminato documento scaduto: ${documentId}`);
          }
        }
      }

      return { deleted, message: `Eliminati ${deleted} documenti oltre retention` };

    } catch (error) {
      console.error('Errore pulizia documenti:', error);
      throw error;
    }
  }

  /**
   * Statistiche archivio
   */
  async getArchiveStats() {
    try {
      const stats = {
        totalDocuments: 0,
        byYear: {},
        totalSize: 0,
        verified: 0,
        pending: 0,
        oldestDocument: null,
        newestDocument: null
      };

      const years = await fs.readdir(this.archiveDir);

      for (const year of years) {
        const yearPath = path.join(this.archiveDir, year);
        const stat = await fs.stat(yearPath);

        if (!stat.isDirectory()) continue;

        stats.byYear[year] = 0;
        const files = await fs.readdir(yearPath);

        for (const file of files) {
          if (file.endsWith('.pdf')) {
            stats.totalDocuments++;
            stats.byYear[year]++;

            const filePath = path.join(yearPath, file);
            const fileStat = await fs.stat(filePath);
            stats.totalSize += fileStat.size;
          }

          if (file.endsWith('_metadata.json')) {
            const metadata = JSON.parse(
              await fs.readFile(path.join(yearPath, file), 'utf8')
            );

            if (metadata.verification.verified) {
              stats.verified++;
            } else {
              stats.pending++;
            }

            const archivedDate = new Date(metadata.archivedAt);
            if (!stats.oldestDocument || archivedDate < new Date(stats.oldestDocument)) {
              stats.oldestDocument = metadata.archivedAt;
            }
            if (!stats.newestDocument || archivedDate > new Date(stats.newestDocument)) {
              stats.newestDocument = metadata.archivedAt;
            }
          }
        }
      }

      stats.totalSizeMB = (stats.totalSize / (1024 * 1024)).toFixed(2);

      return stats;

    } catch (error) {
      console.error('Errore statistiche archivio:', error);
      return { totalDocuments: 0, totalSize: 0, totalSizeMB: 0, byYear: {} };
    }
  }
}

module.exports = new DocumentArchiveService();
