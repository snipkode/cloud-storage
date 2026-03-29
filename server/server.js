const express = require('express');
const cors = require('cors');
const path = require('path');
const moduleAlias = require('module-alias');

// Register absolute imports
moduleAlias.addAliases({
  '@routes': path.join(__dirname, 'routes'),
  '@middleware': path.join(__dirname, 'middleware'),
  '@lib': path.join(__dirname, 'lib'),
  '@config': path.join(__dirname, 'config')
});

const apiRoutes = require('./routes/api');
const apiKeyRoutes = require('./routes/api-keys');
const { initialized: firestoreInitialized } = require('./lib/firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);
app.use('/api/api-keys', apiKeyRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files (for production)
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));

  // SPA fallback - use regex pattern for wildcard
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  const uploadPath = path.join(__dirname, 'uploads');
  const storageMode = firestoreInitialized ? 'Firestore' : 'Filesystem';
  console.log(`
Cloud Storage Server
========================================
Server:    http://localhost:${PORT}
Uploads:   ${uploadPath}
Storage:   ${storageMode} mode

API Keys:
  POST   /api/api-keys              - Generate
  GET    /api/api-keys              - List
  GET    /api/api-keys/:id          - Get info
  POST   /api/api-keys/:id/revoke   - Revoke
  DELETE /api/api-keys/:id          - Delete
  GET    /api/api-keys/permissions  - Permissions

Storage:
  POST   /api/upload          - Upload single
  POST   /api/upload-multiple - Upload multiple
  GET    /api/files           - List files
  GET    /api/download/:name  - Download
  GET    /api/file/:name      - File info
  DELETE /api/delete/:name    - Delete
  GET    /api/storage-stats   - Usage stats
========================================
  `);
});
