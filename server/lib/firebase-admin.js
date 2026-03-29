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
    console.error('✗ Firebase service account key not found at:', serviceAccountPath);
    console.error('  Please download the service account key from Firebase Console');
    console.error('  and save it as firebase-service-key.json in the server directory');
    process.exit(1);
  }
} catch (error) {
  if (error.code === 'app/duplicate-app' || error.message.includes('already exists')) {
    console.log('✓ Firebase Admin SDK already initialized');
    db = admin.firestore();
    initialized = true;
  } else {
    console.error('✗ Firebase Admin SDK initialization error:');
    console.error('  Error:', error.message);
    console.error('  Path:', serviceAccountPath);
    process.exit(1);
  }
}

module.exports = { admin, db, initialized };
