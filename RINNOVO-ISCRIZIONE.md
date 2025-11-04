# Sistema Rinnovo Iscrizione

## Descrizione

Sistema completo per il rinnovo delle iscrizioni dei soci esistenti dell'Agility Club Labora.

## Caratteristiche

### 1. Verifica Socio Esistente
- Verifica tramite codice fiscale se il socio esiste già nel database
- Controlla se ha già rinnovato nell'anno corrente
- Precompila automaticamente i dati del socio trovato

### 2. Dati Raccolti
Il form raccoglie solo i dati essenziali per il rinnovo:
- **Nome** (precompilato, non modificabile)
- **Cognome** (precompilato, non modificabile)
- **Email** (modificabile, il socio può aggiornare la propria email)
- **Codice Fiscale** (precompilato, non modificabile)
- **Consenso Privacy** (obbligatorio)
- **Consenso Social** (opzionale)

### 3. Firma Digitale
- Supporto completo per firma elettronica con valore legale
- Canvas HTML5 per firma con mouse/touch
- Salvataggio hash firma e documento
- Log completo con timestamp e metadati (IP, User Agent)
- Conformità al Regolamento eIDAS (UE) 910/2014

### 4. Creazione Account App
- Sezione opzionale e nascondibile tramite flag
- Due metodi di autenticazione:
  - **Google Sign-In** (OAuth 2.0)
  - **Email e Password** (minimo 6 caratteri)
- Integrazione con Firebase Authentication
- Nessun socio attuale ha account, quindi tutti possono crearlo

### 5. Email Automatiche
Il sistema invia email personalizzate:

**Email al Socio:**
- Conferma rinnovo con anno corrente
- Dettagli firma digitale (se presente)
- Link ai contatti dell'associazione
- PDF allegato (quando disponibile)

**Email agli Amministratori:**
- Riepilogo completo del rinnovo
- Dati socio e consensi
- Log firma elettronica
- PDF e signature log in allegato

## Struttura File

### Backend

```
services/
  └── rinnovoService.js           # Service per gestione rinnovi
routes/
  └── rinnovoRoutes.js            # API endpoints per rinnovi
```

### Frontend

```
test-rinnovo-form.html            # Form HTML per rinnovo
```

### Modifiche ai File Esistenti

```
server.js                         # Aggiunte routes /api/rinnovo e /test-rinnovo
services/emailService.js          # Aggiunti metodi sendRinnovoEmails()
```

## API Endpoints

### POST /api/rinnovo/verifica-socio
Verifica se un socio esiste tramite codice fiscale.

**Request:**
```json
{
  "codiceFiscale": "RSSMRA80A01H501U"
}
```

**Response (Socio trovato):**
```json
{
  "success": true,
  "message": "Socio trovato! Puoi procedere con il rinnovo.",
  "exists": true,
  "alreadyRenewed": false,
  "data": {
    "nome": "Mario",
    "cognome": "Rossi",
    "email": "mario.rossi@example.com",
    "codiceFiscale": "RSSMRA80A01H501U"
  }
}
```

**Response (Già rinnovato):**
```json
{
  "success": false,
  "message": "Hai già rinnovato l'iscrizione quest'anno in data 15/01/2025",
  "exists": true,
  "alreadyRenewed": true,
  "renewalDate": "2025-01-15T10:30:00.000Z"
}
```

**Response (Non trovato):**
```json
{
  "success": false,
  "message": "Codice fiscale non trovato. Se sei un nuovo socio, usa il form di prima iscrizione.",
  "exists": false
}
```

### POST /api/rinnovo/submit
Invia il rinnovo iscrizione.

**Request:**
```json
{
  "nome": "Mario",
  "cognome": "Rossi",
  "email": "mario.rossi@example.com",
  "codiceFiscale": "RSSMRA80A01H501U",
  "consensoPrivacy": true,
  "consensoSocial": true,
  "signatureDataUrl": "data:image/png;base64,...",
  "createAppAccount": true,
  "authMethod": "password",
  "appPassword": "SecurePass123"
}
```

**Response (Successo):**
```json
{
  "success": true,
  "message": "Rinnovo completato con successo!",
  "data": {
    "documentId": "DOC_20250131_123456789",
    "documentHash": "sha256_hash_del_documento",
    "signatureTimestamp": "2025-01-31T14:30:00.000Z",
    "hasDigitalSignature": true,
    "emailSent": true,
    "account": {
      "uid": "firebase_uid_123",
      "email": "mario.rossi@example.com",
      "authMethod": "password"
    }
  }
}
```

