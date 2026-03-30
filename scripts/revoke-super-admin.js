/**
 * Revoke Super Admin Role
 * 
 * Remove super_admin role from a user and downgrade to regular user.
 * 
 * Usage:
 *   node scripts/revoke-super-admin.js admin@example.com
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

async function revokeSuperAdminRole(email) {
  try {
    console.log('\n🔍 Searching for user:', email);

    // Find user in Firebase Auth
    const authUser = await admin.auth().getUserByEmail(email);
    const uid = authUser.uid;

    console.log('✓ User found:', uid);

    // Check current role in Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      console.log('\n❌ User document not found in Firestore!\n');
      process.exit(1);
    }

    const userData = userDoc.data();
    
    if (userData.role !== 'super_admin') {
      console.log('\n⚠️  User is not a super_admin!');
      console.log('   Current role:', userData.role, '\n');
      process.exit(1);
    }

    // Prevent revoking the last super_admin
    const superAdminsSnapshot = await db.collection('users')
      .where('role', '==', 'super_admin')
      .get();

    if (superAdminsSnapshot.size <= 1) {
      console.log('\n❌ Cannot revoke the last super_admin!');
      console.log('   There must be at least one super_admin in the system.\n');
      process.exit(1);
    }

    // Remove custom claims
    console.log('\n📝 Removing custom claims...');
    await admin.auth().setCustomUserClaims(uid, {});
    console.log('✓ Custom claims removed');

    // Update Firestore document
    console.log('\n📝 Updating Firestore document...');
    await db.collection('users').doc(uid).update({
      role: 'user',
      isSuperAdmin: false,
      roleRevokedAt: new Date().toISOString(),
      roleRevokedBy: 'revoke-super-admin-script',
      updatedAt: new Date().toISOString()
    });
    console.log('✓ User role downgraded to "user"');

    // Create audit log
    await db.collection('admin_logs').add({
      action: 'revoke_super_admin',
      targetUserId: uid,
      targetUserEmail: email,
      revokedBy: 'revoke-super-admin-script',
      timestamp: new Date().toISOString(),
      details: {
        previousRole: 'super_admin',
        newRole: 'user'
      }
    });

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Super Admin role revoked successfully!');
    console.log('═'.repeat(60));
    console.log('📧 Email:     ', email);
    console.log('🎭 Old Role:  ', 'super_admin');
    console.log('🎭 New Role:  ', 'user');
    console.log('═'.repeat(60));
    console.log('\n⚠️  User will lose admin access immediately.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'auth/user-not-found') {
      console.error('   User not found in Firebase Auth.');
    }
    process.exit(1);
  }
}

// Main
const email = process.argv[2];

if (!email) {
  console.log('\n❌ Email required!');
  console.log('\nUsage: node scripts/revoke-super-admin.js <email>\n');
  process.exit(1);
}

const rl = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question(`Revoke super_admin role from "${email}"? (yes/no): `, (answer) => {
  rl.close();
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('\n❌ Operation cancelled.\n');
    process.exit(0);
  }
  
  revokeSuperAdminRole(email);
});
