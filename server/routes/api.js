const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');
const { apiKeyMiddleware, requirePermission } = require('../middleware/api-key-auth');

const router = express.Router();

// Base uploads directory
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Get user's tenant directory
const getUserDir = (uid) => {
  const userDir = path.join(UPLOADS_DIR, uid);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
};

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = getUserDir(req.user.uid);
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
router.post('/upload', 
  authMiddleware, 
  requirePermission('upload'), 
  upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      createdAt: new Date().toISOString()
    };

    res.status(201).json({
      message: 'File uploaded successfully',
      file: fileInfo
    });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// Upload multiple files
router.post('/upload-multiple', 
  authMiddleware, 
  requirePermission('upload'), 
  upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const files = req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      createdAt: new Date().toISOString()
    }));

    res.status(201).json({
      message: `${files.length} file(s) uploaded successfully`,
      files: files
    });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// List all files (tenant-scoped)
router.get('/files', 
  authMiddleware, 
  requirePermission('read'), 
  (req, res) => {
  try {
    const userDir = getUserDir(req.user.uid);
    
    fs.readdir(userDir, (err, files) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to list files' });
      }

      const fileList = files.map(filename => {
        const filePath = path.join(userDir, filename);
        const stats = fs.statSync(filePath);
        
        return {
          filename: filename,
          originalname: filename.split('-').slice(1).join('-') || filename,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString()
        };
      });

      const totalSize = fileList.reduce((sum, f) => sum + f.size, 0);

      res.json({ 
        files: fileList, 
        total: fileList.length,
        stats: {
          totalFiles: fileList.length,
          totalSize: totalSize
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list files', details: error.message });
  }
});

// Download file (tenant-scoped)
router.get('/download/:filename', 
  authMiddleware, 
  requirePermission('read'), 
  (req, res) => {
  try {
    const filename = req.params.filename;
    const userDir = getUserDir(req.user.uid);
    const filePath = path.join(userDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath);
  } catch (error) {
    res.status(500).json({ error: 'Download failed', details: error.message });
  }
});

// Delete file (tenant-scoped)
router.delete('/delete/:filename', 
  authMiddleware, 
  requirePermission('delete'), 
  (req, res) => {
  try {
    const filename = req.params.filename;
    const userDir = getUserDir(req.user.uid);
    const filePath = path.join(userDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed', details: error.message });
  }
});

// Get file info (tenant-scoped)
router.get('/file/:filename', 
  authMiddleware, 
  requirePermission('read'), 
  (req, res) => {
  try {
    const filename = req.params.filename;
    const userDir = getUserDir(req.user.uid);
    const filePath = path.join(userDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stats = fs.statSync(filePath);
    const fileInfo = {
      filename: filename,
      originalname: filename.split('-').slice(1).join('-') || filename,
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString()
    };

    res.json({ file: fileInfo });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get file info', details: error.message });
  }
});

// Storage stats
router.get('/storage-stats', 
  authMiddleware, 
  requirePermission('read'), 
  (req, res) => {
  try {
    const userDir = getUserDir(req.user.uid);
    
    fs.readdir(userDir, (err, files) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to get stats' });
      }

      let totalSize = 0;
      files.forEach(filename => {
        const filePath = path.join(userDir, filename);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      });

      res.json({
        totalFiles: files.length,
        totalSize: totalSize,
        quota: 5 * 1024 * 1024 * 1024, // 5GB quota
        usagePercent: ((totalSize / (5 * 1024 * 1024 * 1024)) * 100).toFixed(2)
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats', details: error.message });
  }
});

module.exports = router;
