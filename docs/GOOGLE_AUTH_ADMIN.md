# 🔐 Google Auth Admin Role Management

Best practice untuk memberikan role **super_admin** kepada user yang login menggunakan **Google Sign-In**.

---

## 🎯 Problem

Karena menggunakan **Google Authentication**, kita tidak bisa:
- ❌ Membuat user dengan password manual
- ❌ Menggunakan seed script yang membuat user baru

Solusi: **User harus login dulu via Google**, lalu kita grant role melalui script.

---

## ✅ Best Practice Flow

```
1. User login via Google Sign-In
   ↓
2. Firebase Auth user created automatically
   ↓
3. Run script to grant super_admin role
   ↓
4. User logout & login again
   ↓
5. User now has admin access!
```

---

## 🚀 Quick Start

### 1. User Login Dulu

Minta calon admin untuk login terlebih dahulu di aplikasi:
```
https://your-app.com/login
```

Ini akan membuat:
- ✅ Firebase Auth user
- ✅ Firestore user document (otomatis via middleware)

### 2. Grant Super Admin Role

```bash
cd server

# Grant role ke email spesifik
npm run set:superadmin admin@example.com
```

### 3. User Logout & Login Lagi

User perlu logout dan login lagi untuk mendapatkan role baru.

---

## 📋 Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **Set Super Admin** | `npm run set:superadmin <email>` | Grant super_admin role |
| **Revoke Super Admin** | `npm run revoke:superadmin <email>` | Remove super_admin role |
| **List Admins** | `npm run list:admins` | Show all super_admins |
| **Verify Seed** | `npm run verify:seed` | Check seed status |

---

## 🎨 Usage Examples

### Grant Super Admin Role

```bash
# With email argument
npm run set:superadmin admin@example.com

# Output:
══════════════════════════════════════════════
🔐 Set Super Admin Role for Google Auth User
══════════════════════════════════════════════

🔍 Searching for user with email: admin@example.com
✓ User found in Firebase Auth
  UID: Qi82fxj0G2NaiphOG3V6ce8dWe73
  Display Name: John Doe
  Email Verified: true

📝 Setting Firebase custom claims...
✓ Custom claims set successfully

📝 Updating Firestore user document...
✓ User document updated

══════════════════════════════════════════════
✅ Super Admin role granted successfully!
══════════════════════════════════════════════
📧 Email:     admin@example.com
👤 Name:      John Doe
🎭 Role:      super_admin
🔑 UID:       Qi82fxj0G2NaiphOG3V6ce8dWe73
══════════════════════════════════════════════

✨ User can now access admin features immediately!
   (May need to refresh token - logout and login again)
```

### Revoke Super Admin Role

```bash
npm run revoke:superadmin admin@example.com

# Output:
Revoke super_admin role from "admin@example.com"? (yes/no): yes

✅ Super Admin role revoked successfully!
══════════════════════════════════════════════
📧 Email:     admin@example.com
🎭 Old Role:  super_admin
🎭 New Role:  user
══════════════════════════════════════════════

⚠️  User will lose admin access immediately.
```

### List All Super Admins

```bash
npm run list:admins

# Output:
📋 Current Super Admins:

──────────────────────────────────────────────
👑 admin@example.com
   Name: John Doe
   Granted: 2026-03-30T10:15:30.000Z

👑 superadmin@company.com
   Name: Jane Smith
   Granted: 2026-03-29T08:30:00.000Z
```

---

## 🔒 Security Features

### 1. **Custom Claims (Firebase)**

Script set custom claims di Firebase Auth:

```javascript
await admin.auth().setCustomUserClaims(uid, {
  role: 'super_admin',
  isSuperAdmin: true,
  grantedAt: timestamp,
  grantedBy: 'set-super-admin-script'
});
```

**Benefits:**
- ✅ Claims included in ID token
- ✅ Can be verified in middleware
- ✅ Tamper-proof (signed by Firebase)

### 2. **Firestore Role Document**

User document di Firestore:

```javascript
{
  email: "admin@example.com",
  displayName: "John Doe",
  role: "super_admin",
  isSuperAdmin: true,
  roleGrantedAt: "2026-03-30T10:15:30.000Z",
  roleGrantedBy: "set-super-admin-script",
  authProvider: "google.com"
}
```

