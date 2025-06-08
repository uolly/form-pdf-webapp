console.log('=== Debug Nodemailer ===');

try {
    const nodemailer = require('nodemailer');
    console.log('Nodemailer importato');
    console.log('Tipo di nodemailer:', typeof nodemailer);
    console.log('Chiavi disponibili:', Object.keys(nodemailer));
    console.log('createTransporter è una funzione?', typeof nodemailer.createTransporter);
    
    // Prova a vedere cosa c'è dentro
    console.log('\nContenuto di nodemailer:');
    for (let key in nodemailer) {
        console.log(`- ${key}: ${typeof nodemailer[key]}`);
    }
    
} catch (error) {
    console.error('Errore:', error);
}