### GET /api/rinnovo/statistiche?anno=2025
Ottieni statistiche rinnovi per anno.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totaleRinnovi": 45,
    "conFirmaDigitale": 38,
    "conAccount": 12,
    "anno": 2025
  }
}
```

## Google Sheets

### Foglio "Rinnovi"
Il sistema crea automaticamente un nuovo foglio "Rinnovi" con le seguenti colonne:

| Colonna | Descrizione |
|---------|-------------|
| A | Timestamp Rinnovo |
| B | Nome |
| C | Cognome |
| D | Email |
| E | Codice Fiscale |
| F | Consenso Privacy (Sì/No) |
| G | Consenso Social (Sì/No) |
| H | Timestamp Firma |
| I | Hash Firma |
| J | Hash Documento |
| K | IP Firma |
| L | User Agent |
| M | Stato Verifica |
| N | Firma Digitale (Sì/No) |
| O | Account Creato (Sì/No) |
| P | Account UID |
| Q | Anno Rinnovo |

### Foglio "Soci" (Lettura)
Il sistema legge dal foglio "Soci" per verificare i soci esistenti tramite codice fiscale (colonna J).

## Flusso Utente

```
1. Socio accede al form rinnovo
   ↓
2. Inserisce codice fiscale e clicca "Verifica"
   ↓
3. Sistema verifica esistenza socio e rinnovo anno corrente
   ↓
4. Se OK: precompila form con dati del socio
   ↓
5. Socio verifica/aggiorna email
   ↓
6. Socio accetta consensi privacy
   ↓
7. Socio firma digitalmente (opzionale)
   ↓
8. Socio sceglie se creare account app (opzionale)
   ↓
9. Socio clicca "Completa Rinnovo"
   ↓
10. Sistema:
    - Salva rinnovo su Google Sheets
    - Genera PDF (TODO: quando pronto)
    - Crea account Firebase (se richiesto)
    - Invia email a socio e admin
   ↓
11. Messaggio di conferma visualizzato
```

## Configurazione

### File .env.local
Nessuna configurazione aggiuntiva necessaria. Il sistema usa le stesse variabili di ambiente del form di iscrizione.

### Firebase
Usa la stessa configurazione Firebase del form di iscrizione per la creazione account.

### Nascondere Sezione Creazione Account
Per nascondere completamente la sezione creazione account, modifica il file HTML:

```javascript
// Nel file test-rinnovo-form.html, cerca:
<div class="form-section" id="accountSection">

// E aggiungi la classe "hidden":
<div class="form-section hidden" id="accountSection">
```

Oppure rimuovi completamente la sezione dal DOM.

## Testing

### Test in Locale

1. Avvia il server:
```bash
node server.js
```

2. Apri il form nel browser:
```
http://localhost:3000/test-rinnovo
```

3. Per testare, inserisci un codice fiscale esistente nel foglio "Soci"

### Test Email
Le email sono controllate dalla variabile `DISABLE_EMAIL_SENDING` nel file `.env.local`:
- `true` = Modalità test (email simulate, non inviate)
- `false` = Email inviate realmente

## TODO

### PDF Rinnovo
Il sistema è già predisposto per generare PDF, ma il template PDF non è ancora stato creato.

**Quando il PDF sarà pronto:**

1. Creare il template PDF in `templates/rinnovo-template.pdf`
2. Implementare il metodo nel `pdfService.js`:
```javascript
async fillRinnovoPdf(rinnovoData) {
  // Logica per compilare il PDF con i dati del rinnovo
  // Simile a fillPdf() ma con template diverso
}
```
3. Decommentare nel file `rinnovoRoutes.js`:
```javascript
// const pdfService = require('../services/pdfService');
const pdfService = require('../services/pdfService');

// const pdfBuffer = await pdfService.fillRinnovoPdf(rinnovoData);
const pdfBuffer = await pdfService.fillRinnovoPdf(rinnovoData);
```

## Note di Sicurezza

- Il codice fiscale è usato come chiave di ricerca univoca
- I dati personali sono validati lato server
- La firma digitale è tracciata con hash SHA-256
- IP e User Agent sono anonimizzati per GDPR
- Le password sono gestite da Firebase (hashing automatico)
- Il sistema previene doppi rinnovi nello stesso anno

## Supporto

Per domande o problemi:
- Email: laboratrieste@gmail.com
- WhatsApp: +39 350 0693832
