const { db } = require('./firebase-admin');
const logger = require('./logger');

const SETTINGS_COLLECTION = 'settings';
const DEFAULT_SETTINGS = {
  uploadLimit: 50, // MB
  downloadLimit: 100, // MB per day
  enableTranscoding: true,
  defaultQuality: '720p',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

/**
 * Get cloud settings from Firestore
 */
const getSettings = async () => {
  try {
    const doc = await db.collection(SETTINGS_COLLECTION).doc('cloud').get();
    
    if (!doc.exists) {
      // Create default settings if not exist
      await db.collection(SETTINGS_COLLECTION).doc('cloud').set(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    logger.error('[Settings] Get settings error:', error.message);
    return DEFAULT_SETTINGS;
  }
};

/**
 * Update cloud settings
 */
const updateSettings = async (settings) => {
  try {
    const updateData = {
      ...settings,
      updatedAt: new Date().toISOString()
    };
    
    await db.collection(SETTINGS_COLLECTION).doc('cloud').set(updateData, { merge: true });
    
    logger.info('[Settings] Settings updated:', updateData);
    return { success: true, settings: updateData };
  } catch (error) {
    logger.error('[Settings] Update settings error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Check if upload size is within limit
 */
const isUploadSizeAllowed = async (sizeInMB) => {
  const settings = await getSettings();
  return sizeInMB <= settings.uploadLimit;
};

/**
 * Check if download quota is exceeded for user
 */
const isDownloadQuotaExceeded = async (userId, downloadedTodayInMB) => {
  const settings = await getSettings();
  return downloadedTodayInMB >= settings.downloadLimit;
};

module.exports = {
  getSettings,
  updateSettings,
  isUploadSizeAllowed,
  isDownloadQuotaExceeded,
  DEFAULT_SETTINGS
};
