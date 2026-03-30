/**
 * Seed Script: Create Initial Super Admin User
 * 
 * This script creates the first super_admin user in Firestore.
 * It can only be run ONCE - if a super_admin already exists, it will exit.
 * 
 * Usage:
 *   node scripts/seed-super-admin.js
 * 
 * Environment variables required:
 *   - FIREBASE_PROJECT_ID
 *   - FIREBASE_CLIENT_EMAIL
 *   - FIREBASE_PRIVATE_KEY
 */

require('dotenv').config({ path: '.env' });

const admin = require('firebase-admin');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'server', 'firebase-service-key.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Firebase service account key not found!');
  console.error(`   Expected at: ${serviceAccountPath}`);
  console.error('\n   Please download the service account key from Firebase Console:');
  console.error('   Project Settings > Service Accounts > Generate New Private Key');
  console.error(`   Save it as: firebase-service-key.json in the server directory\n`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask questions
const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Check if super_admin already exists
async function checkSuperAdminExists() {
  try {
    const usersSnapshot = await db.collection('users')
      .where('role', '==', 'super_admin')
      .limit(1)
      .get();

    return !usersSnapshot.empty;
  } catch (error) {
    console.error('Error checking for existing super_admin:', error.message);
    return false;
  }
}

// Create super_admin user
async function createSuperAdmin(email, displayName) {
  try {
    // Check if super_admin already exists
    console.log('\n🔍 Checking for existing super_admin...');
    const exists = await checkSuperAdminExists();
    
    if (exists) {
      console.log('\n❌ Super Admin user already exists!');
      console.log('   This script can only be run once for security reasons.');
      console.log('   If you need to create another admin, use Firebase Console or Admin API.\n');
      rl.close();
      process.exit(1);
    }

    console.log('✓ No existing super_admin found');

    // Generate a secure temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + 
                        Math.random().toString(36).slice(-8) + 
                        '!@#'.split('').sort(() => 0.5 - Math.random()).join('');

    console.log('\n📝 Creating super_admin user...\n');

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: tempPassword,
      displayName: displayName,
      disabled: false
    });

    // Create user document in Firestore with super_admin role
    await db.collection('users').doc(userRecord.uid).set({
      email: email,
      displayName: displayName,
      role: 'super_admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'seed-script',
      isSuperAdmin: true // Additional flag for extra security
    });

    // Create a marker document to prevent re-running
    await db.collection('system').doc('super_admin_seed').set({
      seeded: true,
      seededAt: new Date().toISOString(),
      email: email,
      uid: userRecord.uid,
      message: 'This document prevents re-running the super_admin seed script'
    });

    console.log('✅ Super Admin user created successfully!\n');
    console.log('═'.repeat(60));
    console.log('📧 Email:         ', email);
    console.log('👤 Name:          ', displayName);
    console.log('🔑 Temporary Password:', tempPassword);
    console.log('🎭 Role:          ', 'super_admin');
    console.log('═'.repeat(60));
    console.log('\n⚠️  IMPORTANT:');
    console.log('   - Please change the password after first login!');
    console.log('   - This temporary password will not be shown again.');
    console.log('   - Store it securely before closing this terminal.\n');

    // Save credentials to a file (optional, for safety)
    const credentialsFile = path.join(__dirname, 'super-admin-credentials.txt');
    const credentialsContent = `
Super Admin Credentials
========================
Created: ${new Date().toISOString()}
Email: ${email}
Password: ${tempPassword}
Role: super_admin

⚠️  IMPORTANT: Change password after first login!
⚠️  Delete this file after saving credentials securely!
`.trim();

    fs.writeFileSync(credentialsFile, credentialsContent);
    console.log(`📄 Credentials saved to: ${credentialsFile}`);
    console.log('   ⚠️  Delete this file after saving credentials securely!\n');

    rl.close();
    return true;
  } catch (error) {
    console.error('\n❌ Error creating super_admin:', error.message);
    if (error.code === 'auth/email-already-in-use') {
      console.error('   This email is already registered. Please use a different email.');
    }
    rl.close();
    process.exit(1);
  }
}

// Main function
async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('🔐 Super Admin Seed Script');
  console.log('═'.repeat(60));
  console.log('\nThis script creates the first super_admin user.');
  console.log('⚠️  WARNING: This can only be run ONCE for security.\n');

  // Get user input
  const email = await askQuestion('Enter super_admin email: ');
  
  if (!email || !email.includes('@')) {
    console.log('\n❌ Invalid email address!\n');
    rl.close();
    process.exit(1);
  }

  const displayName = await askQuestion('Enter super_admin name: ');
  
  if (!displayName || displayName.trim().length === 0) {
    console.log('\n❌ Name cannot be empty!\n');
    rl.close();
    process.exit(1);
  }

  const confirm = await askQuestion(`\nCreate super_admin user "${email}"? (yes/no): `);
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log('\n❌ Operation cancelled.\n');
    rl.close();
    process.exit(0);
  }

  // Create the super_admin
  await createSuperAdmin(email, displayName);
}

// Run the script
main().catch((error) => {
  console.error('\n❌ Unexpected error:', error.message);
  rl.close();
  process.exit(1);
});
