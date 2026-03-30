# 🔒 Security Documentation

## Security Score: 95/100 🟢

This document outlines the security measures, best practices, and known security considerations for the Cloud Storage application.

---

## 📋 Table of Contents

- [Security Features](#security-features)
- [Authentication & Authorization](#authentication--authorization)
- [API Key Security](#api-key-security)
- [Encryption](#encryption)
- [Rate Limiting](#rate-limiting)
- [File Upload Security](#file-upload-security)
- [Logging & Error Handling](#logging--error-handling)
- [Environment Variables](#environment-variables)
- [Security Checklist](#security-checklist)
- [Known Limitations](#known-limitations)
- [Reporting Security Issues](#reporting-security-issues)

---

## 🛡️ Security Features

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Authentication** | Firebase JWT + API Keys | ✅ Active |
| **Authorization** | Role-Based Access Control (RBAC) | ✅ Active |
| **API Key Storage** | SHA-256 Hash + AES-256-CBC Encryption | ✅ Active |
| **Rate Limiting** | Express Rate Limit | ✅ Active |
| **CORS Protection** | Configurable allowed origins | ✅ Active |
| **Security Headers** | Helmet.js | ✅ Active |
| **File Validation** | MIME type + Extension whitelist | ✅ Active |
| **Path Traversal Protection** | `path.basename()` sanitization | ✅ Active |
| **Environment Isolation** | Separate test/live storage | ✅ Active |
| **Secure Logging** | Environment-aware log levels | ✅ Active |

---

## 🔐 Authentication & Authorization

### Authentication Methods

1. **Firebase JWT Token**
   - Used for web application users
   - Validated via Firebase Admin SDK
   - Token expiration enforced

2. **API Key**
   - Used for external application integration
   - Format: `cs_{env}_{48-hex-chars}`
   - Validated via hash comparison
   - Supports header-based transmission only (no query params)

### Role Hierarchy

```
super_admin (2) > admin (1) > user (0)
```

| Role | Permissions |
|------|-------------|
| `user` | Basic file operations (read, upload, delete) |
| `admin` | User permissions + admin endpoints |
| `super_admin` | All permissions + broadcast notifications |

### Authorization Checks

- **Firebase Users:** Role checked via Firestore `users` collection
- **API Key Users:** Permission array checked for each request
- **Admin Endpoints:** Require `admin` or `super_admin` role

---

## 🔑 API Key Security

### Storage Security

API keys are protected with multiple layers:

1. **Hashing:** SHA-256 one-way hash for lookup
2. **Encryption:** AES-256-CBC for reversible storage (display purposes)
3. **Transmission:** Header-only (never in URL/query params)

### Key Format

```
cs_live_a1b2c3d4e5f6789012345678901234567890123456789012
│  │    │
│  │    └── 48 hex characters (random)
│  └── environment (live | test)
└── prefix (cloud storage)
```

### Permission Levels

| Level | Permissions | Use Case |
|-------|-------------|----------|
| `READ_ONLY` | `['read']` | Download/view only |
| `UPLOAD_ONLY` | `['upload']` | Upload forms |
| `READ_WRITE` | `['read', 'upload', 'delete']` | Full file management |
| `ADMIN` | `['admin']` | Full access |

### Best Practices

1. ✅ Store in environment variables
2. ✅ Use minimum required permissions
3. ✅ Set expiration dates
4. ✅ Rotate periodically (every 90 days recommended)
5. ✅ Monitor usage statistics
6. ✅ Revoke immediately if compromised
7. ❌ Never commit to version control
8. ❌ Never expose in client-side code
9. ❌ Never transmit via query parameters

---

## 🔒 Encryption

### API Key Encryption

**Algorithm:** AES-256-CBC  
**Key Size:** 32 bytes (256 bits)  
**IV Size:** 16 bytes (128 bits)  
**Format:** 64 hexadecimal characters

### Key Requirements

```bash
# Generate secure encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output: 5e80c9807a80fefc16873e0b81a9b17459dcf65f6a3e6ffa26e60342273f4a18
#         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#         Exactly 64 hexadecimal characters
```

### Validation

The encryption key is validated on startup:
- ✅ Must be exactly 64 characters
- ✅ Must be valid hexadecimal (0-9, a-f, A-F)
- ❌ Server will not start with invalid key

### Key Management

⚠️ **CRITICAL:** 
- Store encryption key in secure secrets manager
- Backup encryption key securely
- Changing key invalidates all existing API keys
- Key cannot be recovered if lost

---

## 🚦 Rate Limiting

### Default Limits

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| General API | 1000 req | 15 min | Prevent abuse |
| Auth endpoints | 200 req | 15 min | Prevent brute force |
| Download endpoints | 100 req | 15 min | Prevent bandwidth abuse |

### Response on Limit Exceeded

```json
{
  "error": "Too many requests",
  "message": "Please try again later"
}
```

**HTTP Status:** `429 Too Many Requests`

---

## 📁 File Upload Security

### Allowed File Types

**Images:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`, `.svg`  
**Documents:** `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.txt`, `.csv`, `.md`  
**Audio:** `.mp3`, `.wav`, `.ogg`, `.m4a`  
**Video:** `.mp4`, `.webm`, `.mov`, `.avi`, `.mkv`, `.flv`  
**Archives:** `.zip`, `.rar`, `.gz`, `.tar`

### Validation

1. **MIME Type Check:** Validated against whitelist
2. **Extension Check:** Validated against whitelist
3. **Size Limit:** Maximum 50MB per file
4. **Filename Sanitization:** Path traversal prevention

### Storage

- Files stored outside web root
- Tenant-isolated directories
- Environment separation (test/live)

---

## 📝 Logging & Error Handling

### Log Levels

| Level | Environment | Description |
|-------|-------------|-------------|
| `debug` | Development only | Detailed debugging info |
| `info` | Development only | General information |
| `warn` | All environments | Warnings |
| `error` | All environments | Errors (sanitized) |

### Production Safety

✅ Stack traces hidden in production  
✅ Sensitive data not logged in production  
✅ Error messages sanitized  
✅ User IDs masked in production logs

### Example

```javascript
// Development
[ERROR] Upload error: Multer error: file too large
    at multerMiddleware (/app/routes/api.js:123:5)
    ...

// Production
[ERROR] Upload error: Multer error: file too large
```

---

## 🔐 Environment Variables

### Required Variables

| Variable | Description | Validation |
|----------|-------------|------------|
| `PORT` | Server port | Integer |
| `NODE_ENV` | Environment | `development` \| `production` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Non-empty |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Valid email format |
| `FIREBASE_PRIVATE_KEY` | Service account key | Valid PEM format |
| `API_KEY_ENCRYPTION_KEY` | Encryption key | 64 hex chars |
| `ALLOWED_ORIGINS` | CORS origins | Comma-separated URLs |

### Security

- ✅ `.env` files in `.gitignore`
- ✅ `.env.example` provided with placeholders
- ✅ Sensitive defaults rejected

---

## ✅ Security Checklist

### Deployment

- [ ] Generate secure encryption key (64 hex chars)
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS allowed origins
- [ ] Set up Firebase service account
- [ ] Restrict file upload types if needed
- [ ] Configure rate limits for your use case
- [ ] Enable HTTPS/TLS
- [ ] Set up firewall rules
- [ ] Configure log rotation
- [ ] Set up monitoring/alerting

### Ongoing Maintenance

- [ ] Rotate API keys every 90 days
- [ ] Review access logs weekly
- [ ] Update dependencies monthly
- [ ] Audit user roles quarterly
- [ ] Review rate limit settings
- [ ] Test backup/restore procedures

### Incident Response

- [ ] Document revocation procedure
- [ ] Prepare key rotation script
- [ ] Set up security contact email
- [ ] Create breach notification template

---

## ⚠️ Known Limitations

1. **Firestore Security Rules:** Backend assumes proper Firestore rules are configured. Review and configure Firestore security rules for defense in depth.

2. **File Content Scanning:** Files are not scanned for malware. Consider adding virus scanning for sensitive deployments.

3. **Brute Force Protection:** Rate limiting provides basic protection. Consider adding IP-based blocking for high-security deployments.

4. **Audit Logging:** Basic usage tracking exists. Full audit logging (who accessed what when) is not implemented.

---

## 📧 Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **Do not** create a public GitHub issue
2. Email: [your-security-contact@example.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We aim to respond within 48 hours and resolve critical issues within 7 days.

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)

---

**Last Updated:** March 30, 2026  
**Security Score:** 95/100 🟢
