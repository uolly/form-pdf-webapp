const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const emailService = require('../services/emailService');

const validateContact = [
  body('nome')
    .trim()
    .notEmpty().withMessage('Nome obbligatorio')
    .isLength({ max: 120 }).withMessage('Nome troppo lungo'),
  body('email')
    .trim()
    .isEmail().withMessage('Email non valida')
    .normalizeEmail(),
  body('oggetto')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 180 }).withMessage('Oggetto troppo lungo'),
  body('messaggio')
    .trim()
    .notEmpty().withMessage('Messaggio obbligatorio')
    .isLength({ max: 5000 }).withMessage('Messaggio troppo lungo'),
  body('privacy')
    .custom(value => value === true || value === 'true')
    .withMessage('Devi accettare la privacy policy')
];

router.post('/submit', validateContact, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const contactData = {
      nome: req.body.nome,
      email: req.body.email,
      oggetto: req.body.oggetto || 'Richiesta di contatto',
      messaggio: req.body.messaggio,
      privacyAccepted: req.body.privacy === true || req.body.privacy === 'true',
      submittedAt: new Date().toISOString(),
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    };

    const result = await emailService.sendContactEmail(contactData);

    res.json({
      success: true,
      message: 'Messaggio inviato correttamente. Riceverai una email di conferma.',
      data: {
        messageId: result.adminMessageId,
        confirmationSent: true
      }
    });
  } catch (error) {
    console.error('Errore invio form contatti:', error);
    res.status(500).json({
      success: false,
      error: 'Errore durante l\'invio del messaggio',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

module.exports = router;
