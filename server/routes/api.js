const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('@middleware/auth');
const { apiKeyMiddleware, requirePermission } = require('@middleware/api-key-auth');
const fileMetadataStore = require('@lib/file-metadata-store');

// Combined auth middleware - supports both Firebase JWT and API Key
const combinedAuth = (req, res, next) => {
  // Try API Key auth first
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'];
  const apiKeyQuery = req.query.api_key;

  if (apiKeyHeader || apiKeyQuery || (authHeader && authHeader.includes('cs_'))) {
    return apiKeyMiddleware(req, res, next);
  }

  // Fall back to Firebase auth
  return authMiddleware(req, res, next);
};

const router = express.Router();

// Base uploads directory
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Test uploads directory (isolated from live)
const TEST_UPLOADS_DIR = path.join(__dirname, '..', 'test-uploads');
if (!fs.existsSync(TEST_UPLOADS_DIR)) {
  fs.mkdirSync(TEST_UPLOADS_DIR, { recursive: true });
}

// Get user's directory based on environment
const getUserDir = (uid, environment = 'live') => {
  const baseDir = environment === 'test' ? TEST_UPLOADS_DIR : UPLOADS_DIR;
  const userDir = path.join(baseDir, uid);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
};

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Check for environment override header (for UI toggle)
    const headerEnv = req.headers['x-environment'];
    const baseEnv = req.user?.environment || 'live';
    
    // If user has API key with test env, they can only upload to test
    // If user has API key with live env, they can upload to either via header
    const env = (baseEnv === 'test') 
      ? 'test'  // Test key users are locked to test environment
      : (headerEnv === 'test' || headerEnv === 'live' ? headerEnv : baseEnv);
    
    const userDir = getUserDir(req.user.uid, env);
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

