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
  
  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║             ☁️  Cloud Storage Server                      ║
╠═══════════════════════════════════════════════════════════╣
║  🚀 Server:  http://localhost:${PORT}                      ║
║  📁 Uploads: ${path.join(__dirname, 'uploads')}           ║
║                                                           ║
║  📡 API Endpoints:                                        ║
║  ─────────────────────────────────────────────────────    ║
║  🔐 API Keys:                                             ║
║  POST   /api/api-keys          - Generate API key         ║
║  GET    /api/api-keys          - List API keys            ║
║  GET    /api/api-keys/:id      - Get API key info         ║
║  POST   /api/api-keys/:id/revoke - Revoke API key         ║
║  DELETE /api/api-keys/:id      - Delete API key           ║
║  GET    /api/api-keys/permissions - Get permission levels ║
║  ─────────────────────────────────────────────────────    ║
║  📦 Storage:                                              ║
║  POST   /api/upload          - Upload single file         ║
║  POST   /api/upload-multiple - Upload multiple files      ║
║  GET    /api/files           - List files (tenant-scoped) ║
║  GET    /api/download/:name  - Download file              ║
║  GET    /api/file/:name      - Get file info              ║
║  DELETE /api/delete/:name    - Delete file                ║
║  GET    /api/storage-stats   - Storage usage              ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
