const admin = require('firebase-admin');

// Inizializza Firebase Admin SDK
// Le credenziali dovrebbero essere caricate da una variabile d'ambiente
let firebaseInitialized = false;

function initializeFirebaseAdmin() {
  if (firebaseInitialized) {
    return;
  }

  try {
    const fs = require('fs');
    const path = require('path');

    // Metodo 1: Secret File su Render (path predefinito)
    const renderSecretPath = '/etc/secrets/firebase-key.json';

    // Metodo 2: File locale per sviluppo
    const localKeyPath = path.join(__dirname, '../config/serviceAccountKey.json');

    // Metodo 3: Variabile d'ambiente JSON string
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('📋 Caricamento credenziali da variabile d\'ambiente...');
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
      });
    }
    // Controlla se esiste il file su Render
    else if (fs.existsSync(renderSecretPath)) {
      console.log('📋 Caricamento credenziali da Render Secret File...');
      const serviceAccount = require(renderSecretPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
      });
    }
    // Controlla se esiste il file locale (sviluppo)
    else if (fs.existsSync(localKeyPath)) {
      console.log('📋 Caricamento credenziali da file locale...');
      const serviceAccount = require(localKeyPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
      });
    }
    // Fallback: Application Default Credentials (Google Cloud)
    else {
      console.log('📋 Tentativo caricamento Application Default Credentials...');
      admin.initializeApp();
    }

    firebaseInitialized = true;
    console.log('✓ Firebase Admin SDK inizializzato');
  } catch (error) {
    console.error('❌ Errore inizializzazione Firebase Admin:', error);
    throw error;
  }
}

/**
 * Verifica un Google ID Token
 * @param {string} idToken - Il token ID da Google Sign-In
 * @returns {Promise<Object>} - I dati dell'utente verificati
 */
async function verifyGoogleToken(idToken) {
  initializeFirebaseAdmin();

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
      emailVerified: decodedToken.email_verified
    };
  } catch (error) {
    console.error('❌ Errore verifica Google token:', error);
    throw new Error('Token Google non valido');
  }
}

/**
 * Crea un nuovo utente con email e password
 * @param {Object} userData - Dati utente
 * @param {string} userData.email - Email utente
 * @param {string} userData.password - Password utente
 * @param {string} userData.displayName - Nome completo
 * @returns {Promise<Object>} - Dati utente creato
 */
async function createUserWithEmailPassword(userData) {
  initializeFirebaseAdmin();

  const { email, password, displayName } = userData;

  try {
    // Crea utente in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: displayName,
      emailVerified: false
    });

    console.log(`✓ Utente creato: ${userRecord.uid} (${email})`);

    return {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      emailVerified: userRecord.emailVerified,
      isNew: true
    };
  } catch (error) {
    console.error('❌ Errore creazione utente:', error);

    if (error.code === 'auth/email-already-exists') {
      // Email già registrata - recupera l'utente esistente
      console.log(`⚠️ Email già registrata, recupero account esistente: ${email}`);
      try {
        const existingUser = await admin.auth().getUserByEmail(email);
        console.log(`✓ Account esistente trovato: ${existingUser.uid}`);

        return {
          uid: existingUser.uid,
          email: existingUser.email,
          displayName: existingUser.displayName,
          emailVerified: existingUser.emailVerified,
          isNew: false,
          alreadyExists: true
        };
      } catch (getUserError) {
        throw new Error('Email già registrata ma impossibile recuperare l\'account');
      }
    } else if (error.code === 'auth/invalid-password') {
      throw new Error('Password non valida (minimo 6 caratteri)');
    } else {
      throw new Error('Errore creazione account: ' + error.message);
    }
  }
}

/**
 * Crea o aggiorna il documento handler in Firestore
 * @param {string} uid - UID Firebase
 * @param {Object} handlerData - Dati handler
 * @returns {Promise<void>}
 */
