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
let db = null;

// Check if Firebase is already initialized
try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    // Validate required fields
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Invalid service account file: missing required fields');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✓ Firebase Admin SDK initialized with service account');
    console.log('  Project ID:', serviceAccount.project_id);
    
    // Initialize Firestore
    db = admin.firestore();
    console.log('✓ Firestore initialized');
    initialized = true;
  } else {
    console.warn('⚠ Firebase service account key not found');
    console.warn('  Running in filesystem-only mode');
  }
} catch (error) {
  if (error.code === 'app/duplicate-app' || error.message.includes('already exists')) {
    console.log('✓ Firebase Admin SDK already initialized');
    db = admin.firestore();
    initialized = true;
  } else if (error.message.includes('Unable to detect a Project Id')) {
    console.warn('⚠ Firebase authentication error: Unable to detect Project ID');
    console.warn('  Check if firebase-service-key.json has valid project_id');
    console.warn('  Running in filesystem-only mode');
  } else {
    console.error('✗ Firebase Admin SDK initialization error:');
    console.error('  Error:', error.message);
    console.warn('  Falling back to filesystem mode');
  }
}

module.exports = { admin, db, initialized };