### 3. **Audit Logging**

All admin changes logged:

```javascript
// Collection: admin_logs
{
  action: "grant_super_admin",
  targetUserId: "uid123",
  targetUserEmail: "admin@example.com",
  grantedBy: "set-super-admin-script",
  timestamp: "2026-03-30T10:15:30.000Z"
}
```

### 4. **Last Super Admin Protection**

Script mencegah revoke last super_admin:

```
❌ Cannot revoke the last super_admin!
   There must be at least one super_admin in the system.
```

---

## 🔧 Middleware Integration

Update middleware untuk cek custom claims:

**File:** `server/middleware/auth.js`

```javascript
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Priority: Custom claims > Firestore role
    let role = decodedToken.role || 'user';

    // Fallback to Firestore if no custom claim
    if (!decodedToken.role) {
      const userDoc = await db.collection('users')
        .doc(decodedToken.uid)
        .get();
      
      if (userDoc.exists) {
        role = userDoc.data().role || 'user';
      }
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name,
      role,
      authMethod: 'firebase'
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
```

---

## 📊 Firestore Collections

### users/{uid}

```javascript
{
  // Basic info
  email: "admin@example.com",
  displayName: "John Doe",
  photoURL: "https://...",
  
  // Role
  role: "super_admin",
  isSuperAdmin: true,
  
  // Timestamps
  createdAt: "2026-03-30T10:00:00.000Z",
  updatedAt: "2026-03-30T10:15:30.000Z",
  roleGrantedAt: "2026-03-30T10:15:30.000Z",
  roleRevokedAt: null,
  
  // Audit
  roleGrantedBy: "set-super-admin-script",
  roleRevokedBy: null,
  
  // Auth provider
  authProvider: "google.com"
}
```

### admin_logs/{id}

```javascript
{
  action: "grant_super_admin",
  targetUserId: "uid123",
  targetUserEmail: "admin@example.com",
  grantedBy: "set-super-admin-script",
  timestamp: "2026-03-30T10:15:30.000Z",
  details: {
    previousRole: "user",
    newRole: "super_admin"
  }
}
```

---

## 🛠️ Troubleshooting

### Error: "User not found in Firebase Auth"

**Penyebab:** User belum login via Google Sign-In.

**Solusi:**
1. Minta user login dulu di aplikasi
2. Setelah login, jalankan script lagi

### Error: "Cannot revoke the last super_admin"

**Penyebab:** Hanya ada 1 super_admin di sistem.

**Solusi:**
1. Grant role ke user lain dulu
2. Baru revoke yang ini

### User masih tidak punya akses admin

**Penyebab:** Token belum refresh.

**Solusi:**
1. User logout
2. User login lagi
3. Custom claims akan include di token baru

---

## 🎯 Best Practices

### ✅ DO

1. ✅ **Grant via script** - Gunakan script untuk konsistensi
2. ✅ **Audit trail** - Semua perubahan ter-log
3. ✅ **Custom claims** - Untuk security tambahan
4. ✅ **Test first** - Test di development sebelum production
5. ✅ **Document** - Catat siapa yang grant role

### ❌ DON'T

1. ❌ **Manual Firestore edit** - Bisa inconsistent
2. ❌ **Share service account key** - Rahasia!
3. ❌ **Grant tanpa approval** - Butuh authorization
4. ❌ **Revoke last admin** - Sistem bisa locked

---

## 📁 Complete Script List

```
scripts/
├── seed-super-admin.js        # For non-Google Auth (legacy)
├── set-super-admin.js         # Grant role to Google Auth user
├── revoke-super-admin.js      # Revoke role from user
└── verify-seed.js             # Check seed status & list admins
```

---

## 🔄 Migration from Seed Script

Jika sebelumnya pakai seed script (non-Google Auth):

```bash
# Old method (deprecated for Google Auth)
npm run seed:admin

# New method (for Google Auth)
npm run set:superadmin admin@example.com
```

Seed script masih bisa digunakan untuk:
- Testing environment
- Non-Google Auth deployments
- Emergency backup admin

---

**Last Updated:** March 30, 2026  
**Version:** 2.0.0 (Google Auth)
