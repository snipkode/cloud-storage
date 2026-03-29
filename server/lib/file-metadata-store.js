const { db } = require('./firebase-admin');

const FILES_COLLECTION = 'files';

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
    downloadCount: 0,
    environment: fileData.environment || 'live' // Add environment field
  };

  await db.collection(FILES_COLLECTION).doc(newFile.id).set(newFile);

  return newFile;
};

/**
 * Get file metadata by filename and userId
 */
const getFileByFilename = async (filename, userId, environment = 'live') => {
  const snapshot = await db.collection(FILES_COLLECTION)
    .where('filename', '==', filename)
    .where('userId', '==', userId)
    .where('environment', '==', environment)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

/**
 * Get file metadata by ID
 */
const getFileById = async (id, environment = 'live') => {
  const doc = await db.collection(FILES_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data();
  // Check environment match
  if ((data.environment || 'live') !== environment) return null;

  return { id: doc.id, ...doc.data() };
};

/**
 * Get all files for a user
 */
const getUserFiles = async (userId, environment = 'live') => {
  const snapshot = await db.collection(FILES_COLLECTION)
    .where('userId', '==', userId)
    .where('environment', '==', environment)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Update file download count
 */
const incrementDownloadCount = async (filename, userId, environment = 'live') => {
  const file = await getFileByFilename(filename, userId, environment);
  if (!file) return null;

  const updateData = {
    downloadCount: (file.downloadCount || 0) + 1,
    updatedAt: new Date().toISOString()
  };

  await db.collection(FILES_COLLECTION).doc(file.id).update(updateData);

  return { ...file, ...updateData };
};

/**
 * Delete file metadata
 */
const deleteFile = async (filename, userId, environment = 'live') => {
  const file = await getFileByFilename(filename, userId, environment);
  if (!file) return false;

  await db.collection(FILES_COLLECTION).doc(file.id).delete();

  return true;
};

/**
 * Get storage stats for a user
 */
const getStorageStats = async (userId, environment = 'live') => {
  const snapshot = await db.collection(FILES_COLLECTION)
    .where('userId', '==', userId)
    .where('environment', '==', environment)
    .get();

  let totalSize = 0;
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    totalSize += (data.size || 0);
  });

  return {
    totalFiles: snapshot.size,
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