// Upload single file
// Header X-Environment: test|live to override API key environment (live keys only)
router.post('/upload',
  combinedAuth,
  requirePermission('upload'),
  upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check for environment override header (for UI toggle)
    const headerEnv = req.headers['x-environment'];
    const baseEnv = req.user.environment || 'live';
    
    console.log(`[Upload] User: ${req.user.uid}, API Key Env: ${baseEnv}, Header Env: ${headerEnv || 'none'}`);
    
    // If user has API key with test env, they can only upload to test
    // If user has API key with live env, they can upload to either via header
    let env;
    if (baseEnv === 'test') {
      env = 'test';  // Test key users are locked to test environment
    } else if (headerEnv === 'test' || headerEnv === 'live') {
      env = headerEnv;  // Live key users can switch via header
    } else {
      env = baseEnv;  // Default to API key environment
    }
    
    console.log(`[Upload] Using environment: ${env}, File path: ${req.file.path}`);

    // Save metadata to Firestore
    const fileMetadata = await fileMetadataStore.createFile({
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      userId: req.user.uid,
      path: req.file.path,
      environment: env
    });

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: fileMetadata.id,
        filename: fileMetadata.filename,
        originalname: fileMetadata.originalname,
        size: fileMetadata.size,
        mimetype: fileMetadata.mimetype,
        createdAt: fileMetadata.createdAt,
        environment: env
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// Upload multiple files
// Header X-Environment: test|live to override API key environment (live keys only)
router.post('/upload-multiple',
  combinedAuth,
  requirePermission('upload'),
  upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Check for environment override header (for UI toggle)
    const headerEnv = req.headers['x-environment'];
    const baseEnv = req.user.environment || 'live';
    
    console.log(`[Upload Multiple] User: ${req.user.uid}, API Key Env: ${baseEnv}, Header Env: ${headerEnv || 'none'}`);
    
    // If user has API key with test env, they can only upload to test
    // If user has API key with live env, they can upload to either via header
    let env;
    if (baseEnv === 'test') {
      env = 'test';  // Test key users are locked to test environment
    } else if (headerEnv === 'test' || headerEnv === 'live') {
      env = headerEnv;  // Live key users can switch via header
    } else {
      env = baseEnv;  // Default to API key environment
    }
    
    console.log(`[Upload Multiple] Using environment: ${env}`);

    // Save all metadata to Firestore
    const uploadedFiles = [];
    for (const file of req.files) {
      console.log(`[Upload Multiple] File: ${file.filename}, Path: ${file.path}`);
      const fileMetadata = await fileMetadataStore.createFile({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        userId: req.user.uid,
        path: file.path,
        environment: env
      });
      uploadedFiles.push({
        id: fileMetadata.id,
        filename: fileMetadata.filename,
        originalname: fileMetadata.originalname,
        size: fileMetadata.size,
        mimetype: fileMetadata.mimetype,
        createdAt: fileMetadata.createdAt,
        environment: env
      });
    }

    res.status(201).json({
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload multiple error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// List all files (tenant-scoped)
// Optional query param: ?environment=test|live to override API key environment
router.get('/files',
  combinedAuth,
  requirePermission('read'),
  async (req, res) => {
  try {
    const queryEnv = req.query.environment;
    const baseEnv = req.user.environment || 'live';
    
    console.log(`[List Files] User: ${req.user.uid}, API Key Env: ${baseEnv}, Query Env: ${queryEnv || 'none'}`);

    // If user has API key with test env, they can only view test files
    // If user has API key with live env, they can view both via query param
    let env;
    if (baseEnv === 'test') {
      env = 'test';  // Test key users are locked to test environment
    } else if (queryEnv === 'test' || queryEnv === 'live') {
      env = queryEnv;  // Live key users can switch via query param
    } else {
      env = baseEnv;  // Default to API key environment
    }
    
    console.log(`[List Files] Using environment: ${env}`);

    const files = await fileMetadataStore.getUserFiles(req.user.uid, env);

    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

    res.json({
      files: files.map(f => ({
        id: f.id,
        filename: f.filename,
        originalname: f.originalname,
        size: f.size,
        mimetype: f.mimetype,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        downloadCount: f.downloadCount || 0
      })),
      total: files.length,
      stats: {
        totalFiles: files.length,
        totalSize,
        environment: env
      }
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Failed to list files', details: error.message });
  }
});

// Download file (tenant-scoped)
// Optional query param: ?environment=test|live to override API key environment
router.get('/download/:filename',
  combinedAuth,
  requirePermission('read'),
  async (req, res) => {
  try {
    const queryEnv = req.query.environment;
    const baseEnv = req.user.environment || 'live';
    
    console.log(`[Download] User: ${req.user.uid}, API Key Env: ${baseEnv}, Query Env: ${queryEnv}`);

    // If user has API key with test env, they can only download from test
    // If user has API key with live env, they can download from either via query param
    let env;
    if (baseEnv === 'test') {
      env = 'test';  // Test key users are locked to test environment
    } else if (queryEnv === 'test' || queryEnv === 'live') {
      env = queryEnv;  // Live key users can switch via query param
    } else {
      env = baseEnv;  // Default to API key environment
    }
    
    console.log(`[Download] Using environment: ${env}`);

    const userDir = getUserDir(req.user.uid, env);
    const filename = req.params.filename;
    let filePath = path.join(userDir, filename);
    
    console.log(`[Download] File path: ${filePath}`);

    // Check if file exists BEFORE trying to download
    if (!fs.existsSync(filePath)) {
      const otherEnv = env === 'test' ? 'live' : 'test';
      const otherUserDir = getUserDir(req.user.uid, otherEnv);
      const otherFilePath = path.join(otherUserDir, filename);
      
      console.log(`[Download] File not found in ${env}, trying ${otherEnv}: ${otherFilePath}`);
      
      if (fs.existsSync(otherFilePath)) {
        console.log(`[Download] Found file in ${otherEnv}, using that instead`);
        env = otherEnv;
        filePath = otherFilePath;
        // Check if metadata exists in the other environment
        try {
          const file = await fileMetadataStore.getFileByFilename(filename, req.user.uid, otherEnv);
          if (file) {
            console.log(`[Download] File metadata exists in ${otherEnv}, keeping as is`);
          }
        } catch (e) {
          console.error('[Download] Error checking metadata:', e);
        }
      } else {
        console.error(`[Download] File not found in either environment`);
        return res.status(404).json({ 
          error: 'File not found',
          details: `File not found in ${env} or ${otherEnv}`
        });
      }
    }

    // Update download count in Firestore
    await fileMetadataStore.incrementDownloadCount(filename, req.user.uid, env);

    // Set explicit headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(path.basename(filename))}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    
    console.log(`[Download] Sending file: ${filename} from ${env}`);
    res.download(filePath);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed', details: error.message });
  }
});

// Delete file (tenant-scoped)
// Optional query param: ?environment=test|live to override API key environment
router.delete('/delete/:filename',
  combinedAuth,
  requirePermission('delete'),
  async (req, res) => {
  try {
    const queryEnv = req.query.environment;
    const baseEnv = req.user.environment || 'live';

    // If user has API key with test env, they can only delete test files
    // If user has API key with live env, they can delete from both via query param
    let env;
    if (baseEnv === 'test') {
      env = 'test';  // Test key users are locked to test environment
    } else if (queryEnv === 'test' || queryEnv === 'live') {
      env = queryEnv;  // Live key users can switch via query param
    } else {
      env = baseEnv;  // Default to API key environment
    }

    const userDir = getUserDir(req.user.uid, env);
    const filename = req.params.filename;
    const filePath = path.join(userDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete physical file
    fs.unlinkSync(filePath);

    // Delete metadata from Firestore
    await fileMetadataStore.deleteFile(filename, req.user.uid, env);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed', details: error.message });
  }
});

// Get file info (tenant-scoped)
router.get('/file/:filename',
  combinedAuth,
  requirePermission('read'),
  async (req, res) => {
  try {
    const env = req.user.environment || 'live';
    const filename = req.params.filename;

    // Get metadata from Firestore
    const fileMetadata = await fileMetadataStore.getFileByFilename(filename, req.user.uid, env);

    if (!fileMetadata) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Verify physical file exists
    const userDir = getUserDir(req.user.uid, env);
    const filePath = path.join(userDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    const stats = fs.statSync(filePath);

    res.json({
      file: {
        id: fileMetadata.id,
        filename: fileMetadata.filename,
        originalname: fileMetadata.originalname,
        size: stats.size,
        mimetype: fileMetadata.mimetype,
        createdAt: fileMetadata.createdAt,
        updatedAt: fileMetadata.updatedAt,
        downloadCount: fileMetadata.downloadCount || 0,
        environment: env
      }
    });
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({ error: 'Failed to get file info', details: error.message });
  }
});

// Storage stats
router.get('/storage-stats',
  combinedAuth,
  requirePermission('read'),
  async (req, res) => {
  try {
    const env = req.user.environment || 'live';
    const stats = await fileMetadataStore.getStorageStats(req.user.uid, env);
    res.json({ ...stats, environment: env });
  } catch (error) {
    console.error('Storage stats error:', error);
    res.status(500).json({ error: 'Failed to get stats', details: error.message });
  }
});

module.exports = router;
