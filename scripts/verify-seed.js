/**
 * Verify Super Admin Status
 * 
 * Check and list all super_admin users in the system
 * 
 * Usage:
 *   node scripts/verify-seed.js
 *   node scripts/verify-seed.js --list
 */

require('dotenv').config({ path: '.env' });

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'server', 'firebase-service-key.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Firebase service account key not found!');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function verifySuperAdmins() {
  try {
    console.log('\n🔍 Checking super_admin status...\n');

    // Get all super_admin users
    const superAdminsSnapshot = await db.collection('users')
      .where('role', '==', 'super_admin')
      .get();

    if (superAdminsSnapshot.empty) {
      console.log('⚠️  No super_admin users found!\n');
      console.log('📝 To create a super_admin:');
      console.log('   1. User must login via Google Sign-In first');
      console.log('   2. Run: npm run auth:set-superadmin <email>\n');
    } else {
      console.log('✅ Super Admin Users Found:\n');
      console.log('═'.repeat(70));
      
      superAdminsSnapshot.forEach(doc => {
        const user = doc.data();
        console.log(`👑 ${user.email}`);
        console.log(`   Name: ${user.displayName || 'N/A'}`);
        console.log(`   UID: ${doc.id}`);
        console.log(`   Granted: ${user.roleGrantedAt || user.createdAt || 'N/A'}`);
        console.log(`   Provider: ${user.authProvider || 'google.com'}`);
        console.log('');
      });
    }

    // List all admin users (admin + super_admin)
    console.log('📋 All Admin Users:\n');
    const adminUsersSnapshot = await db.collection('users')
      .where('role', 'in', ['admin', 'super_admin'])
      .get();

    if (adminUsersSnapshot.empty) {
      console.log('   No admin users found.\n');
    } else {
      console.log('─'.repeat(70));
      adminUsersSnapshot.forEach(doc => {
        const user = doc.data();
        const icon = user.role === 'super_admin' ? '👑' : '🛡️';
        console.log(`   ${icon}  ${user.email}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      Created: ${user.createdAt || 'N/A'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifySuperAdmins();
