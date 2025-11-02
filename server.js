const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Carica .env.local in sviluppo, .env in produzione
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}
const { body, validationResult } = require('express-validator');

// Carica le variabili d'ambiente
const result = dotenv.config();

// DEBUG - Verifica il caricamento del .env
console.log('=== VERIFICA CARICAMENTO .ENV ===');
if (result.error) {
  console.error('Errore nel caricamento .env:', result.error);
} else {
  console.log('.env caricato correttamente');
}

console.log('=== VERIFICA VARIABILI AMBIENTE ===');
console.log('PORT:', process.env.PORT);
console.log('WORDPRESS_URL:', process.env.WORDPRESS_URL);
console.log('GOOGLE_SHEETS_ID:', process.env.GOOGLE_SHEETS_ID);
console.log('GOOGLE_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
console.log('GOOGLE_PRIVATE_KEY exists:', !!process.env.GOOGLE_PRIVATE_KEY);
console.log('GOOGLE_PRIVATE_KEY length:', process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.length : 0);
console.log('GOOGLE_PRIVATE_KEY first 50 chars:', process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.substring(0, 50) : 'UNDEFINED');
console.log('===================================');

const formRoutes = require('./routes/formRoutes');
const ricevuteRoutes = require('./routes/ricevuteRoutes');
const rinnovoRoutes = require('./routes/rinnovoRoutes');
const certificatiRoutes = require('./routes/certificatiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;


// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Permetti richieste da localhost per test
    // In server.js, aggiungi l'URL di Render alle origini permesse
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3000',
  process.env.WORDPRESS_URL,
  'https://form-pdf-webapp.onrender.com' // Aggiungi il tuo URL Render qui
];
    
    // Permetti anche richieste senza origin (es. Postman, PowerShell)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/form', formRoutes);
app.use('/api/ricevute', ricevuteRoutes);
app.use('/api/rinnovo', rinnovoRoutes);
app.use('/api/certificati', certificatiRoutes);

// Serve static test forms (solo in development)
if (process.env.NODE_ENV !== 'production') {
  app.get('/test-form', (req, res) => {
    res.sendFile(__dirname + '/test-iscrizione-form.html');
  });

  app.get('/test-rinnovo', (req, res) => {
    res.sendFile(__dirname + '/test-rinnovo-form.html');
  });

  app.get('/test-certificato', (req, res) => {
    res.sendFile(__dirname + '/test-certificato-medico.html');
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Test endpoint per Resend (sempre disponibile in locale)
app.get('/test-resend', async (req, res) => {
  try {
    const emailService = require('./services/emailService');
    const result = await emailService.testResend();
    res.json({
      success: true,
      message: 'Email di test inviata con Resend!',
      result: result
    });
  } catch (error) {
    console.error('Errore nel test Resend:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Qualcosa è andato storto!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});