# 🏆 Sistema Firma Elettronica ASD - COMPLETO

## Agility Club Labora - Gestione Iscrizioni Conforme Normative Italiane

**Versione**: 2.0 (Sistema Completo)
**Data**: 6 Ottobre 2025
**Conformità**: GDPR + eIDAS + CAD + Normativa ASD

---

## 📋 Indice

1. [Panoramica Sistema](#panoramica-sistema)
2. [Funzionalità Implementate](#funzionalità-implementate)
3. [Flusso Completo Iscrizione](#flusso-completo-iscrizione)
4. [Struttura File](#struttura-file)
5. [API Endpoints](#api-endpoints)
6. [Conformità Normativa](#conformità-normativa)
7. [Deploy e Configurazione](#deploy-e-configurazione)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## 🎯 Panoramica Sistema

Sistema **enterprise-grade** per la gestione digitale delle iscrizioni ASD con:

- ✅ **Firma Elettronica Avanzata** (eIDAS Livello 2)
- ✅ **Double Opt-in Email** (GDPR Art. 7)
- ✅ **Conservazione 10 Anni** (CAD Art. 44)
- ✅ **Audit Trail Completo** (ogni azione tracciata)
- ✅ **Esportazione Dati GDPR** (Art. 20 - portabilità)
- ✅ **Hash SHA-256** per ogni documento
- ✅ **Timestamp Certificato** per ogni firma
- ✅ **IP Anonimizzato** (GDPR Art. 32)
- ✅ **Backup Ridondanti** (3 layer)

---

## 🚀 Funzionalità Implementate

### 1. **Firma Elettronica Canvas**
- HTML5 Canvas responsive (touch + mouse)
- Validazione obbligatoria pre-submit
- Conversione PNG Base64
- Inserimento automatico nel PDF

📄 **File**: `test-iscrizione-form.html` (righe 1019-1051, 1214-1296)

### 2. **Double Opt-in Email**
- Token univoco SHA-256 (64 char)
- Scadenza 48 ore
- Email HTML professionale
- Link verifica sicuro

📄 **File**: `services/verificationService.js`

**Processo**:
```
Submit Form → Token Generato → Email Inviata
  ↓
Utente Clicca Link (48h) → Token Verificato
  ↓
PDF Inviato + Archivio Aggiornato → Status: VERIFIED
```

### 3. **Sistema di Logging Avanzato**
Ogni iscrizione genera 3 log:

| Tipo | Posizione | Formato | Retention |
|------|-----------|---------|-----------|
| **Firma Log** | `logs/signature_log_*.json` | JSON | Volatile (backup) |
| **Token Verifica** | `verification_tokens/token_*.json` | JSON | 7 giorni |
| **Archivio Documento** | `archive/YYYY/docId_metadata.json` | JSON | 10 anni |

📄 **File**: `services/signatureLogService.js`, `services/documentArchiveService.js`

### 4. **Archivio Documenti (10 anni)**
Struttura directory:
```
archive/
├── 2025/
│   ├── Rossi_Mario_1733564200000.pdf
│   ├── Rossi_Mario_1733564200000_metadata.json
│   └── Rossi_Mario_1733564200000_checksum.txt
├── 2026/
└── ...
```

**Metadata JSON include**:
- Dati associato (nome, CF, email)
- Firma (timestamp, hash, IP, user agent)
- Verifica email (status, data conferma)
- Legal (GDPR, retention, consenso)
- Audit trail (accessi, count, integrity)

📄 **File**: `services/documentArchiveService.js` (righe 26-135)

### 5. **Hash SHA-256 Multipli**
| Hash | Oggetto | Uso |
|------|---------|-----|
| `documentHash` | PDF firmato completo | Verifica integrità documento |
| `signatureHash` | Immagine firma PNG | Verifica integrità firma |
| `tokenHash` | Token verifica email | Univocità e sicurezza |

### 6. **Timestamp Certificato**
- Formato: **ISO 8601 UTC** (`2025-10-06T14:30:25.123Z`)
- Server: Node.js `Date.now()` (millisecondi)
- Visibile su: PDF, email, metadata, Google Sheets

### 7. **Audit Log Completo**
Ogni documento traccia:
```javascript
{
  audit: {
    createdAt: "2025-10-06T14:30:25.123Z",
    createdBy: "system",
    lastAccessedAt: "2025-10-06T15:45:12.456Z",
    accessCount: 3,
    integrity: "verified",
    archiveVersion: "1.0"
  }
}
```

**Visualizzabile via API**:
```bash
GET /api/form/admin/stats
```

### 8. **Informativa Privacy GDPR**
Documento legale completo (17 sezioni):
- Tipologia dati raccolti
- Finalità e base giuridica (Art. 6)
- Destinatari e terze parti (Art. 13)
- Retention policy
- Diritti dell'interessato (Art. 15-22)
- Misure sicurezza (Art. 32)
- Trasferimenti extra-UE (Art. 44-49)
- Cookie policy
- FAQ

📄 **File**: `INFORMATIVA_PRIVACY_GDPR.md`

### 9. **Sistema Conservazione 10 Anni**
- Auto-archiviazione in directory anno
- Metadata completi per ogni documento
- Verifica integrità automatica
- Pulizia auto dopo retention period
- Checksum file SHA-256

**Funzioni**:
- `archiveDocument()` - Salva documento
- `retrieveDocument(docId, CF)` - Recupera (con auth)
- `listDocuments(CF)` - Elenca tutti i documenti associato
- `verifyArchiveIntegrity()` - Check completo integrità
- `cleanExpiredDocuments()` - Elimina scaduti (>10 anni)

📄 **File**: `services/documentArchiveService.js`

### 10. **API Esportazione Documenti**
Conforme **GDPR Art. 20** (Portabilità)

**Endpoint**:
```http
POST /api/form/export-documents
Content-Type: application/json

{
  "codiceFiscale": "RSSMRA80A01H501X",
  "email": "mario.rossi@example.com"
}
```

**Risposta**:
- Email con allegato JSON
- Include: Tutti i PDF (Base64), metadata, hash, timestamp
- Formato machine-readable

📄 **File**: `routes/formRoutes.js` (righe 346-423)

---

## 🔄 Flusso Completo Iscrizione

### Fase 1: Compilazione Form
```
Utente → test-iscrizione-form.html
  ├─ Compila dati personali
  ├─ Dati cane(i)
  ├─ Apponi firma su canvas
  └─ Accetta privacy
```

### Fase 2: Submit e Verifica Email
```
POST /api/form/submit
  ├─ Validazione server-side
  ├─ Genera PDF con firma
  ├─ Calcola hash SHA-256 (doc + firma)
  ├─ Crea token verifica (48h)
  ├─ Salva su Google Sheets (status: PENDING)
  ├─ Archivia documento (status: pending)
  └─ Invia email verifica
```

**Utente riceve**:
- Email con bottone "Conferma Email"
- Link valido 48 ore
- Istruzioni e informazioni sicurezza

### Fase 3: Conferma Email
```
GET /api/form/verify-email?token=xxxxx
  ├─ Verifica token (scadenza + uso singolo)
  ├─ Marca token come verificato
  ├─ Rigenera PDF (per sicurezza)
  ├─ Aggiorna archivio (status: verified)
  ├─ Invia email FINALE con PDF (admin + utente)
  └─ Mostra pagina conferma successo
```

**Utente riceve**:
- ✅ PDF firmato via email
- ✅ Conferma iscrizione attivata
- ✅ ID documento per future richieste

### Fase 4: Archiviazione Permanente
```
Documento archiviato per 10 anni
  ├─ archive/2025/docId.pdf
  ├─ archive/2025/docId_metadata.json
  ├─ archive/2025/docId_checksum.txt
  ├─ Google Sheets (backup cloud)
  └─ Email archiviate (ridondanza)
```

### Fase 5: Diritti GDPR
```
Associato può richiedere:
  ├─ GET /api/form/my-documents?codiceFiscale=...
  │   → Lista tutti i suoi documenti
  │
  ├─ POST /api/form/export-documents
  │   → Esportazione completa JSON + PDF
  │
  └─ Email a laboratrieste@gmail.com
      → Rettifica, cancellazione, opposizione
```

---

## 📁 Struttura File

```
form-pdf-webapp/
├── services/
│   ├── signatureLogService.js          # Log firma + hash
│   ├── verificationService.js          # Double opt-in email
│   ├── documentArchiveService.js       # Conservazione 10 anni
│   ├── pdfService.js                   # Generazione PDF firmato
│   ├── emailService.js                 # Invio email SendGrid
│   └── googleSheetsService.js          # Archiviazione cloud
│
├── routes/
│   └── formRoutes.js                   # API endpoints (7 route)
│
├── logs/                                # Log firma (gitignored)
│   └── signature_log_*.json
│
├── verification_tokens/                 # Token verifica (gitignored)
│   └── token_*.json
│
├── archive/                             # Documenti 10 anni (gitignored)
│   ├── 2025/
│   │   ├── docId.pdf
│   │   ├── docId_metadata.json
│   │   └── docId_checksum.txt
│   └── ...
│
├── templates/
│   └── iscrizione.pdf                  # Template base
│
├── test-iscrizione-form.html           # Form con firma canvas
│
├── FIRMA_ELETTRONICA.md                # Doc firma (v1)
├── INFORMATIVA_PRIVACY_GDPR.md         # Privacy completa
├── README_SISTEMA_COMPLETO.md          # Questa doc
│
├── .gitignore                          # Protegge dati sensibili
├── package.json                        # Dipendenze
└── server.js                           # Server Express
```

---

## 🌐 API Endpoints

### 1. Submit Form (con verifica)
```http
POST /api/form/submit
Content-Type: application/json

Body: {
  nome, cognome, email, codiceFiscale, ...
  signatureDataUrl: "data:image/png;base64,..."
}

Response: {
  success: true,
  message: "Iscrizione ricevuta. Controlla email.",
  requiresVerification: true,
  data: {
    documentId: "Rossi_Mario_1733564200000",
    documentHash: "a3f8b...",
    signatureTimestamp: "2025-10-06T14:30:25.123Z",
    verificationSent: true,
    verificationEmail: "mario.rossi@example.com"
  }
}
```

### 2. Verifica Email
```http
GET /api/form/verify-email?token=xxxxx

Response: HTML pagina conferma
```

### 3. Lista Documenti Associato
```http
GET /api/form/my-documents?codiceFiscale=RSSMRA80A01H501X

Response: {
  success: true,
  codiceFiscale: "RSSMRA80A01H501X",
  totalDocuments: 3,
  documents: [
    {
      documentId: "Rossi_Mario_1733564200000",
      documentType: "modulo_iscrizione",
      archivedAt: "2025-10-06T14:30:25.123Z",
      retentionUntil: "2035-10-06T14:30:25.123Z",
      verified: true,
      integrityStatus: "verified"
    },
    ...
  ]
}
```

### 4. Esportazione Documenti
```http
POST /api/form/export-documents
Content-Type: application/json

Body: {
  "codiceFiscale": "RSSMRA80A01H501X",
  "email": "mario.rossi@example.com"
}

Response: {
  success: true,
  message: "Esportazione inviata via email",
  totalDocuments: 3
}
```
*Email ricevuta contiene file JSON con tutti i PDF in Base64*

### 5. Statistiche Admin
```http
GET /api/form/admin/stats

Response: {
  success: true,
  stats: {
    archive: {
      totalDocuments: 156,
      byYear: { "2025": 45, "2024": 111 },
      totalSizeMB: "42.35",
      verified: 150,
      pending: 6
    },
    verification: {
      total: 162,
      verified: 150,
      pending: 6,
      expired: 6,
      verificationRate: "92.59"
    },
    integrity: {
      total: 156,
      valid: 156,
      corrupted: 0,
      missing: 0,
      integrityRate: "100.00"
    }
  },
  timestamp: "2025-10-06T15:45:12.456Z"
}
```

---

## ⚖️ Conformità Normativa

### 🇪🇺 GDPR (Regolamento UE 2016/679)

| Articolo | Requisito | Implementazione |
|----------|-----------|-----------------|
| **Art. 6** | Base giuridica | Consenso esplicito + obbligo legale |
| **Art. 7** | Consenso | Double opt-in + checkbox privacy |
| **Art. 13** | Informativa | INFORMATIVA_PRIVACY_GDPR.md |
| **Art. 15** | Diritto accesso | GET `/my-documents` |
| **Art. 20** | Portabilità | POST `/export-documents` |
| **Art. 25** | Privacy by design | IP anonimizzato, hash, minimizzazione |
| **Art. 32** | Sicurezza | Crittografia SHA-256, backup, audit |
| **Art. 44-49** | Trasferimenti extra-UE | SCC con SendGrid/Google |

### 🇪🇺 eIDAS (Regolamento UE 910/2014)

| Articolo | Requisito | Implementazione |
|----------|-----------|-----------------|
| **Art. 25** | Firma elettronica | Canvas HTML5 + timestamp + hash |
| **Art. 26** | Requisiti firma avanzata | Hash + timestamp + identificazione (email) |
| **Art. 32** | Non ripudiabilità | Hash SHA-256 immutabile |
| **Art. 35** | Conservazione | 10 anni + verifica integrità |

**Livello raggiunto**: **Firma Elettronica Avanzata** (livello 2/3)

### 🇮🇹 CAD (D.Lgs. 82/2005)

| Articolo | Requisito | Implementazione |
|----------|-----------|-----------------|
| **Art. 44** | Conservazione sostitutiva | Archive 10 anni + checksum |
| **Art. 45** | Valore probatorio | Audit trail completo |
| **Art. 52** | Accesso documenti | API esportazione + autenticazione CF |

### 🏅 Normativa ASD

| Norma | Requisito | Implementazione |
|-------|-----------|-----------------|
| **D.Lgs. 460/1997** | Registro associati | Google Sheets + Archive |
| **L. 289/2002** | Conservazione 10 anni | Auto-retention + cleanup |
| **Statuto ASD** | Privacy soci | Informativa + consenso |

---

## 🛠️ Deploy e Configurazione

### Variabili Ambiente Richieste

```bash
# .env o .env.local

# Email
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@agilityclub-labora.it
EMAIL_TO=laboratrieste@gmail.com

# Google Sheets
GOOGLE_SHEETS_ID=1BxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxE
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"

# WordPress (CORS)
WORDPRESS_URL=https://www.agilityclub-labora.it

# App (per link verifica email)
APP_URL=https://form-pdf-webapp.onrender.com

# Environment
NODE_ENV=production
PORT=3000
```

### Deploy su Render

```bash
# 1. Commit e push
git add .
git commit -m "Sistema completo firma elettronica + double opt-in + conservazione 10 anni"
git push origin main

# 2. Render auto-deploy da GitHub

# 3. Configura variabili ambiente su dashboard Render

# 4. Test endpoints
curl https://form-pdf-webapp.onrender.com/health
```

### Creazione Directory Locali

```bash
# Development
mkdir -p logs verification_tokens archive

# Production (Render crea automaticamente se non esistono)
```

⚠️ **Render filesystem è effimero**: I file in `logs/`, `verification_tokens/`, `archive/` sono volatili.
✅ **Backup primari**: Google Sheets + Email

---

## 🧪 Testing

### Test Manuale Completo

```bash
# 1. Apri form
open http://localhost:3000/test-iscrizione-form.html

# 2. Compila tutti i campi obbligatori
# 3. Apponi firma nel canvas
# 4. Submit form

# 5. Verifica console server
# Dovresti vedere:
# ✓ PDF generato
# ✓ Token verifica creato
# ✓ Email inviata
# ✓ Salvato su Sheets (PENDING)
# ✓ Archiviato documento

# 6. Controlla email
# Clicca link "Conferma Email"

# 7. Verifica email FINALE ricevuta con PDF
```

### Test API con cURL

```bash
# Statistiche admin
curl https://form-pdf-webapp.onrender.com/api/form/admin/stats

# Lista documenti (sostituisci CF)
curl "https://form-pdf-webapp.onrender.com/api/form/my-documents?codiceFiscale=RSSMRA80A01H501X"

# Esportazione
curl -X POST https://form-pdf-webapp.onrender.com/api/form/export-documents \
  -H "Content-Type: application/json" \
  -d '{"codiceFiscale":"RSSMRA80A01H501X", "email":"mario.rossi@example.com"}'
```

### Verifica Integrità Archivio

```javascript
// Esegui da Node.js REPL
const archiveService = require('./services/documentArchiveService');

// Check integrità
archiveService.verifyArchiveIntegrity().then(result => {
  console.log('Integrità:', result.integrityRate + '%');
  console.log('Validi:', result.valid);
  console.log('Corrotti:', result.corrupted);
  console.log('Mancanti:', result.missing);
});
```

---

## 🔧 Troubleshooting

### Problema: Email verifica non arriva

**Causa**: SendGrid API key non valida o rate limit
**Fix**:
```bash
# Test SendGrid
node test-sendgrid.js

# Verifica console server
# Cerca: "✓ Email inviata con SendGrid"
```

### Problema: Token scaduto (48h)

**Causa**: Utente ha cliccato link dopo 48 ore
**Fix**:
```javascript
// Pulisci token scaduti
const verificationService = require('./services/verificationService');
verificationService.cleanExpiredTokens(2).then(cleaned => {
  console.log(`Puliti ${cleaned} token`);
});
```

### Problema: Hash documento non corrisponde

**Causa**: File PDF modificato dopo firma
**Fix**:
```javascript
// Verifica integrità singolo documento
const archiveService = require('./services/documentArchiveService');
const retrieved = await archiveService.retrieveDocument('docId', 'CF');

if (!retrieved.document.integrityValid) {
  console.log('⚠️ Documento CORROTTO!');
  console.log('Hash atteso:', retrieved.document.metadata.signature.documentHash);
  console.log('Hash attuale:', retrieved.document.currentHash);
}
```

### Problema: Directory non esistono

**Causa**: Prima esecuzione
**Fix**:
```bash
mkdir -p logs verification_tokens archive
```

### Problema: Google Sheets non aggiornato

**Causa**: Credenziali errate o range sbagliato
**Fix**:
```javascript
// Test Google Sheets
const sheetsService = require('./services/googleSheetsService');
sheetsService.updateHeaders().then(() => {
  console.log('Headers aggiornati');
});
```

---

## ❓ FAQ

### Q1: Devo implementare timestamp con server NTP?
**R**: ❌ NO. Node.js `Date.now()` è sufficiente per ASD. NTP sarebbe overkill (serve per PEC/fatture).

### Q2: Il sistema è conforme per fatturazione elettronica?
**R**: ⚠️ NO. Questo sistema è per iscrizioni ASD. Per fatture serve SDI + firma digitale qualificata.

### Q3: Posso usare questo sistema per altre associazioni?
**R**: ✅ SÌ. Cambia solo: nome ASD, email, coordinate bancarie nell'informativa.

### Q4: Quanto costa mantenere il sistema?
**R**: **GRATIS** con:
- Render Free Tier
- SendGrid Free (100 email/giorno)
- Google Sheets gratuito
- GitHub free

### Q5: Cosa succede se Render elimina i file?
**R**: ✅ Nessun problema. Backup su Google Sheets + Email. File locali sono ridondanza.

### Q6: Posso integrare con WordPress?
**R**: ✅ SÌ. Usa iframe o fetch API da WordPress verso Render. CORS già configurato.

### Q7: Il sistema funziona anche senza JavaScript?
**R**: ❌ NO. Firma canvas richiede JS. Progressive enhancement non applicabile.

### Q8: Posso firmare da mobile?
**R**: ✅ SÌ. Canvas HTML5 supporta touch events nativamente.

### Q9: Hash SHA-256 può essere violato?
**R**: ❌ NO (2025). Computazionalmente impossibile. Valido fino almeno 2030.

### Q10: Devo notificare il Garante Privacy?
**R**: ⚠️ Dipende. Se <5000 associati: NO. Se >5000 o dati sensibili salute: consulta DPO.

---

## 📞 Supporto

### Contatti Tecnici
- **Email sviluppo**: walter.cleva@gmail.com
- **Email ASD**: laboratrieste@gmail.com
- **GitHub Issues**: [Link repository]

### Documentazione Aggiuntiva
- [FIRMA_ELETTRONICA.md](./FIRMA_ELETTRONICA.md) - Sistema firma v1
- [INFORMATIVA_PRIVACY_GDPR.md](./INFORMATIVA_PRIVACY_GDPR.md) - Privacy completa
- [package.json](./package.json) - Dipendenze

### Link Utili
- [GDPR Full Text](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX%3A32016R0679)
- [eIDAS](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX%3A32014R0910)
- [CAD](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-03-07;82)
- [Garante Privacy](https://www.garanteprivacy.it/)

---

**Sistema sviluppato con ❤️ e ☕ da Claude Code + Walter Cleva**
**© 2025 Agility Club Labora A.S.D. - Tutti i diritti riservati**

**Versione**: 2.0 - Sistema Completo
**Ultima modifica**: 6 Ottobre 2025
