/**
 * Verify Super Admin Seed Status
 * 
 * Check if super_admin has been seeded and display info
 * 
 * Usage:
 *   node scripts/verify-seed.js
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

async function verifySeed() {
  try {
    console.log('\n🔍 Checking super_admin seed status...\n');

    // Check system marker document
    const seedDoc = await db.collection('system').doc('super_admin_seed').get();
    
    if (seedDoc.exists) {
      const data = seedDoc.data();
      console.log('✅ Super Admin has been seeded\n');
      console.log('─'.repeat(50));
      console.log('Seeded At:  ', data.seededAt);
      console.log('Email:      ', data.email);
      console.log('UID:        ', data.uid);
      console.log('─'.repeat(50));
    } else {
      console.log('⚠️  No seed marker found\n');
      
      // Check if any super_admin exists
      const usersSnapshot = await db.collection('users')
        .where('role', '==', 'super_admin')
        .get();

      if (usersSnapshot.empty) {
        console.log('ℹ️  No super_admin users found in database.');
        console.log('\n📝 Run the seed script to create the first super_admin:');
        console.log('   node scripts/seed-super-admin.js\n');
      } else {
        console.log('⚠️  Super_admin users exist but no seed marker found.');
        console.log('   This might mean the seed script was not used.\n');
        
        usersSnapshot.forEach(doc => {
          const user = doc.data();
          console.log(`   - ${user.email} (${doc.id})`);
        });
        console.log('');
      }
    }

    // List all admin users
    console.log('📋 All Admin Users:\n');
    const adminUsersSnapshot = await db.collection('users')
      .where('role', 'in', ['admin', 'super_admin'])
      .get();

    if (adminUsersSnapshot.empty) {
      console.log('   No admin users found.\n');
    } else {
      console.log('─'.repeat(50));
      adminUsersSnapshot.forEach(doc => {
        const user = doc.data();
        console.log(`   ${user.role === 'super_admin' ? '👑' : '🛡️'}  ${user.email}`);
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

verifySeed();
