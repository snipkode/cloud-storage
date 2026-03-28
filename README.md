# ☁️ Cloud Storage - Multi Tenant

Cloud storage application dengan React, Firebase Authentication, dan Node.js backend.

## 🚀 Features

- ✅ **Google Authentication** - Login dengan Firebase Google Auth
- ✅ **Multi-Tenant** - Setiap user punya storage terpisah
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

Semua endpoint (kecuali health check) memerlukan Firebase JWT token di header:
```
Authorization: Bearer <firebase_id_token>
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/upload` | Upload 1 file |
| POST | `/api/upload-multiple` | Upload multiple files (max 10) |
| GET | `/api/files` | List semua files (user-scoped) |
| GET | `/api/download/:filename` | Download file |
| GET | `/api/file/:filename` | Get file info |
| DELETE | `/api/delete/:filename` | Delete file |
| GET | `/api/storage-stats` | Storage usage stats |

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
