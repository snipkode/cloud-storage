const { db, initialized: firestoreInitialized, getInitialized } = require('./firebase-admin');
const fs = require('fs');
const path = require('path');

const FILES_COLLECTION = 'files';
const METADATA_DIR = path.join(process.cwd(), 'data', 'metadata');

// Ensure metadata directory exists for filesystem mode
if (!fs.existsSync(METADATA_DIR)) {
  fs.mkdirSync(METADATA_DIR, { recursive: true });
}

/**
 * Check if Firestore is ready (with initialization wait)
 */
const isFirestoreReady = async () => {
  if (firestoreInitialized && db) {
    await getInitialized();
    return firestoreInitialized;
  }
  return false;
};

/**
 * Get metadata file path for a user
 */
const getUserMetadataPath = (userId) => {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(METADATA_DIR, `${safeUserId}.json`);
};

/**
 * Load user's file metadata from filesystem
 */
const loadUserFiles = (userId) => {
  const metadataPath = getUserMetadataPath(userId);
  if (!fs.existsSync(metadataPath)) {
    return [];
  }
  const content = fs.readFileSync(metadataPath, 'utf8');
  return JSON.parse(content);
};

/**
 * Save user's file metadata to filesystem
 */
const saveUserFiles = (userId, files) => {
  const metadataPath = getUserMetadataPath(userId);
  fs.writeFileSync(metadataPath, JSON.stringify(files, null, 2));
};

/**
 * Create file metadata
 */
const createFile = async (fileData) => {
  const newFile = {
    id: fileData.id || `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    filename: fileData.filename,
    originalname: fileData.originalname,
    mimetype: fileData.mimetype,
    size: fileData.size,
    userId: fileData.userId,
    path: fileData.path,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    downloadCount: 0
  };

  if (await isFirestoreReady()) {
    await db.collection(FILES_COLLECTION).doc(newFile.id).set(newFile);
  } else {
    const files = loadUserFiles(fileData.userId);
    files.push(newFile);
    saveUserFiles(fileData.userId, files);
  }

  return newFile;
};

/**
 * Get file metadata by filename and userId
 */
const getFileByFilename = async (filename, userId) => {
  if (await isFirestoreReady()) {
    const snapshot = await db.collection(FILES_COLLECTION)
      .where('filename', '==', filename)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } else {
    const files = loadUserFiles(userId);
    return files.find(f => f.filename === filename) || null;
  }
};

/**
 * Get file metadata by ID
 */
const getFileById = async (id) => {
  if (await isFirestoreReady()) {
    const doc = await db.collection(FILES_COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } else {
    // For filesystem mode, search through all user files
    const files = loadUserFiles(id);
    return files.find(f => f.id === id) || null;
  }
};

/**
 * Get all files for a user
 */
const getUserFiles = async (userId) => {
  if (await isFirestoreReady()) {
    const snapshot = await db.collection(FILES_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } else {
    const files = loadUserFiles(userId);
    return files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
};

/**
 * Update file download count
 */
const incrementDownloadCount = async (filename, userId) => {
  if (await isFirestoreReady()) {
    const file = await getFileByFilename(filename, userId);
    if (!file) return null;

    const updateData = {
      downloadCount: (file.downloadCount || 0) + 1,
      updatedAt: new Date().toISOString()
    };

    await db.collection(FILES_COLLECTION).doc(file.id).update(updateData);
    return { ...file, ...updateData };
  } else {
    const files = loadUserFiles(userId);
    const fileIndex = files.findIndex(f => f.filename === filename);
    if (fileIndex === -1) return null;

    files[fileIndex].downloadCount = (files[fileIndex].downloadCount || 0) + 1;
    files[fileIndex].updatedAt = new Date().toISOString();
    saveUserFiles(userId, files);
    return files[fileIndex];
  }
};

/**
 * Delete file metadata
 */
const deleteFile = async (filename, userId) => {
  if (await isFirestoreReady()) {
    const file = await getFileByFilename(filename, userId);
    if (!file) return false;
    await db.collection(FILES_COLLECTION).doc(file.id).delete();
    return true;
  } else {
    const files = loadUserFiles(userId);
    const filtered = files.filter(f => f.filename !== filename);
    if (files.length === filtered.length) return false;
    saveUserFiles(userId, filtered);
    return true;
  }
};

/**
 * Get storage stats for a user
 */
const getStorageStats = async (userId) => {
  let files;
  if (await isFirestoreReady()) {
    const snapshot = await db.collection(FILES_COLLECTION)
      .where('userId', '==', userId)
      .get();
    files = snapshot.docs.map(doc => doc.data());
  } else {
    files = loadUserFiles(userId);
  }

  let totalSize = 0;
  files.forEach(file => {
    totalSize += (file.size || 0);
  });

  return {
    totalFiles: files.length,
    totalSize,
    quota: 5 * 1024 * 1024 * 1024, // 5GB quota
    usagePercent: ((totalSize / (5 * 1024 * 1024 * 1024)) * 100).toFixed(2)
  };
};

module.exports = {
  createFile,
  getFileByFilename,
  getFileById,
  getUserFiles,
  incrementDownloadCount,
  deleteFile,
  getStorageStats
};
