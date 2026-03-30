# ☁️ Cloud Storage - Multi Tenant

[![GitHub stars](https://img.shields.io/github/stars/snipkode/cloud-storage?style=for-the-badge&logo=github&color=gold)](https://github.com/snipkode/cloud-storage/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/snipkode/cloud-storage?style=for-the-badge&logo=github&color=blue)](https://github.com/snipkode/cloud-storage/network)
[![GitHub issues](https://img.shields.io/github/issues/snipkode/cloud-storage?style=for-the-badge&logo=github&color=orange)](https://github.com/snipkode/cloud-storage/issues)
[![GitHub license](https://img.shields.io/github/license/snipkode/cloud-storage?style=for-the-badge&logo=github&color=green)](https://github.com/snipkode/cloud-storage/blob/main/LICENSE)

[![GitHub last commit](https://img.shields.io/github/last-commit/snipkode/cloud-storage?style=for-the-badge&logo=github&color=informational)](https://github.com/snipkode/cloud-storage/commits/main)
[![GitHub repo size](https://img.shields.io/github/repo-size/snipkode/cloud-storage?style=for-the-badge&logo=github&color=purple)](https://github.com/snipkode/cloud-storage)

Cloud storage application dengan React, Firebase Authentication, dan Node.js backend dengan dukungan API Key untuk integrasi aplikasi eksternal.

## 🚀 Features

- ✅ **Google Authentication** - Login dengan Firebase Google Auth
- ✅ **Multi-Tenant** - Setiap user punya storage terpisah
- ✅ **API Key System** - Generate API key untuk akses eksternal
- ✅ **Permission Levels** - Read-only, Upload-only, Read-Write, Admin
- ✅ **Folder Support** - Upload file ke folder dengan path fisik
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

## 🔒 Security

### Security Features

- ✅ **Role-Based Access Control** - User, Admin, Super Admin roles
- ✅ **API Key Encryption** - AES-256-CBC encrypted storage with SHA-256 hashing
- ✅ **Rate Limiting** - 1000 req/15min (general), 200 req/15min (auth), 100 req/15min (downloads)
- ✅ **File Type Validation** - MIME type + extension whitelist
- ✅ **Path Traversal Protection** - Filename sanitization
- ✅ **Environment Isolation** - Separate test/live storage
- ✅ **CORS Protection** - Configurable allowed origins
- ✅ **Security Headers** - Helmet.js headers
- ✅ **Secure Logging** - Sensitive data only logged in development

### API Key Security

**Format:** `cs_{env}_{48-hex-chars}`
- `cs_live_...` - Production environment
- `cs_test_...` - Sandbox environment

**Best Practices:**
1. Store API keys in environment variables (never in source code)
2. Use minimum required permissions
3. Rotate keys periodically
4. Revoke immediately if compromised
5. Monitor usage statistics

### Encryption Key Setup

The API key encryption requires a **64-character hexadecimal key**:

```bash
# Generate secure encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to server/.env
API_KEY_ENCRYPTION_KEY=<generated-key>
```

> ⚠️ **Important:** The encryption key must be exactly 64 hexadecimal characters. Non-hex keys are rejected.

### Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| General API | 1000 req | 15 minutes |
| Auth endpoints | 200 req | 15 minutes |
| Download endpoints | 100 req | 15 minutes |

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

> **Note:** Query parameters for API keys are **NOT supported** for security reasons (prevents logging exposure).

---

### 📁 Folder Support

API mendukung upload file ke dalam folder dengan struktur fisik:

**Upload ke folder:**
```bash
# Header X-Folder-Path untuk menentukan folder tujuan
curl -X POST http://localhost:3000/api/upload-multiple \
  -H "Authorization: Bearer cs_live_xxx" \
  -H "X-Folder-Path: /Memories" \
  -F "files=@photo.jpg"
```

**Struktur fisik:**
```
server/uploads/<user-id>/
├── file-root.jpg          (path: "/")
└── Memories/
    └── photo.jpg          (path: "/Memories")
```

**Delete folder:**
- Menghapus folder metadata dari Firestore
- Menghapus semua file di dalam folder (fisik + metadata)
- Menghapus subfolder recursively

---

### 🧪 Environment Toggle (Sandbox & Production)

API mendukung **isolasi penuh** antara environment **Sandbox (Test)** dan **Production (Live)**.

#### Cara Kerja

| API Key | Upload To | View/Delete |
|---------|-----------|-------------|
| `cs_test_...` | Sandbox only | Sandbox only |
| `cs_live_...` | Sandbox atau Production (via toggle) | Sandbox atau Production (via toggle) |

#### Menggunakan Environment Toggle

**Via UI:**
- Toggle button **🧪 Sandbox** / **🚀 Production** di FileBrowser UI

**Via API:**

1. **Upload** - Gunakan header `X-Environment`:
```bash
# Upload ke Sandbox
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer cs_live_xxx" \
  -H "X-Environment: test" \
  -F "file=@document.pdf"

# Upload ke Production
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer cs_live_xxx" \
  -H "X-Environment: live" \
  -F "file=@document.pdf"
```

2. **Download/List/Delete** - Gunakan query parameter `?environment=`:
```bash
# List files di Sandbox
curl http://localhost:3000/api/files?environment=test \
  -H "Authorization: Bearer cs_live_xxx"

# Download dari Sandbox
curl http://localhost:3000/api/download/document.pdf?environment=test \
  -H "Authorization: Bearer cs_live_xxx" \
  -o downloaded.pdf

# Delete di Sandbox
curl -X DELETE http://localhost:3000/api/delete/document.pdf?environment=test \
  -H "Authorization: Bearer cs_live_xxx"
```

> **⚠️ Penting:** 
> - API Key dengan prefix `cs_test_` **hanya bisa** akses Sandbox environment
> - API Key dengan prefix `cs_live_` **bisa switch** antara Sandbox dan Production
> - File fisik disimpan di folder terpisah:
>   - Sandbox: `server/test-uploads/{userId}/`
>   - Production: `server/uploads/{userId}/`

---

### Storage Endpoints

#### 📤 Upload File

**POST** `/api/upload`

Upload single file (max 50MB).

**Headers:**
```
Authorization: Bearer <api_key_or_firebase_token>
Content-Type: multipart/form-data
X-Environment: test|live  # Optional, default: sesuai API key environment
X-Folder-Path: /Memories   # Optional, folder path untuk menyimpan file
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
    "createdAt": "2026-03-28T10:30:00.000Z",
    "environment": "test",  # Environment tempat file disimpan
    "folderPath": "/Memories"  # Folder path tempat file disimpan
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
X-Environment: test|live     # Optional, default: sesuai API key environment
X-Folder-Path: /Memories      # Optional, folder path untuk menyimpan file
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
      "createdAt": "2026-03-28T10:30:00.000Z",
      "environment": "test",
      "folderPath": "/Memories"
    },
    {
      "filename": "1234567891-doc2.xlsx",
      "originalname": "doc2.xlsx",
      "size": 2048901,
      "mimetype": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "createdAt": "2026-03-28T10:30:01.000Z",
      "environment": "test",
      "folderPath": "/Memories"
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

**Query Parameters:**
```
?environment=test|live  # Optional, default: sesuai API key environment
```

**Response (200):**
```json
{
  "files": [
    {
      "filename": "1234567890-document.pdf",
      "originalname": "document.pdf",
      "size": 1024567,
      "mimetype": "application/pdf",
      "createdAt": "2026-03-28T10:30:00.000Z",
      "updatedAt": "2026-03-28T10:30:00.000Z",
      "downloadCount": 0,
      "path": "/Memories"  # Folder path tempat file disimpan
    }
  ],
  "total": 1,
  "stats": {
    "totalFiles": 1,
    "totalSize": 1024567,
    "environment": "test"  # Environment yang sedang dilihat
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

**Query Parameters:**
```
?environment=test|live  # Optional, default: sesuai API key environment
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

> **💡 Tip:** Jika file tidak ditemukan di environment yang diminta, backend akan mencoba mencari di environment lain (fallback). Ini berguna untuk file yang ter-upload dengan metadata salah.

---

#### 📄 Get File Info

**GET** `/api/file/:filename`

Get metadata/information about a file.

**Headers:**
```
Authorization: Bearer <api_key_or_firebase_token>
```

**Query Parameters:**
```
?environment=test|live  # Optional, default: sesuai API key environment
```

**Response (200):**
```json
{
  "file": {
    "filename": "1234567890-document.pdf",
    "originalname": "document.pdf",
    "size": 1024567,
    "createdAt": "2026-03-28T10:30:00.000Z",
    "modifiedAt": "2026-03-28T10:30:00.000Z",
    "environment": "test"
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

**Query Parameters:**
```
?environment=test|live  # Optional, default: sesuai API key environment
```

**Response (200):**
```json
{
  "message": "File deleted successfully"
}
```

**Required Permission:** `delete`

---

#### 📁 Create Folder

**POST** `/api/folders`

Create a new folder.

**Headers:**
```
Authorization: Bearer <api_key_or_firebase_token>
Content-Type: application/json
X-Environment: test|live  # Optional
```

**Body:**
```json
{
  "name": "Memories",
  "parentId": null  // Optional, parent folder ID for nested folders
}
```

**Response (201):**
```json
{
  "message": "Folder created successfully",
  "folder": {
    "id": "folder_1234567890abcdef",
    "name": "Memories",
    "path": "/Memories",
    "parentId": null,
    "createdAt": "2026-03-28T10:30:00.000Z",
    "environment": "live"
  }
}
```

**Required Permission:** `upload`

---

#### 📋 List Folders

**GET** `/api/folders`

List all folders for current user.

**Headers:**
```
Authorization: Bearer <api_key_or_firebase_token>
```

**Query Parameters:**
```
?environment=test|live  # Optional, default: sesuai API key environment
```

**Response (200):**
```json
{
  "folders": [
    {
      "id": "folder_1234567890abcdef",
      "name": "Memories",
      "path": "/Memories",
      "parentId": null,
      "createdAt": "2026-03-28T10:30:00.000Z",
      "updatedAt": "2026-03-28T10:30:00.000Z"
    }
  ],
  "total": 1,
  "environment": "live"
}
```

**Required Permission:** `read`

---

#### 🗑️ Delete Folder

**DELETE** `/api/folders/:folderId`

Delete a folder and all its contents (files and subfolders).

**Headers:**
```
Authorization: Bearer <api_key_or_firebase_token>
```

**Query Parameters:**
```
?environment=test|live  # Optional, default: sesuai API key environment
```

**Response (200):**
```json
{
  "message": "Folder and all contents deleted successfully",
  "deletedFilesCount": 5
}
```

> **⚠️ Important:** Delete folder akan menghapus:
> - Semua file di folder tersebut (fisik + metadata)
> - Semua subfolder recursively
> - Folder metadata itu sendiri

**Required Permission:** `delete`

---

#### 📊 Storage Stats

**GET** `/api/storage-stats`

Get storage usage statistics for current user.

**Headers:**
```
Authorization: Bearer <api_key_or_firebase_token>
```

**Query Parameters:**
```
?environment=test|live  # Optional, default: sesuai API key environment
```

**Response (200):**
```json
{
  "totalFiles": 5,
  "totalSize": 10485760,
  "quota": 5368709120,
  "usagePercent": "0.20",
  "environment": "test"  # Environment yang sedang dilihat
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
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "environment": "live"  # "test" untuk Sandbox, "live" untuk Production
}
```

**Fields:**
- `name` (required): Human-readable name for the API key
- `permissions` (optional): Array of permissions (`read`, `upload`, `delete`, `admin`)
- `expiresAt` (optional): Expiration date in ISO 8601 format
- `environment` (optional): Environment untuk API key ini
  - `"test"` - API key untuk Sandbox (hanya bisa akses test-uploads)
  - `"live"` - API key untuk Production (bisa akses uploads dan test-uploads via toggle)
  - Default: `"live"`

**Response (201):**
```json
{
  "message": "API key created successfully",
  "apiKey": {
    "id": "ak_1234567890abcdef",
    "key": "cs_live_a1b2c3d4e5f6...",  # Prefix cs_test_ untuk Sandbox, cs_live_ untuk Production
    "maskedKey": "cs_live_a1b2...****",
    "name": "Production App",
    "permissions": ["read", "upload", "delete"],
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "environment": "live",
    "createdAt": "2026-03-28T10:30:00.000Z",
    "warning": "Store this API key securely. It will not be shown again!"
  }
}
```

> ⚠️ **Important:** 
> - The full API key is shown only once at creation time. Store it securely!
> - API key dengan prefix `cs_test_` **hanya bisa** akses Sandbox environment
> - API key dengan prefix `cs_live_` **bisa switch** antara Sandbox dan Production via UI toggle atau API headers

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
│   │       └── Memories/   # Physical folder structure
│   └── server.js
├── tests/                  # Test scripts
│   ├── test-memories-upload.js
│   ├── test-browser-upload.js
│   ├── test-upload-browser.js
│   └── test-multiple-upload.sh
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
- Folder fisik dibuat otomatis saat upload dengan `X-Folder-Path` header

## 🧪 Testing

Test scripts tersedia di folder `tests/`:

```bash
# Upload ke folder /Memories
export CLOUD_STORAGE_API_KEY="cs_live_xxx"
node tests/test-memories-upload.js

# Upload multiple files dengan curl
bash tests/test-multiple-upload.sh

# Test browser upload format
node tests/test-browser-upload.js
```

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
