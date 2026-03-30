# 🎯 Quick Reference: Admin Management

## Google Auth User Flow

```
1. User login via Google Sign-In
   ↓
2. Admin grants role via script
   ↓
3. User logout-login
   ↓
4. User has admin access!
```

---

## NPM Scripts

```bash
cd server

# Grant super_admin role
npm run auth:set-superadmin admin@example.com

# Revoke super_admin role  
npm run auth:revoke-superadmin admin@example.com

# List all super_admins
npm run auth:list-admins
```

---

## Example Usage

### Grant Role

```bash
npm run auth:set-superadmin john@company.com

# Output:
✅ Super Admin role granted successfully!
══════════════════════════════════════════
📧 Email:     john@company.com
👤 Name:      John Doe
🎭 Role:      super_admin
══════════════════════════════════════════
```

### List Admins

```bash
npm run auth:list-admins

# Output:
✅ Super Admin Users Found:

══════════════════════════════════════════
👑 john@company.com
   Name: John Doe
   UID: Qi82fxj0G2NaiphOG3V6ce8dWe73
   Granted: 2026-03-30T10:15:30.000Z
   Provider: google.com
```

---

## Important Notes

- ✅ User **MUST** login first via Google Sign-In
- ✅ User needs to **logout-login** after role grant
- ✅ Cannot revoke the **last super_admin**
- ✅ All changes are **audit logged**

---

## Troubleshooting

**Error: "User not found"**
→ User belum login via Google. Minta login dulu.

**User masih tidak punya akses**
→ User perlu logout-login lagi untuk refresh token.

**Cannot revoke last admin**
→ Grant role ke user lain dulu sebelum revoke.

---

**Full Documentation:** `docs/GOOGLE_AUTH_ADMIN.md`
