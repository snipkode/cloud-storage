// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Environment'],
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
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests', message: 'Please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api', limiter);

// Stricter rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: { error: 'Too many requests', message: 'Please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/api-keys', authLimiter);

// Middleware
app.use(express.json({ limit: '1mb' })); // Limit request size

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
  console.log(`
Cloud Storage Server
========================================
Server:    http://localhost:${PORT}
Uploads:   ${uploadPath}

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
