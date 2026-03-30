const { db } = require('./firebase-admin');
const logger = require('./logger');

const FILES_COLLECTION = 'files';
const FOLDERS_COLLECTION = 'folders';

/**
 * Create folder metadata
 */
const createFolder = async (folderData) => {
  const newFolder = {
    id: folderData.id || `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: folderData.name,
    path: folderData.path, // Full path e.g., '/folder1/folder2'
    parentId: folderData.parentId || null, // Parent folder ID for hierarchy
    userId: folderData.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    environment: folderData.environment || 'live'
  };

  await db.collection(FOLDERS_COLLECTION).doc(newFolder.id).set(newFolder);

  return newFolder;
};

/**
 * Get folder by ID
 */
const getFolderById = async (id, environment = 'live') => {
  const doc = await db.collection(FOLDERS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data();
  if ((data.environment || 'live') !== environment) return null;

  return { id: doc.id, ...doc.data() };
};

/**
 * Get all folders for a user
 */
const getUserFolders = async (userId, environment = 'live') => {
  const snapshot = await db.collection(FOLDERS_COLLECTION)
    .where('userId', '==', userId)
    .where('environment', '==', environment)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Get folders by parent ID
 */
const getFoldersByParentId = async (parentId, userId, environment = 'live') => {
  const snapshot = await db.collection(FOLDERS_COLLECTION)
    .where('parentId', '==', parentId)
    .where('userId', '==', userId)
    .where('environment', '==', environment)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Check if folder name already exists under parent
 */
const getFolderByPath = async (path, userId, environment = 'live') => {
  const snapshot = await db.collection(FOLDERS_COLLECTION)
    .where('path', '==', path)
    .where('userId', '==', userId)
    .where('environment', '==', environment)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

/**
 * Delete folder metadata
 */
const deleteFolder = async (folderId, userId, environment = 'live') => {
  const folder = await getFolderById(folderId, environment);
  if (!folder || folder.userId !== userId) return false;

  await db.collection(FOLDERS_COLLECTION).doc(folderId).delete();

  return true;
};

/**
 * Delete all subfolders recursively by path
 */
const deleteSubfolders = async (parentPath, userId, environment = 'live') => {
  try {
    // Get all folders that start with this path (direct children and deeper)
    const allFolders = await getUserFolders(userId, environment);

    // Filter to only subfolders of parentPath
    const subfolders = allFolders.filter(f => {
      // Match paths like: /parent/child, /parent/child/grandchild
      // But not: /parent2 or /parent-something
      return f.path.startsWith(parentPath + '/') &&
             f.path.substring(parentPath.length + 1).split('/').length >= 1;
    });

    // Delete from deepest level first (reverse order)
    subfolders.sort((a, b) => b.path.split('/').length - a.path.split('/').length);

    for (const subfolder of subfolders) {
      await db.collection(FOLDERS_COLLECTION).doc(subfolder.id).delete();
      logger.debug(`[DeleteSubfolders] Deleted: ${subfolder.name} (${subfolder.id})`);
    }
  } catch (error) {
    logger.error('[DeleteSubfolders] Error:', error.message);
    throw error;
  }
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
  // Folder operations
  createFolder,
  getFolderById,
  getUserFolders,
  getFoldersByParentId,
  getFolderByPath,
  deleteFolder,
  deleteSubfolders,
  // File operations
  createFile,
  getFileByFilename,
  getFileById,
  getUserFiles,
  incrementDownloadCount,
  deleteFile,
  getStorageStats
};
