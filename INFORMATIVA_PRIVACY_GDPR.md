# 🔒 INFORMATIVA PRIVACY GDPR

## Agility Club Labora - A.S.D.
### Sistema Gestione Iscrizioni con Firma Elettronica

**Versione**: 2.0
**Data**: 6 Ottobre 2025
**Conforme a**: Regolamento UE 2016/679 (GDPR)

---

## 1. TITOLARE DEL TRATTAMENTO

**Agility Club Labora - Associazione Sportiva Dilettantistica**
Sede: [Indirizzo completo]
Email: laboratrieste@gmail.com
P.IVA/CF: [Codice Fiscale ASD]

---

## 2. TIPOLOGIA DI DATI RACCOLTI

### 2.1 Dati Personali (Art. 4 GDPR)
- **Dati anagrafici**: Nome, Cognome, Data e luogo di nascita
- **Dati di contatto**: Email, Telefono, Indirizzo di residenza
- **Dati fiscali**: Codice Fiscale
- **Dati animali**: Informazioni cani iscritti (nome, razza, microchip, proprietario)

### 2.2 Dati Tecnici (Art. 32 GDPR - Sicurezza)
- **Firma elettronica**: Immagine firma digitalizzata (PNG Base64)
- **Hash crittografici**: SHA-256 documento e firma (non ripudiabilità)
- **Timestamp**: Data/ora firma certificata
- **IP Address anonimizzato**: Ultimo ottetto/gruppo mascherato
  - IPv4: `192.168.1.0` (non `192.168.1.100`)
  - IPv6: `2001:db8:a0b:12f0::` (primi 4 gruppi)
- **User Agent sanitizzato**: Solo browser e OS (no plugin/fingerprint)

### 2.3 Dati NON Raccolti
❌ Cookie di tracciamento
❌ Geolocalizzazione precisa
❌ Dati biometrici
❌ Informazioni sanitarie
❌ Dati bancari/carta di credito

---

## 3. FINALITÀ DEL TRATTAMENTO (Art. 6 GDPR)

### 3.1 Base Giuridica: **Consenso Esplicito** (Art. 6.1.a)
✅ Gestione iscrizioni associative
✅ Comunicazioni relative alle attività sportive
✅ Archiviazione documenti firmati (10 anni)
✅ Conservazione a norma CAD Art. 44

### 3.2 Base Giuridica: **Obbligo Legale** (Art. 6.1.c)
✅ Adempimenti fiscali (10 anni conservazione)
✅ Normativa ASD (D.Lgs. 460/1997)
✅ Tenuta registro associati

### 3.3 Base Giuridica: **Legittimo Interesse** (Art. 6.1.f)
✅ Sicurezza IT e prevenzione frodi
✅ Verifica integrità documenti (hash)
✅ Audit trail per contestazioni

---

## 4. MODALITÀ DI TRATTAMENTO (Art. 32 GDPR)

### 4.1 Misure Tecniche Implementate

| Misura | Descrizione | Norma |
|--------|-------------|-------|
| **Crittografia** | Hash SHA-256 documenti | GDPR Art. 32 |
| **Pseudonimizzazione** | IP anonimizzato | GDPR Art. 32 |
| **Double Opt-in** | Verifica email obbligatoria | GDPR Art. 7 |
| **Backup ridondanti** | 3 layer (File, Sheets, Email) | CAD Art. 44 |
| **Audit Trail** | Log immutabili con timestamp | eIDAS Art. 25 |
| **Retention Policy** | Auto-delete dopo 10 anni | GDPR Art. 5.1.e |

### 4.2 Processo di Raccolta Dati

```
1. Form Online → Compilazione dati
2. Firma Canvas → Cattura firma digitale
3. Hash Generazione → SHA-256 documento + firma
4. Email Verifica → Double opt-in (48h validità)
5. Conferma Click → Attivazione trattamento
6. Archiviazione → 3 backup (locale, cloud, email)
7. Timestamp → Certificazione data/ora (ISO 8601 UTC)
```

---

## 5. DESTINATARI DEI DATI (Art. 13.1.e GDPR)

### 5.1 Comunicazione Interna
✅ **Amministratori ASD**: Solo per gestione iscrizioni
✅ **Istruttori**: Solo nome e dati cane (no dati sensibili)

### 5.2 Fornitori Terzi (Responsabili Esterni - Art. 28)

