// Firebase Admin SDK Config
// Download service account key from Firebase Console:
// Project Settings → Service Accounts → Generate New Private Key
// Save as firebase-service-key.json in the server directory

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Use absolute path based on server directory
const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-key.json');

let initialized = false;

// Check if Firebase is already initialized
try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✓ Firebase Admin SDK initialized with service account');
    console.log('  Project ID:', serviceAccount.project_id);
  } else {
    console.warn('⚠ Firebase service account key not found at:', serviceAccountPath);
    console.warn('  Running without credentials - token verification may fail');
    admin.initializeApp();
  }
  initialized = true;
} catch (error) {
  if (error.code === 'app/duplicate-app' || error.message.includes('already exists')) {
    console.log('✓ Firebase Admin SDK already initialized');
    initialized = true;
  } else {
    console.error('✗ Firebase Admin SDK initialization error:');
    console.error('  Error:', error.message);
    console.error('  Path:', serviceAccountPath);
  }
}

// Initialize Firestore
const db = admin.firestore();
console.log('✓ Firestore initialized');

module.exports = { admin, db };
