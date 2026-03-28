// Firebase Admin SDK Config
// Download service account key from Firebase Console:
// Project Settings → Service Accounts → Generate New Private Key
// Save as firebase-service-key.json in the server directory

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'firebase-service-key.json');

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require('./firebase-service-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  // Fallback: initialize without credentials (for development)
  // Token verification will use Firebase public keys
  admin.initializeApp();
}

module.exports = admin;
