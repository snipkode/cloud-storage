/**
 * Set Super Admin Role for Google Auth User
 * 
 * This script grants super_admin role to a specific Google account email.
 * It works with existing Firebase Auth users created via Google Sign-In.
 * 
 * Usage:
 *   node scripts/set-super-admin.js admin@example.com
 * 
 * Or with prompt:
 *   node scripts/set-super-admin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'server', 'firebase-service-key.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Firebase service account key not found!');
  console.error(`   Expected at: ${serviceAccountPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

/**
 * Find user by email and grant super_admin role
 */
async function setSuperAdminRole(email) {
  try {
    console.log('\n🔍 Searching for user with email:', email);

    // 1. Find user in Firebase Auth by email
    const authUsers = await admin.auth().getUserByEmail(email);
    
    if (!authUsers) {
      console.log('\n❌ User not found in Firebase Auth!');
      console.log('   The user must login at least once via Google Sign-In first.\n');
      rl.close();
      process.exit(1);
    }

    const uid = authUsers.uid;
    console.log('✓ User found in Firebase Auth');
    console.log('  UID:', uid);
    console.log('  Display Name:', authUsers.displayName || 'N/A');
    console.log('  Email Verified:', authUsers.emailVerified);

    // 2. Check if user already has super_admin role in Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData.role === 'super_admin') {
        console.log('\n⚠️  User already has super_admin role!\n');
        
        const updateConfirm = await askQuestion('   Update anyway? (yes/no): ');
        if (updateConfirm.toLowerCase() !== 'yes') {
          console.log('\n❌ Operation cancelled.\n');
          rl.close();
          process.exit(0);
        }
      }
    }

    // 3. Set custom claims for additional security (optional but recommended)
    console.log('\n📝 Setting Firebase custom claims...');
    await admin.auth().setCustomUserClaims(uid, {
      role: 'super_admin',
      isSuperAdmin: true,
      grantedAt: new Date().toISOString(),
      grantedBy: 'set-super-admin-script'
    });
    console.log('✓ Custom claims set successfully');

    // 4. Create or update user document in Firestore
    console.log('\n📝 Updating Firestore user document...');
    
    const now = new Date().toISOString();
    const updateData = {
      role: 'super_admin',
      isSuperAdmin: true,
      updatedAt: now,
      roleGrantedAt: now,
      roleGrantedBy: 'set-super-admin-script'
    };

    if (userDoc.exists) {
      // Update existing document
      await db.collection('users').doc(uid).update(updateData);
      console.log('✓ User document updated');
    } else {
      // Create new document
      await db.collection('users').doc(uid).set({
        email: email,
        displayName: authUsers.displayName || email.split('@')[0],
        photoURL: authUsers.photoURL || null,
        role: 'super_admin',
        isSuperAdmin: true,
        createdAt: now,
        updatedAt: now,
        roleGrantedAt: now,
        roleGrantedBy: 'set-super-admin-script',
        authProvider: 'google.com'
      });
      console.log('✓ User document created');
    }

    // 5. Create audit log
    await db.collection('admin_logs').add({
      action: 'grant_super_admin',
      targetUserId: uid,
      targetUserEmail: email,
      grantedBy: 'set-super-admin-script',
      timestamp: now,
      details: {
        previousRole: userDoc.exists ? userDoc.data().role : 'none',
        newRole: 'super_admin'
      }
    });

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Super Admin role granted successfully!');
    console.log('═'.repeat(60));
    console.log('📧 Email:     ', email);
    console.log('👤 Name:      ', authUsers.displayName || 'N/A');
    console.log('🎭 Role:      ', 'super_admin');
    console.log('🔑 UID:       ', uid);
    console.log('═'.repeat(60));
    console.log('\n✨ User can now access admin features immediately!');
    console.log('   (May need to refresh token - logout and login again)\n');

    rl.close();
    return true;
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.error('\n   User not found in Firebase Auth.');
      console.error('   The user must login at least once via Google Sign-In first.');
    }
    
    rl.close();
    process.exit(1);
  }
}

/**
 * List current super admins
 */
async function listSuperAdmins() {
  try {
    console.log('\n📋 Current Super Admins:\n');
    
    const snapshot = await db.collection('users')
      .where('role', '==', 'super_admin')
      .get();

    if (snapshot.empty) {
      console.log('   No super_admin users found.\n');
      return;
    }

    console.log('─'.repeat(60));
    snapshot.forEach(doc => {
      const user = doc.data();
      console.log(`👑 ${user.email}`);
      console.log(`   Name: ${user.displayName || 'N/A'}`);
      console.log(`   Granted: ${user.roleGrantedAt || user.createdAt || 'N/A'}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error listing super admins:', error.message);
  }
}

// Main function
async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('🔐 Set Super Admin Role for Google Auth User');
  console.log('═'.repeat(60));
  console.log('\nThis script grants super_admin role to a Google account.');
  console.log('The user must have logged in at least once via Google Sign-In.\n');

  // Check if email provided as argument
  const emailArg = process.argv[2];

  if (emailArg && emailArg !== '--list') {
    const email = emailArg.trim();
    if (!email.includes('@')) {
      console.log('\n❌ Invalid email address!\n');
      rl.close();
      process.exit(1);
    }

    const confirm = await askQuestion(`Grant super_admin role to "${email}"? (yes/no): `);
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled.\n');
      rl.close();
      process.exit(0);
    }

    await setSuperAdminRole(email);
  } else if (emailArg === '--list') {
    await listSuperAdmins();
    rl.close();
  } else {
    const email = await askQuestion('Enter Google account email: ');
    
    if (!email || !email.includes('@')) {
      console.log('\n❌ Invalid email address!\n');
      rl.close();
      process.exit(1);
    }

    const confirm = await askQuestion(`\nGrant super_admin role to "${email}"? (yes/no): `);
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled.\n');
      rl.close();
      process.exit(0);
    }

    await setSuperAdminRole(email);
  }
}

// Run the script
main().catch((error) => {
  console.error('\n❌ Unexpected error:', error.message);
  rl.close();
  process.exit(1);
});
