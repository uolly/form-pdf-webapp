const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Configureremo più tardi
  }

  async sendFormEmail(formData, pdfBuffer) {
    console.log('Email service non ancora configurato');
    return { accepted: ['placeholder@example.com'] };
  }
}

module.exports = new EmailService();