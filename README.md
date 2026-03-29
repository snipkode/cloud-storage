# ☁️ Cloud Storage - Multi Tenant

Cloud storage application dengan React, Firebase Authentication, dan Node.js backend dengan dukungan API Key untuk integrasi aplikasi eksternal.

## 🚀 Features

- ✅ **Google Authentication** - Login dengan Firebase Google Auth
- ✅ **Multi-Tenant** - Setiap user punya storage terpisah
- ✅ **API Key System** - Generate API key untuk akses eksternal
- ✅ **Permission Levels** - Read-only, Upload-only, Read-Write, Admin
- ✅ **Compact UI** - Modern design dengan Tailwind CSS
- ✅ **Drag & Drop** - Upload file dengan drag and drop
- ✅ **REST API** - Siap diintegrasikan dengan aplikasi lain
- ✅ **State Management** - Zustand untuk state management

## 📋 Prerequisites

1. **Firebase Project** - Buat di [Firebase Console](https://console.firebase.google.com)
2. **Node.js** - v18 atau lebih baru

## 🔧 Setup

### 1. Firebase Configuration

#### A. Buat Firebase Project
1. Buka [Firebase Console](https://console.firebase.google.com)
2. Create new project
3. Enable **Authentication** → **Sign-in method** → **Google**

#### B. Dapatkan Firebase Config (untuk Frontend)
1. Project Settings → General
2. Scroll ke "Your apps" → Web app
3. Copy config values ke `client/.env`

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

#### C. Download Service Account Key (untuk Backend)
1. Project Settings → Service Accounts
2. Generate New Private Key
3. Save sebagai `server/firebase-service-key.json`

### 2. Install Dependencies

```bash
# Install semua dependencies
npm run install:all

# Atau manual
cd client && npm install
cd ../server && npm install
```

### 3. Run Application

```bash
# Terminal 1 - Run Backend
npm run dev:server

# Terminal 2 - Run Frontend
npm run dev:client
```

Aplikasi akan berjalan di:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

## 📡 API Endpoints

### Authentication Methods

API mendukung 2 metode autentikasi:

**1. Firebase JWT Token** (untuk user yang login via web)
```
Authorization: Bearer <firebase_id_token>
```

**2. API Key** (untuk aplikasi eksternal)
```
Authorization: Bearer cs_live_xxxxxxxxxxxxx
```
atau
```
X-API-Key: cs_live_xxxxxxxxxxxxx
```
atau
```
?api_key=cs_live_xxxxxxxxxxxxx
```

> **Note:** Middleware akan mengecek API Key terlebih dahulu, lalu fallback ke Firebase JWT.

---

### Storage Endpoints

#### 📤 Upload File

**POST** `/api/upload`

Upload single file (max 50MB).

**Headers:**
```
Authorization: Bearer <api_key_or_firebase_token>
Content-Type: multipart/form-data
```

**Body (FormData):**
```
file: <file>
```

**Response (201):**
```json
{
  "message": "File uploaded successfully",
  "file": {
    "filename": "1234567890-document.pdf",
    "originalname": "document.pdf",
    "size": 1024567,
    "mimetype": "application/pdf",
    "createdAt": "2026-03-28T10:30:00.000Z"
  }
}
```

**Required Permission:** `upload`

---

#### 📤 Upload Multiple Files

**POST** `/api/upload-multiple`

Upload multiple files (max 10 files, each max 50MB).

**Headers:**
```
Authorization: Bearer <api_key_or_firebase_token>
Content-Type: multipart/form-data
```

**Body (FormData):**
```
files: <file1>, <file2>, ...
```

**Response (201):**
```json
{
  "message": "2 file(s) uploaded successfully",
  "files": [
    {
      "filename": "1234567890-doc1.pdf",
      "originalname": "doc1.pdf",
      "size": 1024567,
      "mimetype": "application/pdf",
      "createdAt": "2026-03-28T10:30:00.000Z"
    },
    {
      "filename": "1234567891-doc2.xlsx",
      "originalname": "doc2.xlsx",
      "size": 2048901,
      "mimetype": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "createdAt": "2026-03-28T10:30:01.000Z"
    }
  ]
}
```

**Required Permission:** `upload`

---

#### 📋 List Files

**GET** `/api/files`

List all files in user's tenant directory.

**Headers:**
```
Authorization: Bearer <api_key_or_firebase_token>
```

**Response (200):**
```json
{
  "files": [
    {
      "filename": "1234567890-document.pdf",
      "originalname": "document.pdf",
      "size": 1024567,
      "createdAt": "2026-03-28T10:30:00.000Z",
      "modifiedAt": "2026-03-28T10:30:00.000Z"
    }
  ],
  "total": 1,
  "stats": {
    "totalFiles": 1,
    "totalSize": 1024567
  }
}
```

**Required Permission:** `read`

---

#### 📥 Download File

**GET** `/api/download/:filename`

Download a file by filename.

**Headers:**
```
Authorization: Bearer <api_key_or_firebase_token>
```

**Response (200):**
```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="document.pdf"
<file binary data>
```

**Required Permission:** `read`

**Error (404):**
```json
{
  "error": "File not found"
}
```

---

#### 📄 Get File Info

**GET** `/api/file/:filename`

Get metadata/information about a file.

**Headers:**
```
Authorization: Bearer <api_key_or_firebase_token>
```

**Response (200):**
```json
{
  "file": {
    "filename": "1234567890-document.pdf",
    "originalname": "document.pdf",
    "size": 1024567,
    "createdAt": "2026-03-28T10:30:00.000Z",
    "modifiedAt": "2026-03-28T10:30:00.000Z"
  }
}
```

**Required Permission:** `read`

---

#### 🗑️ Delete File

**DELETE** `/api/delete/:filename`

Delete a file by filename.

**Headers:**
```
Authorization: Bearer <api_key_or_firebase_token>
```

**Response (200):**
```json
{
  "message": "File deleted successfully"
}
```

**Required Permission:** `delete`

---

#### 📊 Storage Stats

**GET** `/api/storage-stats`

Get storage usage statistics for current user.

**Headers:**
```
Authorization: Bearer <api_key_or_firebase_token>
```

**Response (200):**
```json
{
  "totalFiles": 5,
  "totalSize": 10485760,
  "quota": 5368709120,
  "usagePercent": "0.20"
}
```

**Fields:**
- `totalFiles`: Number of files stored
- `totalSize`: Total size in bytes
- `quota`: Storage quota in bytes (5GB default)
- `usagePercent`: Percentage of quota used

**Required Permission:** `read`

---

### API Key Management Endpoints

> All API Key management endpoints require **Firebase JWT authentication** (not API Key).

#### 🔑 Generate API Key

**POST** `/api/api-keys`

Generate a new API key.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Production App",
  "permissions": ["read", "upload", "delete"],
  "expiresAt": "2026-12-31T23:59:59.000Z"
}
```

**Fields:**
- `name` (required): Human-readable name for the API key
- `permissions` (optional): Array of permissions (`read`, `upload`, `delete`, `admin`)
- `expiresAt` (optional): Expiration date in ISO 8601 format

**Response (201):**
```json
{
  "message": "API key created successfully",
  "apiKey": {
    "id": "ak_1234567890abcdef",
    "key": "cs_live_a1b2c3d4e5f6...",
    "maskedKey": "cs_live_a1b2...****",
    "name": "Production App",
    "permissions": ["read", "upload", "delete"],
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "createdAt": "2026-03-28T10:30:00.000Z",
    "warning": "Store this API key securely. It will not be shown again!"
  }
}
```

> ⚠️ **Important:** The full API key is shown only once at creation time. Store it securely!

---

#### 📋 List API Keys

**GET** `/api/api-keys`

List all API keys for the current user.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Response (200):**
```json
{
  "apiKeys": [
    {
      "id": "ak_1234567890abcdef",
      "name": "Production App",
      "permissions": ["read", "upload", "delete"],
      "expiresAt": "2026-12-31T23:59:59.000Z",
      "createdAt": "2026-03-28T10:30:00.000Z",
      "lastUsedAt": "2026-03-28T12:00:00.000Z",
      "usageCount": 42,
      "active": true,
      "maskedKey": "cs_live_a1b2...****"
    }
  ],
  "total": 1
}
```

---

#### 📄 Get API Key Info

**GET** `/api/api-keys/:id`

Get detailed information about a specific API key.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Response (200):**
```json
{
  "apiKey": {
    "id": "ak_1234567890abcdef",
    "name": "Production App",
    "permissions": ["read", "upload", "delete"],
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "createdAt": "2026-03-28T10:30:00.000Z",
    "lastUsedAt": "2026-03-28T12:00:00.000Z",
    "usageCount": 42,
    "active": true,
    "maskedKey": "cs_live_a1b2...****"
  }
}
```

---

#### 📊 Get API Key Usage

**GET** `/api/api-keys/:id/usage`

Get usage statistics for a specific API key.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Response (200):**
```json
{
  "usage": {
    "id": "ak_1234567890abcdef",
    "name": "Production App",
    "usageCount": 42,
    "lastUsedAt": "2026-03-28T12:00:00.000Z",
    "createdAt": "2026-03-28T10:30:00.000Z",
    "active": true
  }
}
```

---

#### 🚫 Revoke API Key

**POST** `/api/api-keys/:id/revoke`

Revoke (deactivate) an API key without deleting it.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Response (200):**
```json
{
  "message": "API key revoked successfully",
  "apiKey": {
    "id": "ak_1234567890abcdef",
    "active": false
  }
}
```

---

#### 🗑️ Delete API Key

**DELETE** `/api/api-keys/:id`

Permanently delete an API key.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Response (200):**
```json
{
  "message": "API key deleted successfully"
}
```

---

#### 📖 Get Permission Levels

**GET** `/api/api-keys/permissions`

Get available permission levels (no authentication required).

**Response (200):**
```json
{
  "permissions": [
    {
      "id": "read_only",
      "name": "Read Only",
      "description": "Can only list and download files",
      "permissions": ["read"]
    },
    {
      "id": "upload_only",
      "name": "Upload Only",
      "description": "Can only upload files",
      "permissions": ["upload"]
    },
    {
      "id": "read_write",
      "name": "Read & Write",
      "description": "Can read, upload, and delete files",
      "permissions": ["read", "upload", "delete"]
    },
    {
      "id": "admin",
      "name": "Admin",
      "description": "Full access to all operations",
      "permissions": ["admin"]
    }
  ]
}
```

## 🏗️ Project Structure

```
cloud-storage/
├── client/                 # React Frontend (Vite)
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Login, Dashboard
│   │   ├── store/          # Zustand stores
│   │   │   ├── authStore.js
│   │   │   └── filesStore.js
│   │   ├── lib/            # Firebase config
│   │   └── App.jsx
│   ├── .env                # Environment variables
│   └── vite.config.js
├── server/                 # Node.js Backend
│   ├── lib/                # Firebase Admin config
│   ├── middleware/         # Auth middleware
│   ├── routes/             # API routes
│   ├── uploads/            # User files (auto-created)
│   │   └── {userId}/       # Tenant-isolated storage
│   └── server.js
└── package.json            # Root package.json
```

## 🔐 Multi-Tenant Architecture

Setiap user mendapat folder terpisah berdasarkan Firebase UID:

```
uploads/
├── abc123xyz/          # User 1
│   ├── file1.pdf
│   └── image.jpg
├── def456uvw/          # User 2
│   └── document.docx
└── ghi789rst/          # User 3
    └── data.xlsx
```

User tidak bisa mengakses file user lain karena:
1. Firebase Authentication memverifikasi identitas
2. Backend menggunakan `uid` dari token untuk menentukan folder
3. Token validation di setiap request

## 🔑 API Key System

### Permission Levels

| Level | Permissions | Use Case |
|-------|-------------|----------|
| `read_only` | `read` | Mobile app yang hanya view/download |
| `upload_only` | `upload` | Form upload di website partner |
| `read_write` | `read`, `upload`, `delete` | Internal tools, admin panels |
| `admin` | `admin` | Full access (skip permission checks) |

### API Key Format

```
cs_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
│  │    │
│  │    └── 48 character hex string (random)
│  └── environment (live/test)
└── prefix (cloud storage)
```

### Contoh Penggunaan API Key

**cURL:**
```bash
# List files
curl -H "Authorization: Bearer cs_live_abc123..." \
  http://localhost:3000/api/files

# Upload file
curl -X POST \
  -H "Authorization: Bearer cs_live_abc123..." \
  -F "file=@document.pdf" \
  http://localhost:3000/api/upload

# Alternative: X-API-Key header
curl -H "X-API-Key: cs_live_abc123..." \
  http://localhost:3000/api/files

# Alternative: Query parameter
curl "http://localhost:3000/api/files?api_key=cs_live_abc123..."
```

**JavaScript/Fetch:**
```javascript
const API_KEY = 'cs_live_xxxxxxxxxxxxx';

// List files
const response = await fetch('/api/files', {
  headers: {
    'Authorization': `Bearer ${API_KEY}`
  }
});
const files = await response.json();

// Upload file
const formData = new FormData();
formData.append('file', fileInput.files[0]);

await fetch('/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`
  },
  body: formData
});
```

**Python/Requests:**
```python
import requests

API_KEY = 'cs_live_xxxxxxxxxxxxx'
headers = {'Authorization': f'Bearer {API_KEY}'}

# List files
response = requests.get('http://localhost:3000/api/files', headers=headers)
files = response.json()

# Upload file
with open('document.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:3000/api/upload',
        headers=headers,
        files={'file': f}
    )
```

### Best Practices

1. **Simpan API key di environment variable** - Jangan hardcode di source code
2. **Gunakan permission minimal** - Berikan hanya permission yang diperlukan
3. **Rotate API key secara berkala** - Revoke dan generate baru
4. **Monitor usage** - Cek usage stats untuk deteksi anomaly
5. **Revoke segera jika compromised** - API key bisa di-revoke kapan saja

## 🎨 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Icons | React Icons |
| Auth | Firebase Authentication |
| Backend | Node.js + Express |
| File Upload | Multer |
| CORS | cors middleware |

## 📝 Notes

- Max file size: **50MB** per file
- Max upload: **10 files** sekaligus
- Default quota: **5GB** per user (configurable)

## 🔧 Development

```bash
# Run frontend only
npm run dev:client

# Run backend only
npm run dev:server

# Build frontend for production
npm run build:client
```

## 📄 License

ISC