| Servizio | Finalità | Paese | Privacy Policy |
|----------|----------|-------|----------------|
| **SendGrid** | Invio email transazionali | USA (Privacy Shield) | [Link](https://sendgrid.com/policies/privacy/) |
| **Google Sheets** | Archiviazione database | USA/EU | [Link](https://policies.google.com/privacy) |
| **Render** | Hosting applicazione | USA/EU | [Link](https://render.com/privacy) |

⚠️ **Nessun trasferimento** a paesi extra-UE senza adeguate garanzie (Art. 44-49 GDPR)

### 5.3 NON Vengono Mai Comunicati A:
❌ Agenzie marketing
❌ Società pubblicitarie
❌ Profilazione commerciale
❌ Broker dati

---

## 6. PERIODO DI CONSERVAZIONE (Art. 5.1.e GDPR)

### 6.1 Retention Policy

| Dato | Durata | Motivo Legale |
|------|--------|---------------|
| **Dati iscrizione** | 10 anni | Normativa fiscale ASD |
| **PDF firmati** | 10 anni | CAD Art. 44 (conservazione sostitutiva) |
| **Log firma** | 10 anni | eIDAS Art. 25 (audit trail) |
| **Token verifica** | 7 giorni | GDPR Art. 5.1.c (minimizzazione) |
| **IP anonimizzati** | 10 anni | Solo per audit sicurezza |

### 6.2 Cancellazione Automatica

✅ **Token email**: Eliminati dopo 7 giorni
✅ **Documenti scaduti**: Auto-delete dopo 10 anni + 30 giorni grace period
✅ **Log tecnici**: Rotazione settimanale (solo statistiche aggregate)

---

## 7. DIRITTI DELL'INTERESSATO (Artt. 15-22 GDPR)

### 7.1 Diritti Esercitabili

| Diritto | Art. GDPR | Descrizione | Come Esercitarlo |
|---------|-----------|-------------|------------------|
| **Accesso** | Art. 15 | Copia di tutti i tuoi dati | GET `/api/form/my-documents?codiceFiscale=...` |
| **Rettifica** | Art. 16 | Correzione dati errati | Email a laboratrieste@gmail.com |
| **Cancellazione** | Art. 17 | "Diritto all'oblio" | Richiesta scritta (con limiti legali) |
| **Limitazione** | Art. 18 | Blocco trattamento temporaneo | Email motivata |
| **Portabilità** | Art. 20 | Export dati machine-readable | POST `/api/form/export-documents` |
| **Opposizione** | Art. 21 | Stop trattamenti non essenziali | Email con ID documento |
| **Revoca Consenso** | Art. 7.3 | Ritiro autorizzazioni | Effetto da richiesta in poi |

### 7.2 Limitazioni ai Diritti (Art. 17.3)

⚠️ **Cancellazione NON applicabile** se necessaria per:
- Adempimento obblighi legali fiscali (10 anni)
- Accertamento, esercizio o difesa diritti in sede giudiziaria
- Archiviazione nel pubblico interesse (associazioni riconosciute)

### 7.3 Procedura di Esercizio Diritti

```
1. Email a: laboratrieste@gmail.com
   Oggetto: "GDPR - Esercizio diritto [NOME DIRITTO]"

2. Fornire:
   - Nome e Cognome
   - Codice Fiscale
   - Email usata per iscrizione
   - ID Documento (se disponibile)

3. Tempi di risposta: 30 giorni (prorogabili a 60)

4. Modalità risposta: Email con allegati JSON/PDF
```

---

## 8. SICUREZZA DATI (Art. 32 GDPR)

### 8.1 Misure Implementate

**Crittografia:**
- ✅ HTTPS/TLS 1.3 per trasmissione
- ✅ SHA-256 hash per integrità
- ✅ Base64 encoding firma (non plaintext)

**Autenticazione:**
- ✅ Double opt-in email (verifica identità)
- ✅ Token univoci con scadenza 48h
- ✅ CF validation server-side

**Backup:**
- ✅ 3-2-1 strategy (3 copie, 2 media, 1 offsite)
- ✅ File system locale (development)
- ✅ Google Sheets (cloud primary)
- ✅ Email archive (ridondanza)

**Monitoring:**
- ✅ Log accessi documenti (audit trail)
- ✅ Verifica integrità settimanale
- ✅ Alert su hash mismatch

### 8.2 Incident Response Plan

In caso di **Data Breach** (Art. 33-34 GDPR):

```
T+0h:   Rilevamento breach
T+2h:   Blocco sistema
T+24h:  Analisi impatto
T+72h:  Notifica Garante (se alto rischio)
T+72h:  Comunicazione interessati (se necessario)
```

---

## 9. TRASFERIMENTI EXTRA-UE (Artt. 44-49 GDPR)

### 9.1 Servizi USA con Garanzie

| Servizio | Garanzia | Documento |
|----------|----------|-----------|
| **SendGrid** | Standard Contractual Clauses (SCC) | [EU Model Clauses](https://www.twilio.com/legal/data-protection-addendum) |
| **Google** | Adequacy Decision + SCC | [Google Cloud GDPR](https://cloud.google.com/privacy/gdpr) |
| **Render** | SCC + Server EU disponibili | [Render DPA](https://render.com/dpa) |

⚠️ **Nessun trasferimento** verso paesi senza decisione di adeguatezza (Art. 45) senza SCC o BCR

---

## 10. PROFILAZIONE E DECISIONI AUTOMATIZZATE (Art. 22 GDPR)

❌ **NESSUNA PROFILAZIONE**
❌ **NESSUN ALGORITMO DECISIONALE AUTOMATICO**
❌ **NESSUN MARKETING AUTOMATIZZATO**

Il sistema effettua solo:
✅ Validazione tecnica form (codice fiscale, email formato)
✅ Verifica integrità hash (non decisionale)
✅ Timestamp automatico (non comporta decisioni)

---

## 11. COOKIES E TECNOLOGIE DI TRACCIAMENTO

### 11.1 Cookie Policy

❌ **NO Cookie di tracciamento**
❌ **NO Cookie analytics**
❌ **NO Cookie pubblicitari**
❌ **NO Cookie social**

✅ **Solo Cookie Tecnici Essenziali**:
- Session cookie (gestione form - scadenza: chiusura browser)
- CORS header (sicurezza - no storage)

**Esenzione Art. 122 Codice Privacy**: Cookie tecnici non richiedono consenso

---

## 12. MINORI (Art. 8 GDPR)

⚠️ **Iscrizioni minori 14-18 anni**: Richiedono consenso genitoriale

**Procedura:**
1. Form compilato da genitore/tutore
2. Email verifica inviata a genitore
3. Firma digitale apposta da genitore
4. Indicare nel form "Iscrizione minore per conto di [Nome Minore]"

❌ **Minori <14 anni**: Iscrizione solo tramite genitore/tutore

---

## 13. CONTATTI E RECLAMI

### 13.1 Data Protection Officer (DPO)

**Email DPO**: laboratrieste@gmail.com
**Oggetto**: "Attenzione DPO - Privacy"

### 13.2 Autorità di Controllo

**Garante per la Protezione dei Dati Personali**
Piazza di Monte Citorio n. 121
00186 Roma
Tel: +39 06 696771
Email: garante@gpdp.it
PEC: protocollo@pec.gpdp.it
Web: https://www.garanteprivacy.it

**Diritto di reclamo**: Art. 77 GDPR - entro 3 anni dal fatto

---

## 14. MODIFICHE ALL'INFORMATIVA

**Ultima modifica**: 6 Ottobre 2025
**Versione**: 2.0

✅ Modifiche sostanziali verranno comunicate via email
✅ Versione aggiornata sempre disponibile su: [URL informativa]
✅ Storico versioni: [Link changelog]

---

## 15. BASE NORMATIVA DI RIFERIMENTO

### 15.1 Normativa Europea
- **GDPR**: Regolamento UE 2016/679
- **eIDAS**: Regolamento UE 910/2014 (firma elettronica)
- **Direttiva ePrivacy**: 2002/58/CE (cookie)

### 15.2 Normativa Italiana
- **CAD**: D.Lgs. 82/2005 (Codice Amministrazione Digitale)
- **Codice Privacy**: D.Lgs. 196/2003 (adeguato GDPR)
- **Normativa ASD**: D.Lgs. 460/1997, L. 289/2002

### 15.3 Standards Tecnici
- **ISO 27001**: Information Security Management
- **ISO 32000-2**: PDF 2.0 specification
- **RFC 3161**: Time-Stamp Protocol (TSP)
- **SHA-256**: FIPS 180-4 (hash standard)

---

## 16. GLOSSARIO TERMINI TECNICI

| Termine | Definizione |
|---------|-------------|
| **SHA-256** | Algoritmo hash crittografico che genera impronte digitali univoche di 64 caratteri esadecimali |
| **Double Opt-in** | Procedura di conferma email in due step per verificare identità mittente |
| **IP Anonimizzato** | Indirizzo IP con ultimo ottetto (IPv4) o ultimi gruppi (IPv6) mascherati |
| **Timestamp Certificato** | Data/ora certificata da server NTP in formato ISO 8601 UTC |
| **Audit Trail** | Registro cronologico immutabile di tutte le operazioni su un documento |
| **eIDAS** | Regolamento europeo su identificazione elettronica e servizi fiduciari |
| **CAD** | Codice Amministrazione Digitale italiano (D.Lgs. 82/2005) |

---

## 17. FAQ PRIVACY

### Q1: I miei dati vengono venduti a terzi?
**R**: ❌ NO. Mai. I dati sono usati esclusivamente per gestione associativa.

### Q2: Posso cancellare i miei dati subito dopo l'iscrizione?
**R**: ⚠️ Solo parzialmente. Obblighi fiscali richiedono conservazione 10 anni.

### Q3: Chi può vedere i miei documenti firmati?
**R**: Solo amministratori ASD e tu stesso (via API export).

### Q4: L'IP anonimizzato può identificarmi?
**R**: ❌ NO. `192.168.1.0` non identifica un singolo utente (range /24 = 256 indirizzi).

### Q5: Cosa succede se cambio email?
**R**: Contatta laboratrieste@gmail.com per aggiornamento. Ti invieremo nuova verifica.

### Q6: Posso revocare il consenso?
**R**: ✅ SÌ. Ma perderai accesso ai servizi associativi (tessera, corsi, gare).

### Q7: I miei dati sono al sicuro in caso di hack?
**R**: ✅ Sì. Hash SHA-256 + backup ridondanti + IP anonimizzato. Dati sensibili minimizzati.

---

**Documento generato automaticamente dal sistema - Versione 2.0**
**© 2025 Agility Club Labora A.S.D. - Tutti i diritti riservati**

Per domande: **laboratrieste@gmail.com**
