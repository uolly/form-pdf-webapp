require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('Test configurazione email...');
    console.log('SMTP Host:', process.env.SMTP_HOST);
    console.log('SMTP Port:', process.env.SMTP_PORT);
    console.log('SMTP User:', process.env.SMTP_USER);
    console.log('Email From:', process.env.EMAIL_FROM);
    console.log('Email To:', process.env.EMAIL_TO);
    
    try {
        // CORREZIONE: createTransport invece di createTransporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        
        // Verifica connessione
        await transporter.verify();
        console.log('✓ Connessione SMTP verificata!');
        
        // Invia email di test
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: process.env.EMAIL_TO,
            subject: 'Test Email - Form Webapp',
            text: 'Questa è una email di test dal sistema di iscrizioni.',
            html: '<h1>Test Email</h1><p>Se ricevi questa email, la configurazione è corretta!</p>'
        });
        
        console.log('✓ Email inviata con successo!');
        console.log('Message ID:', info.messageId);
        
    } catch (error) {
        console.error('✗ Errore:', error.message);
        if (error.code === 'EAUTH') {
            console.error('Problema di autenticazione. Verifica username e password.');
        }
    }
}

testEmail();