async function createHandlerDocument(uid, handlerData) {
  initializeFirebaseAdmin();

  try {
    const db = admin.firestore();

    // Prepara dati handler
    const handlerDoc = {
      firebaseId: uid,
      organizationId: 'LaBora', // Organizzazione Agility Club Labora
      firstName: handlerData.firstName,
      lastName: handlerData.lastName,
      email: handlerData.email,
      phone: handlerData.phone,
      address: handlerData.address,
      birthPlace: handlerData.birthPlace,
      birthDate: handlerData.birthDate ? admin.firestore.Timestamp.fromDate(new Date(handlerData.birthDate)) : null,
      province: handlerData.province,
      postalCode: handlerData.postalCode,
      taxCode: handlerData.taxCode,
      city: handlerData.city,
      credits: 0,
      accessLevel: 'user',
      hasAccount: true,
      privacy: handlerData.privacy || false,
      social: handlerData.social || false,
      newsletter: handlerData.newsletter || false,
      status: 'active',
      registrationType: 'web',
      registrationRequestDate: admin.firestore.FieldValue.serverTimestamp(), // Data compilazione form
      registrationDate: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Salva in Firestore collection "handlers"
    await db.collection('handlers').doc(uid).set(handlerDoc, { merge: true });

    console.log(`✓ Documento handler creato per UID: ${uid}`);
  } catch (error) {
    console.error('❌ Errore creazione documento handler:', error);
    throw new Error('Errore salvataggio dati handler: ' + error.message);
  }
}

/**
 * Gestisce la creazione completa dell'account (Auth + Firestore)
 * @param {Object} params - Parametri creazione account
 * @param {string} params.authMethod - 'google' o 'password'
 * @param {string} [params.googleIdToken] - Token Google (se authMethod = 'google')
 * @param {string} [params.password] - Password (se authMethod = 'password')
 * @param {Object} params.formData - Dati form iscrizione
 * @returns {Promise<Object>} - Risultato creazione account
 */
async function createAccount({ authMethod, googleIdToken, password, formData }) {
  initializeFirebaseAdmin();

  try {
    let uid, email, displayName, isNew = true, alreadyExists = false;

    if (authMethod === 'google') {
      // Verifica token Google
      const googleUser = await verifyGoogleToken(googleIdToken);
      uid = googleUser.uid;
      email = googleUser.email;
      displayName = googleUser.name;

      console.log(`✓ Utente Google verificato: ${email}`);

    } else if (authMethod === 'password') {
      // Crea utente con email/password (o recupera se esiste già)
      const displayNameFull = `${formData.nome} ${formData.cognome}`;
      const userResult = await createUserWithEmailPassword({
        email: formData.email,
        password: password,
        displayName: displayNameFull
      });

      uid = userResult.uid;
      email = userResult.email;
      displayName = userResult.displayName;
      isNew = userResult.isNew || false;
      alreadyExists = userResult.alreadyExists || false;

    } else {
      throw new Error('Metodo autenticazione non valido');
    }

    // Crea o aggiorna documento handler in Firestore
    await createHandlerDocument(uid, {
      ...formData,
      firstName: formData.nome,
      lastName: formData.cognome,
      email: email,
      phone: formData.telefono,
      address: formData.residenza,
      birthPlace: formData.natoA,
      birthDate: formData.natoIl,
      province: formData.provincia,
      postalCode: formData.cap,
      taxCode: formData.codiceFiscale,
      city: formData.comune,
      privacy: formData.consensoPrivacy,
      social: formData.consensoSocial,
      newsletter: formData.consensoNewsletter
    });

    return {
      success: true,
      uid: uid,
      email: email,
      displayName: displayName,
      authMethod: authMethod,
      isNew: isNew,
      alreadyExists: alreadyExists
    };

  } catch (error) {
    console.error('❌ Errore createAccount:', error);
    throw error;
  }
}

module.exports = {
  verifyGoogleToken,
  createUserWithEmailPassword,
  createHandlerDocument,
  createAccount
};
