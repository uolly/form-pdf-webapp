# 📝 Sistema Firma Elettronica - Documentazione

## Panoramica

Sistema completo di firma elettronica integrato nel modulo iscrizioni ASD Agility Club Labora.
Conforme GDPR e Regolamento eIDAS (UE) 910/2014.

## 🎯 Funzionalità

### 1. **Canvas HTML5 per Firma**
- Firma tramite mouse o touch screen
- Supporto dispositivi mobili e tablet
- Dimensioni responsive e adattive
- Feedback visivo real-time

### 2. **Cattura e Processamento Firma**
- Conversione firma in PNG Base64
- Integrazione automatica nel PDF
- Posizionamento firma in basso a destra
- Timestamp visibile sul documento

### 3. **Sistema di Logging Avanzato**
Ogni firma genera un log completo contenente:
- **Timestamp ISO 8601** della firma
- **Hash SHA-256** del documento firmato
- **Hash SHA-256** della firma stessa
- **IP anonimizzato** (GDPR compliant)
- **User Agent sanitizzato**
- **Metadata tecnici** (browser, OS)

### 4. **Archiviazione Multi-layer**
- ✅ **Backup locale**: JSON files in `logs/` directory
- ✅ **Google Sheets**: Riga dedicata con metadati firma
- ✅ **Email**: PDF firmato inviato a utente e amministratori
- ✅ **Hash permanente**: Verifica integrità documento

### 5. **Conformità Legale**
- ✓ GDPR compliant (IP anonimizzato, consenso esplicito)
- ✓ eIDAS compliant (tracciabilità e non ripudiabilità)
- ✓ Retention 10 anni (normativa ASD)
- ✓ Audit trail completo

## 📁 Struttura File

```
form-pdf-webapp/
├── services/
│   ├── signatureLogService.js      # Logging e hash firma
│   ├── pdfService.js                # Inserimento firma nel PDF
│   ├── emailService.js              # Email con info firma
│   └── googleSheetsService.js       # Archiviazione metadati
├── routes/
│   └── formRoutes.js                # Endpoint API con validazione firma
├── logs/
│   ├── README.md
│   └── signature_log_*.json         # Backup locali (gitignored)
├── test-iscrizione-form.html        # Form con canvas firma
└── FIRMA_ELETTRONICA.md             # Questa documentazione
```

## 🔧 Componenti Tecnici

### Frontend (test-iscrizione-form.html)

