const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('@middleware/auth');
const { apiKeyMiddleware, requirePermission } = require('@middleware/api-key-auth');
const fileMetadataStore = require('@lib/file-metadata-store');

// Allowed file types for upload
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
  // Documents
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv', 'text/markdown',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4',
  // Video
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
  // Archives
  'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/gzip', 'application/x-tar'
];

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.txt', '.csv', '.md',
  '.mp3', '.wav', '.ogg', '.m4a',
  '.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv',
  '.zip', '.rar', '.gz', '.tar'
];

/**
 * Sanitize filename to prevent path traversal attacks
 */
const sanitizeFilename = (filename) => {
  if (!filename) return '';
  // Extract only the base filename, removing any path components
  return path.basename(filename);
};

/**
 * Validate file type based on MIME type and extension
 */
const isValidFileType = (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype?.toLowerCase();

  const validMime = ALLOWED_MIME_TYPES.includes(mimetype);
  const validExt = ALLOWED_EXTENSIONS.includes(ext);

  // Both MIME type and extension must be valid
  return validMime && validExt;
};

// Combined auth middleware - supports both Firebase JWT and API Key
const combinedAuth = (req, res, next) => {
  // Try API Key auth first
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'];

  if (apiKeyHeader || (authHeader && authHeader.includes('cs_'))) {
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

// Get physical folder path for file storage
const getPhysicalFolderPath = (uid, environment = 'live', folderPath = '/') => {
  const userDir = getUserDir(uid, environment);
  
  // If folderPath is root or empty, return user directory
  if (!folderPath || folderPath === '/' || folderPath === '.') {
    return userDir;
  }
  
  // Create physical subfolder based on folderPath
  // e.g., "/Memories" -> <userDir>/Memories
  // e.g., "/Projects/Work" -> <userDir>/Projects/Work
  const safeFolderName = folderPath.split('/').filter(s => s).join('/');
  const physicalPath = path.join(userDir, safeFolderName);
  
  // Create the physical directory if it doesn't exist
  if (!fs.existsSync(physicalPath)) {
    fs.mkdirSync(physicalPath, { recursive: true });
  }
  
  return physicalPath;
};

/**
 * Find physical file path by checking multiple locations
 * Returns the path if file exists, null otherwise
 */
const findFilePath = (uid, environment, fileMeta) => {
  if (!fileMeta || !fileMeta.filename) return null;
  
  const filename = fileMeta.filename;
  const possiblePaths = [];
  
  // 1. Try folder path from metadata first
  if (fileMeta.path) {
    const physicalFolderPath = getPhysicalFolderPath(uid, environment, fileMeta.path);
    possiblePaths.push(path.join(physicalFolderPath, filename));
  }
  
  // 2. Try flat user directory
  const userDir = getUserDir(uid, environment);
  possiblePaths.push(path.join(userDir, filename));
  
  // 3. Try nested subfolders
  try {
    if (fs.existsSync(userDir)) {
      const subdirs = fs.readdirSync(userDir).filter(f => {
        const fullPath = path.join(userDir, f);
        return fs.statSync(fullPath).isDirectory();
      });
      for (const subdir of subdirs) {
        possiblePaths.push(path.join(userDir, subdir, filename));
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  // Find the file
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
};

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Check for environment override header (for UI toggle)
    const headerEnv = req.headers['x-environment'];
    const baseEnv = req.user?.environment || 'live';
    
    // Get folderPath from header or body
    const folderPath = req.headers['x-folder-path'] || req.body.folderPath || '/';

    // If user has API key with test env, they can only upload to test
    // If user has API key with live env, they can upload to either via header
    const env = (baseEnv === 'test')
      ? 'test'  // Test key users are locked to test environment
      : (headerEnv === 'test' || headerEnv === 'live' ? headerEnv : baseEnv);

    // Get physical folder path based on folderPath
    const destPath = getPhysicalFolderPath(req.user.uid, env, folderPath);
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Sanitize original filename before saving
    const safeOriginalname = sanitizeFilename(file.originalname);
    cb(null, uniqueSuffix + '-' + safeOriginalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (isValidFileType(file)) {
      cb(null, true);
    } else {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
  }
});

// Upload single file
// Header X-Environment: test|live to override API key environment (live keys only)
// Body: folderPath (optional) - path to folder where file should be uploaded
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
    const folderPath = req.body.folderPath; // Optional folder path

    console.log(`[Upload] ========= `);
    console.log(`[Upload] User: ${req.user.uid}`);
    console.log(`[Upload] API Key Env: ${baseEnv}`);
    console.log(`[Upload] Header Env: ${headerEnv || 'none'}`);
    console.log(`[Upload] Request body folderPath: ${folderPath}`);
    console.log(`[Upload] Request body:`, req.body);

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

    // Use folderPath from request, default to '/'
    const savePath = folderPath || '/';
    console.log(`[Upload] Using environment: ${env}`);
    console.log(`[Upload] Saving file with path: ${savePath}`);
    console.log(`[Upload] Physical file path: ${req.file.path}`);

    // Auto-create folder if path is not root and folder doesn't exist
    if (savePath && savePath !== '/' && savePath !== '.') {
      try {
        const existingFolder = await fileMetadataStore.getFolderByPath(savePath, req.user.uid, env);
        if (!existingFolder) {
          // Extract folder name from path (e.g., "/Memories" -> "Memories")
          const folderName = savePath.split('/').filter(s => s).pop() || 'Untitled';
          // Get parent folder ID if nested
          const parentPath = savePath.substring(0, savePath.lastIndexOf('/'));
          const parentFolder = parentPath ? await fileMetadataStore.getFolderByPath(parentPath, req.user.uid, env) : null;
          
          await fileMetadataStore.createFolder({
            name: folderName,
            path: savePath,
            parentId: parentFolder?.id || null,
            userId: req.user.uid,
            environment: env
          });
          console.log(`[Upload] Auto-created folder: ${folderName} at ${savePath}`);
        }
      } catch (folderError) {
        console.error(`[Upload] Failed to auto-create folder:`, folderError.message);
        // Continue with upload even if folder creation fails
      }
    }

    // Save metadata to Firestore with folder path
    const fileMetadata = await fileMetadataStore.createFile({
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      userId: req.user.uid,
      path: savePath,  // Use folder path if provided
      environment: env
    });

    console.log(`[Upload] Saved metadata:`, { path: fileMetadata.path, filename: fileMetadata.filename });
    console.log(`[Upload] ========= `);

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: fileMetadata.id,
        filename: fileMetadata.filename,
        originalname: fileMetadata.originalname,
        size: fileMetadata.size,
        mimetype: fileMetadata.mimetype,
        createdAt: fileMetadata.createdAt,
        environment: env,
        folderPath: savePath
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Upload multiple files
// Header X-Environment: test|live to override API key environment (live keys only)
// Header X-Folder-Path: (optional) - path to folder where files should be uploaded
router.post('/upload-multiple',
  combinedAuth,
  requirePermission('upload'),
  upload.array('files', 10), async (req, res) => {
  try {
    console.log(`[Upload Multiple] >>> REQUEST RECEIVED <<<`);
    console.log(`[Upload Multiple] Headers:`, req.headers);
    console.log(`[Upload Multiple] Body:`, req.body);
    console.log(`[Upload Multiple] Files:`, req.files);

    if (!req.files || req.files.length === 0) {
      console.log(`[Upload Multiple] No files in request`);
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Check for environment override header (for UI toggle)
    const headerEnv = req.headers['x-environment'];
    const baseEnv = req.user?.environment || 'live';
    // Get folderPath from header only (simpler than query param)
    const folderPath = req.headers['x-folder-path'];

    console.log(`[Upload Multiple] ========= `);
    console.log(`[Upload Multiple] User: ${req.user?.uid || 'UNKNOWN'}`);
    console.log(`[Upload Multiple] API Key Env: ${baseEnv}, Header Env: ${headerEnv || 'none'}`);
    console.log(`[Upload Multiple] Header X-Folder-Path: ${folderPath || 'none'}`);

    // If user has API key with test env, they can only upload to test
    // If user has API key with live env, they can upload to either via header
    let env;
    if (baseEnv === 'test') {
      env = 'test';
    } else if (headerEnv === 'test' || headerEnv === 'live') {
      env = headerEnv;
    } else {
      env = baseEnv;
    }

    // Use folderPath from header, default to '/'
    const savePath = folderPath || '/';
    console.log(`[Upload Multiple] Using environment: ${env}`);
    console.log(`[Upload Multiple] Saving files with path: ${savePath}`);

    // Auto-create folder if path is not root and folder doesn't exist
    if (savePath && savePath !== '/' && savePath !== '.') {
      try {
        const existingFolder = await fileMetadataStore.getFolderByPath(savePath, req.user.uid, env);
        if (!existingFolder) {
          // Extract folder name from path (e.g., "/Memories" -> "Memories")
          const folderName = savePath.split('/').filter(s => s).pop() || 'Untitled';
          // Get parent folder ID if nested
          const parentPath = savePath.substring(0, savePath.lastIndexOf('/'));
          const parentFolder = parentPath ? await fileMetadataStore.getFolderByPath(parentPath, req.user.uid, env) : null;
          
          await fileMetadataStore.createFolder({
            name: folderName,
            path: savePath,
            parentId: parentFolder?.id || null,
            userId: req.user.uid,
            environment: env
          });
          console.log(`[Upload Multiple] Auto-created folder: ${folderName} at ${savePath}`);
        }
      } catch (folderError) {
        console.error(`[Upload Multiple] Failed to auto-create folder:`, folderError.message);
        // Continue with upload even if folder creation fails
      }
    }

    // Save all metadata to Firestore with folder path
    const uploadedFiles = [];
    for (const file of req.files) {
      console.log(`[Upload Multiple] Processing file: ${file.filename}`);
      const fileMetadata = await fileMetadataStore.createFile({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        userId: req.user.uid,
        path: savePath,
        environment: env
      });
      console.log(`[Upload Multiple] Saved metadata for: ${file.filename}`);
      uploadedFiles.push({
        id: fileMetadata.id,
        filename: fileMetadata.filename,
        originalname: fileMetadata.originalname,
        size: fileMetadata.size,
        mimetype: fileMetadata.mimetype,
        createdAt: fileMetadata.createdAt,
        environment: env,
        folderPath: savePath
      });
    }

    console.log(`[Upload Multiple] Uploaded ${uploadedFiles.length} files to ${savePath}`);
    console.log(`[Upload Multiple] ========= `);

    res.status(201).json({
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('[Upload Multiple] ERROR:', error);
    console.error('[Upload Multiple] Stack:', error.stack);
    res.status(500).json({ 
      error: 'Upload failed',
      details: error.message,
      stack: error.stack
    });
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

    // Auto-cleanup: Remove metadata for files that don't exist physically
    const validFiles = [];
    const deletedCount = { count: 0 };
    
    for (const file of files) {
      // Find physical file
      const physicalPath = findFilePath(req.user.uid, env, file);
      
      if (physicalPath) {
        validFiles.push(file);
      } else {
        // File doesn't exist, delete metadata
        await fileMetadataStore.deleteFile(file.filename, req.user.uid, env);
        deletedCount.count++;
        console.log(`[List Files] Auto-deleted metadata for missing file: ${file.filename}`);
      }
    }
    
    if (deletedCount.count > 0) {
      console.log(`[List Files] Cleaned up ${deletedCount.count} missing file(s)`);
    }

    const totalSize = validFiles.reduce((sum, f) => sum + (f.size || 0), 0);

    res.json({
      files: validFiles.map(f => ({
        id: f.id,
        filename: f.filename,
        originalname: f.originalname,
        size: f.size,
        mimetype: f.mimetype,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        downloadCount: f.downloadCount || 0,
        path: f.path || '/'  // Add folder path for frontend filtering
      })),
      total: validFiles.length,
      stats: {
        totalFiles: validFiles.length,
        totalSize,
        environment: env
      },
      cleanup: deletedCount.count > 0 ? { deleted: deletedCount.count } : undefined
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Failed to list files' });
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

    // Sanitize filename to prevent path traversal attacks
    const filename = sanitizeFilename(req.params.filename);

    // Get file metadata from Firestore
    const fileMetadata = await fileMetadataStore.getFileByFilename(filename, req.user.uid, env);

    // Find file in current environment using global helper
    let filePath = findFilePath(req.user.uid, env, fileMetadata);

    // If not found, try other environment
    if (!filePath) {
      const otherEnv = env === 'test' ? 'live' : 'test';
      const otherFileMetadata = await fileMetadataStore.getFileByFilename(filename, req.user.uid, otherEnv);
      const otherFilePath = findFilePath(req.user.uid, otherEnv, otherFileMetadata);

      console.log(`[Download] File not found in ${env}, trying ${otherEnv}`);

      if (otherFilePath) {
        console.log(`[Download] Found file in ${otherEnv}`);
        env = otherEnv;
        filePath = otherFilePath;
      } else {
        console.error(`[Download] File not found in either environment`);
        return res.status(404).json({
          error: 'File not found',
          details: `File ${filename} not found in ${env} or ${otherEnv}`
        });
      }
    }

    console.log(`[Download] File path: ${filePath}`);

    // Update download count in Firestore
    await fileMetadataStore.incrementDownloadCount(filename, req.user.uid, env);

    // Set explicit headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(path.basename(filename))}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    console.log(`[Download] Sending file: ${filename} from ${env}`);
    res.download(filePath);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
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

    // Sanitize filename to prevent path traversal attacks
    const filename = sanitizeFilename(req.params.filename);

    // Get file metadata from Firestore
    const fileMetadata = await fileMetadataStore.getFileByFilename(filename, req.user.uid, env);

    // Find file using global helper
    const filePath = findFilePath(req.user.uid, env, fileMetadata);

    if (!filePath) {
      console.error(`[Delete] File not found in any location`);
      return res.status(404).json({
        error: 'File not found',
        details: `File ${filename} not found in user directory or subfolders`
      });
    }

    console.log(`[Delete] Found file at: ${filePath}`);

    // Delete physical file
    fs.unlinkSync(filePath);

    // Delete metadata from Firestore
    await fileMetadataStore.deleteFile(filename, req.user.uid, env);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
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

    // Find physical file using global helper
    const filePath = findFilePath(req.user.uid, env, fileMetadata);

    if (!filePath) {
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
        environment: env,
        folderPath: fileMetadata.path || '/'
      }
    });
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({ error: 'Failed to get file info' });
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
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Create folder
router.post('/folders',
  combinedAuth,
  requirePermission('upload'),
  async (req, res) => {
  try {
    const { name, parentId } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    // Check for environment override header
    const headerEnv = req.headers['x-environment'];
    const baseEnv = req.user.environment || 'live';
    let env;
    if (baseEnv === 'test') {
      env = 'test';
    } else if (headerEnv === 'test' || headerEnv === 'live') {
      env = headerEnv;
    } else {
      env = baseEnv;
    }

    // Sanitize folder name
    const sanitizedName = name.trim().replace(/[<>:"/\\|?*]/g, '');
    
    // Build folder path
    let folderPath = '/';
    let resolvedParentId = null;
    
    if (parentId) {
      // Find parent folder to get its path
      const parentFolder = await fileMetadataStore.getFolderById(parentId, env);
      if (!parentFolder || parentFolder.userId !== req.user.uid) {
        return res.status(404).json({ error: 'Parent folder not found' });
      }
      folderPath = parentFolder.path.endsWith('/') 
        ? `${parentFolder.path}${sanitizedName}` 
        : `${parentFolder.path}/${sanitizedName}`;
      resolvedParentId = parentId;
    } else {
      folderPath = `/${sanitizedName}`;
    }

    // Check if folder with same path already exists
    const existingFolder = await fileMetadataStore.getFolderByPath(folderPath, req.user.uid, env);
    if (existingFolder) {
      return res.status(409).json({ error: 'Folder with this name already exists in this location' });
    }

    // Create folder in Firestore
    const folder = await fileMetadataStore.createFolder({
      name: sanitizedName,
      path: folderPath,
      parentId: resolvedParentId,
      userId: req.user.uid,
      environment: env
    });

    console.log(`[Create Folder] User: ${req.user.uid}, Folder: ${folder.name}, Path: ${folder.path}, Env: ${env}`);

    res.status(201).json({
      message: 'Folder created successfully',
      folder: {
        id: folder.id,
        name: folder.name,
        path: folder.path,
        parentId: folder.parentId,
        createdAt: folder.createdAt,
        environment: env
      }
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Get all folders for user
router.get('/folders',
  combinedAuth,
  requirePermission('read'),
  async (req, res) => {
  try {
    const queryEnv = req.query.environment;
    const baseEnv = req.user.environment || 'live';

    let env;
    if (baseEnv === 'test') {
      env = 'test';
    } else if (queryEnv === 'test' || queryEnv === 'live') {
      env = queryEnv;
    } else {
      env = baseEnv;
    }

    const folders = await fileMetadataStore.getUserFolders(req.user.uid, env);

    res.json({
      folders: folders.map(f => ({
        id: f.id,
        name: f.name,
        path: f.path,
        parentId: f.parentId,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt
      })),
      total: folders.length,
      environment: env
    });
  } catch (error) {
    console.error('List folders error:', error);
    res.status(500).json({ error: 'Failed to list folders' });
  }
});

// Delete folder
router.delete('/folders/:folderId',
  combinedAuth,
  requirePermission('delete'),
  async (req, res) => {
  try {
    const { folderId } = req.params;
    const queryEnv = req.query.environment;
    const baseEnv = req.user.environment || 'live';

    console.log(`[Delete Folder] Request: folderId=${folderId}, queryEnv=${queryEnv}, baseEnv=${baseEnv}`);

    let env;
    if (baseEnv === 'test') {
      env = 'test';
    } else if (queryEnv === 'test' || queryEnv === 'live') {
      env = queryEnv;
    } else {
      env = baseEnv;
    }

    // Get folder to verify ownership
    const folder = await fileMetadataStore.getFolderById(folderId, env);
    console.log(`[Delete Folder] Found folder:`, folder);

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    if (folder.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized to delete this folder' });
    }

    // Get all files in this folder and subfolders
    const allFiles = await fileMetadataStore.getUserFiles(req.user.uid, env);
    
    // Match files that are:
    // 1. Directly in this folder (path === folder.path)
    // 2. In subfolders (path starts with folder.path + '/')
    const filesInFolder = allFiles.filter(f => {
      if (!f.path) return false;
      return f.path === folder.path || f.path.startsWith(folder.path + '/');
    });
    
    console.log(`[Delete Folder] Found ${filesInFolder.length} files to delete`);

    // Delete all files in the folder (physical + metadata)
    for (const file of filesInFolder) {
      try {
        // Find physical file path
        const physicalFolderPath = getPhysicalFolderPath(req.user.uid, env, file.path);
        const filePath = path.join(physicalFolderPath, file.filename);
        
        // Delete physical file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[Delete Folder] Deleted physical file: ${filePath}`);
        }
        
        // Delete metadata
        await fileMetadataStore.deleteFile(file.filename, req.user.uid, env);
        console.log(`[Delete Folder] Deleted file metadata: ${file.filename}`);
      } catch (error) {
        console.error(`[Delete Folder] Error deleting file ${file.filename}:`, error.message);
      }
    }

    // Delete all subfolders recursively
    if (folder.path) {
      await fileMetadataStore.deleteSubfolders(folder.path, req.user.uid, env);
    }

    // Delete the folder itself
    await fileMetadataStore.deleteFolder(folderId, req.user.uid, env);

    console.log(`[Delete Folder] Success: User: ${req.user.uid}, Folder: ${folder.name}, Env: ${env}`);
    console.log(`[Delete Folder] Deleted ${filesInFolder.length} files and ${folder.path ? 'subfolders' : 'no subfolders'}`);

    res.json({ 
      message: 'Folder and all contents deleted successfully',
      deletedFilesCount: filesInFolder.length
    });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ error: 'Failed to delete folder', details: error.message });
  }
});

module.exports = router;
