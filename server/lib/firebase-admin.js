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
let initPromise = null;

/**
 * Wait for file to be available (with timeout)
 */
const waitForFile = (filePath, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      resolve(true);
      return;
    }
    
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (fs.existsSync(filePath)) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error(`File not found after ${timeout}ms: ${filePath}`));
      }
    }, 100);
  });
};

/**
 * Initialize Firebase with retry logic
 */
const initializeFirebase = async () => {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      // Wait for service account file (with timeout)
      await waitForFile(serviceAccountPath, 10000);
      
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
      
      return true;
    } catch (error) {
      if (error.code === 'app/duplicate-app' || error.message.includes('already exists')) {
        console.log('✓ Firebase Admin SDK already initialized');
        db = admin.firestore();
        initialized = true;
        return true;
      }
      
      console.error('✗ Firebase Admin SDK initialization error:');
      console.error('  Error:', error.message);
      console.warn('  Falling back to filesystem mode');
      return false;
    }
  })();
  
  return initPromise;
};

// Start initialization
initializeFirebase();

/**
 * Get initialization status - waits for init to complete
 */
const getInitialized = async () => {
  await initPromise;
  return initialized;
};

module.exports = { admin, db, initialized, getInitialized, initializeFirebase };