**Libreria**: [signature_pad](https://github.com/szimek/signature_pad) v5.0.3 (CDN)

**Elementi HTML**:
```html
<canvas id="signatureCanvas"></canvas>
<button id="clearSignatureBtn">Cancella firma</button>
<span id="signatureStatus">⚠️ Firma richiesta</span>
```

**JavaScript**:
- Inizializzazione canvas responsive
- Gestione eventi touch/mouse
- Validazione firma pre-submit
- Conversione a Base64 PNG

### Backend (Node.js/Express)

**Dipendenze**:
```json
{
  "signature_pad": "^5.1.1",
  "pdf-lib": "^1.17.1",
  "crypto": "built-in"
}
```

**Flusso Elaborazione**:
1. Ricezione dati form + firma Base64
2. Validazione formato firma (regex)
3. Generazione PDF con firma embedded
4. Creazione log firma (hash + metadata)
5. Salvataggio log su file JSON
6. Archiviazione su Google Sheets
7. Invio email con PDF firmato

## 🔐 Sicurezza e Privacy

### Anonimizzazione IP (GDPR Art. 32)
```javascript
// IPv4: 192.168.1.100 → 192.168.1.0
// IPv6: 2001:db8:a0b:12f0:: → 2001:db8:a0b:12f0::
```

### Hashing Crittografico
```javascript
SHA-256(documento) → Hash univoco immutabile
SHA-256(firma) → Verifica integrità firma
```

### User Agent Sanitizzato
Mantiene solo browser e OS, rimuove plugin e identificatori sensibili.

## 📊 Formato Log Firma

```json
{
  "documentId": "Rossi_Mario_1733564200000",
  "documentHash": "a3f8b2c1d...",
  "signatureHash": "7e9d4a1f...",
  "signatureTimestamp": "2025-10-06T14:30:25.123Z",
  "signer": {
    "nome": "Mario",
    "cognome": "Rossi",
    "email": "mario.rossi@example.com",
    "codiceFiscale": "RSSMRA80A01H501X"
  },
  "technical": {
    "ipAddress": "192.168.1.0",
    "userAgent": "Chrome/120.0 Windows NT 10.0",
    "signatureMethod": "html5-canvas",
    "pdfVersion": "1.7"
  },
  "legal": {
    "gdprCompliant": true,
    "dataRetentionYears": 10,
    "consentGiven": true,
    "consentTimestamp": "2025-10-06T14:30:25.123Z"
  },
  "audit": {
    "createdAt": "2025-10-06T14:30:25.123Z",
    "version": "1.0",
    "service": "signatureLogService"
  }
}
```

## 📧 Email Notifica

### Email Utente
- Conferma iscrizione ricevuta
- Box firma elettronica con:
  - Timestamp firma
  - ID documento
  - Hash documento (primi 32 caratteri)
  - Riferimento normativa eIDAS

### Email Amministratori
- Dettagli iscrizione completi
- Sezione firma elettronica con:
  - Tutti gli hash (completi)
  - IP anonimizzato
  - User agent
  - Flag GDPR compliance

## 🗄️ Google Sheets - Nuove Colonne

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| `Timestamp Firma` | ISO 8601 | Data/ora firma |
| `Hash Firma` | SHA-256 | Integrità firma |
| `Hash Documento` | SHA-256 | Integrità PDF |
| `IP Firma (anonimizzato)` | String | IP GDPR-safe |
| `User Agent Firma` | String | Browser/OS sanitizzato |

## 🚀 Deploy su Render

### Variabili Ambiente Richieste
```bash
# Email
SENDGRID_API_KEY=SG.xxx
EMAIL_FROM=noreply@agilityclub.it
EMAIL_TO=admin@agilityclub.it

# Google Sheets
GOOGLE_SHEETS_ID=xxx
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----\n"

# WordPress (CORS)
WORDPRESS_URL=https://tuo-sito.com
```

### File System Persistente
⚠️ **Render non ha filesystem persistente!**

I log JSON in `logs/` sono **volatili** e vengono persi ad ogni deploy.

**Soluzioni**:
1. ✅ **Google Sheets** (già implementato) - storage principale
2. ✅ **Email backup** (già implementato) - ridondanza
3. 🔄 **Opzionale**: Integra AWS S3 o Google Cloud Storage per backup permanente

### Cron Job Pulizia Log
```javascript
// In server.js
const signatureLogService = require('./services/signatureLogService');

// Ogni settimana pulisci log > 10 anni
setInterval(() => {
  signatureLogService.cleanOldLogs(10);
}, 7 * 24 * 60 * 60 * 1000);
```

## 🧪 Testing

### Test Locale
```bash
# 1. Avvia server locale
npm run dev

# 2. Apri form
open test-iscrizione-form.html

# 3. Compila form e firma
# 4. Verifica log creato in logs/
ls -la logs/

# 5. Verifica PDF generato
open templates/debug_compilato.pdf
```

### Test Produzione
```bash
# 1. Deploy su Render
git push origin main

# 2. Testa form production
curl -X POST https://tua-app.onrender.com/api/form/submit \
  -H "Content-Type: application/json" \
  -d @test-data.json
```

## 🔍 Verifica Integrità Documento

Per verificare che un PDF non sia stato alterato:

```javascript
const crypto = require('crypto');
const fs = require('fs');

// 1. Leggi PDF
const pdfBuffer = fs.readFileSync('documento.pdf');

// 2. Calcola hash
const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

// 3. Confronta con hash originale nel log
console.log('Match:', hash === logEntry.documentHash);
```

## 📋 Checklist Post-Deploy

- [ ] Test firma su mobile (touch)
- [ ] Test firma su desktop (mouse)
- [ ] Verifica email utente ricevuta con PDF allegato
- [ ] Verifica email admin con metadati firma
- [ ] Controlla Google Sheets - nuove colonne popolate
- [ ] Verifica hash documento in email = hash nel PDF
- [ ] Test validazione: submit senza firma (deve bloccare)
- [ ] Test privacy: IP deve essere anonimizzato
- [ ] Verifica CORS da WordPress

## 🆘 Troubleshooting

### Firma non appare nel PDF
**Causa**: Formato Base64 non valido o coordinate errate

**Fix**:
```javascript
// pdfService.js:190
const base64Data = cleanData.signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
console.log('Base64 length:', base64Data.length); // Debug
```

### Log non salvato
**Causa**: Directory `logs/` non esiste

**Fix**:
```bash
mkdir -p logs
chmod 755 logs
```

### Email senza info firma
**Causa**: `signatureLog` non passato a `emailService`

**Fix**: Verifica `formRoutes.js:108`
```javascript
await emailService.sendFormEmail(formData, pdfBuffer, signatureLog);
```

### Canvas non responsivo
**Causa**: Manca resize handler

**Fix**: Verifica `test-iscrizione-form.html:1227`
```javascript
window.addEventListener('resize', resizeCanvas);
```

## 📚 Riferimenti Normativi

- **GDPR**: Regolamento UE 2016/679 (protezione dati personali)
- **eIDAS**: Regolamento UE 910/2014 (identificazione elettronica)
- **CAD**: Codice Amministrazione Digitale (Italia)
- **ISO 32000-2:2020**: Specifica PDF 2.0

## 🎓 Best Practice

1. ✅ **Mai salvare firma raw** (solo hash)
2. ✅ **Timestamp immutabile** (ISO 8601 UTC)
3. ✅ **Hash prima del flatten** PDF
4. ✅ **Log ridondanti** (file + sheets + email)
5. ✅ **IP anonimizzato** (GDPR Art. 32)
6. ✅ **User agent sanitizzato** (no fingerprint)
7. ✅ **Validazione client + server**
8. ✅ **Backup automatico** multi-layer

## 📞 Support

Per problemi tecnici:
- Repository: [form-pdf-webapp](https://github.com/your-repo)
- Email: walter.cleva@gmail.com
- Docs: Questa documentazione

---

**Versione**: 1.0.0
**Data**: 2025-10-06
**Autore**: Claude Code + Walter Cleva
**Licenza**: Proprietaria (Agility Club Labora A.S.D.)
