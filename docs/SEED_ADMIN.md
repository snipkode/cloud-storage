# 🔐 Super Admin Seed Script

Script untuk membuat user **super_admin** pertama dan satu-satunya di sistem.

---

## ⚠️ PENTING

- Script ini **HANYA BISA DIJALANKAN SEKALI**
- Setelah super_admin dibuat, script akan menolak untuk dijalankan lagi
- Ini adalah fitur keamanan untuk mencegah multiple super_admin yang tidak diinginkan

---

## 📋 Prerequisites

1. **Firebase Service Account Key**
   - Download dari Firebase Console
   - Project Settings → Service Accounts → Generate New Private Key
   - Save sebagai `server/firebase-service-key.json`

2. **Environment Variables**
   - Pastikan `.env` sudah dikonfigurasi dengan benar
   - FIREBASE_PROJECT_ID
   - FIREBASE_CLIENT_EMAIL
   - FIREBASE_PRIVATE_KEY

---

## 🚀 Cara Menggunakan

### Option 1: Menggunakan npm script (Recommended)

```bash
cd server

# Jalankan seed script
npm run seed:admin
```

### Option 2: Menjalankan script langsung

```bash
cd cloud-storage
node scripts/seed-super-admin.js
```

---

## 📝 Proses Seed

1. **Script akan mengecek** apakah super_admin sudah ada
2. **Jika sudah ada** → Script berhenti dengan pesan error
3. **Jika belum ada** → Script akan meminta:
   - Email super_admin
   - Nama super_admin
   - Konfirmasi pembuatan user

### Contoh Output

```
════════════════════════════════════════════════════════
🔐 Super Admin Seed Script
════════════════════════════════════════════════════════

This script creates the first super_admin user.
⚠️  WARNING: This can only be run ONCE for security.

Enter super_admin email: admin@example.com
Enter super_admin name: System Administrator

Create super_admin user "admin@example.com"? (yes/no): yes

🔍 Checking for existing super_admin...
✓ No existing super_admin found

📝 Creating super_admin user...

✅ Super Admin user created successfully!

════════════════════════════════════════════════════════
📧 Email:          admin@example.com
👤 Name:           System Administrator
🔑 Temporary Password: x7k9m2p4!@#
🎭 Role:           super_admin
════════════════════════════════════════════════════════

⚠️  IMPORTANT:
   - Please change the password after first login!
   - This temporary password will not be shown again.
   - Store it securely before closing this terminal.

📄 Credentials saved to: scripts/super-admin-credentials.txt
   ⚠️  Delete this file after saving credentials securely!
```

---

## 🔑 Temporary Password

Password yang digenerate bersifat **sementara**:
- Format: 16 karakter random (huruf + angka + simbol)
- **HARUS** diubah setelah login pertama
- Disimpan di file `scripts/super-admin-credentials.txt`
- **HANYA** ditampilkan sekali saat pembuatan

### Langkah Setelah Seed

1. **Simpan credentials** dengan aman
2. **Login** dengan email dan temporary password
3. **Ubah password** di pengaturan akun
4. **Hapus file** `scripts/super-admin-credentials.txt`

---

## ✅ Verifikasi Seed

Untuk mengecek status seed:

```bash
# Menggunakan npm script
npm run verify:seed

# Atau langsung
node scripts/verify-seed.js
```

### Output Verifikasi

```
🔍 Checking super_admin seed status...

✅ Super Admin has been seeded

──────────────────────────────────────────
Seeded At:   2026-03-30T10:15:30.000Z
Email:       admin@example.com
UID:         Qi82fxj0G2NaiphOG3V6ce8dWe73
──────────────────────────────────────────

📋 All Admin Users:

👑  admin@example.com
   Role: super_admin
   Created: 2026-03-30T10:15:30.000Z
```

---

## 🔒 Keamanan

### Script Mencegah:

1. **Multiple Super Admin** - Hanya 1 super_admin yang bisa dibuat via seed
2. **Accidental Re-run** - Marker document di Firestore mencegah re-run
3. **Unauthorized Access** - Memerlukan Firebase service account key

### Marker Document

Script membuat document di Firestore:
```
Collection: system
Document: super_admin_seed
Data: {
  seeded: true,
  seededAt: timestamp,
  email: string,
  uid: string
}
```

Document ini **TIDAK BOLEH DIHAPUS** karena berfungsi sebagai pengaman.

---

## 🛠️ Troubleshooting

### Error: "Super Admin user already exists"

**Penyebab:** Script sudah pernah dijalankan sebelumnya.

**Solusi:** 
- Gunakan Firebase Console untuk manage user
- Atau gunakan Admin API untuk membuat admin tambahan

### Error: "Firebase service account key not found"

**Penyebab:** File `server/firebase-service-key.json` tidak ada.

**Solusi:**
```bash
# Download dari Firebase Console
# Project Settings → Service Accounts → Generate New Private Key
# Save sebagai: server/firebase-service-key.json
```

### Error: "Email already in use"

**Penyebab:** Email yang digunakan sudah terdaftar.

**Solusi:** Gunakan email yang berbeda.

---

## 📁 File Structure

```
cloud-storage/
├── scripts/
│   ├── seed-super-admin.js       # Main seed script
│   ├── verify-seed.js            # Verification script
│   └── super-admin-credentials.txt  # Generated credentials (DELETE AFTER USE!)
├── server/
│   ├── firebase-service-key.json # Required!
│   └── package.json              # Contains npm scripts
└── docs/
    └── SEED_ADMIN.md             # This file
```

---

## 🎯 Best Practices

1. ✅ **Run sekali saja** - Jangan jalankan ulang
2. ✅ **Simpan credentials** - Gunakan password manager
3. ✅ **Ubah password** - Segera setelah login pertama
4. ✅ **Hapus file credentials** - Setelah disimpan dengan aman
5. ✅ **Jangan commit** - File credentials masuk `.gitignore`

---

## 📞 Support

Jika ada masalah:
1. Cek log error yang ditampilkan
2. Verifikasi Firebase configuration
3. Pastikan service account key valid
4. Cek Firestore rules

---

**Last Updated:** March 30, 2026  
**Version:** 1.0.0
