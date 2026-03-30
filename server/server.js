// Load environment variables FIRST
require('dotenv').config();

// Add global error handlers FIRST
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const moduleAlias = require('module-alias');
const { logger } = require('@lib/logger');
const { requestLogger } = require('@middleware/request-logger');

// Register absolute imports
moduleAlias.addAliases({
  '@routes': path.join(__dirname, 'routes'),
  '@middleware': path.join(__dirname, 'middleware'),
  '@lib': path.join(__dirname, 'lib'),
  '@config': path.join(__dirname, 'config')
});

const apiRoutes = require('./routes/api');
const apiKeyRoutes = require('./routes/api-keys');
const notificationRoutes = require('./routes/notifications');
const sambaRoutes = require('./routes/samba');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Configure CORS with allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'];
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app') || origin.endsWith('.netlify.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Environment', 'X-Folder-Path'],
  exposedHeaders: ['Content-Disposition']
};

app.use(cors(corsOptions));

// Security: Add helmet headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Security: Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: { error: 'Too many requests', message: 'Please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api', limiter);

// Stricter rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs (increased for development)
  message: { error: 'Too many requests', message: 'Please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/api-keys', authLimiter);

// Stricter rate limit for download endpoints (prevent bandwidth abuse)
const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 downloads per 15 minutes
  message: { error: 'Too many requests', message: 'Download limit exceeded. Please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/download', downloadLimiter);

// Middleware
app.use(express.json({ limit: '1mb' })); // Limit request size

// Request logging (after rate limiting, before routes)
app.use(requestLogger);

// API Routes
app.use('/api', apiRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/samba', sambaRoutes);
app.use('/api/admin', adminRoutes);

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
  const logsPath = path.join(__dirname, 'logs');
  
  logger.info('Cloud Storage Server started', {
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    uploadsPath: uploadPath,
    logsPath: logsPath
  });
  
  logger.info(`
========================================
Cloud Storage Server
========================================
Server:    http://localhost:${PORT}
Uploads:   ${uploadPath}
Logs:      ${logsPath}

API Keys:
  POST   /api/api-keys              - Generate
  GET    /api/api-keys              - List
  GET    /api/api-keys/:id          - Get info
  POST   /api/api-keys/:id/revoke   - Revoke
  DELETE /api/api-keys/:id          - Delete
  GET    /api/api-keys/permissions  - Permissions

Notifications:
  GET    /api/notifications              - Get user notifications
  GET    /api/notifications/unread-count - Get unread count
  POST   /api/notifications/:id/read     - Mark as read
  POST   /api/notifications/read-all     - Mark all as read
  DELETE /api/notifications/:id          - Delete notification
  POST   /api/notifications/broadcast    - Broadcast to all users (admin)
  POST   /api/notifications/send         - Send to specific user (admin)
  GET    /api/notifications/admin/all    - Get all notifications (admin)

Storage:
  POST   /api/upload          - Upload single
  POST   /api/upload-multiple - Upload multiple
  GET    /api/files           - List files
  GET    /api/download/:name  - Download
  GET    /api/stream/:name    - Stream video (with transcoding)
  GET    /api/stream/:name/qualities - Get available qualities
  GET    /api/file/:name      - File info
  DELETE /api/delete/:name    - Delete
  GET    /api/storage-stats   - Usage stats
========================================`);
});
