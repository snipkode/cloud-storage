const { db, initialized: firestoreInitialized } = require('./firebase-admin');
const { hashApiKey } = require('./api-key-generator');
const fs = require('fs');
const path = require('path');

const API_KEYS_FILE = path.join(process.cwd(), 'data', 'api-keys.json');

// Ensure data directory exists
const dataDir = path.dirname(API_KEYS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Load all API keys from filesystem
 */
const loadApiKeys = () => {
  if (!fs.existsSync(API_KEYS_FILE)) {
    return [];
  }
  const content = fs.readFileSync(API_KEYS_FILE, 'utf8');
  return JSON.parse(content);
};

/**
 * Save all API keys to filesystem
 */
const saveApiKeys = (keys) => {
  fs.writeFileSync(API_KEYS_FILE, JSON.stringify(keys, null, 2));
};

/**
 * Create new API key
 */
const createApiKey = async (apiKeyData) => {
  const newKey = {
    id: apiKeyData.id,
    keyHash: hashApiKey(apiKeyData.key),
    userId: apiKeyData.userId,
    name: apiKeyData.name,
    permissions: apiKeyData.permissions,
    expiresAt: apiKeyData.expiresAt || null,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    usageCount: 0,
    active: true
  };

  if (firestoreInitialized && db) {
    await db.collection('apiKeys').doc(newKey.id).set(newKey);
  } else {
    const keys = loadApiKeys();
    keys.push(newKey);
    saveApiKeys(keys);
  }

  return newKey;
};

/**
 * Get API key by hashed key
 */
const getApiKeyByHash = async (keyHash) => {
  if (firestoreInitialized && db) {
    const snapshot = await db.collection('apiKeys')
      .where('keyHash', '==', keyHash)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } else {
    const keys = loadApiKeys();
    return keys.find(k => k.keyHash === keyHash) || null;
  }
};

/**
 * Get API key by ID
 */
const getApiKeyById = async (id) => {
  if (firestoreInitialized && db) {
    const doc = await db.collection('apiKeys').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } else {
    const keys = loadApiKeys();
    return keys.find(k => k.id === id) || null;
  }
};

/**
 * Get all API keys for a user
 */
const getUserApiKeys = async (userId) => {
  if (firestoreInitialized && db) {
    const snapshot = await db.collection('apiKeys')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        permissions: data.permissions,
        expiresAt: data.expiresAt,
        createdAt: data.createdAt,
        lastUsedAt: data.lastUsedAt,
        usageCount: data.usageCount,
        active: data.active,
      };
    });
  } else {
    const keys = loadApiKeys();
    return keys
      .filter(k => k.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(data => ({
        id: data.id,
        name: data.name,
        permissions: data.permissions,
        expiresAt: data.expiresAt,
        createdAt: data.createdAt,
        lastUsedAt: data.lastUsedAt,
        usageCount: data.usageCount,
        active: data.active,
      }));
  }
};

/**
 * Update API key usage
 */
const updateApiKeyUsage = async (keyHash) => {
  if (firestoreInitialized && db) {
    const apiKey = await getApiKeyByHash(keyHash);
    if (!apiKey) return null;

    const updateData = {
      lastUsedAt: new Date().toISOString(),
      usageCount: apiKey.usageCount + 1
    };

    await db.collection('apiKeys').doc(apiKey.id).update(updateData);
    return { ...apiKey, ...updateData };
  } else {
    const keys = loadApiKeys();
    const keyIndex = keys.findIndex(k => k.keyHash === keyHash);
    if (keyIndex === -1) return null;

    keys[keyIndex].lastUsedAt = new Date().toISOString();
    keys[keyIndex].usageCount = keys[keyIndex].usageCount + 1;
    saveApiKeys(keys);
    return keys[keyIndex];
  }
};

/**
 * Revoke API key
 */
const revokeApiKey = async (id, userId) => {
  if (firestoreInitialized && db) {
    const apiKey = await getApiKeyById(id);
    if (!apiKey || apiKey.userId !== userId) return false;
    await db.collection('apiKeys').doc(id).update({ active: false });
    return true;
  } else {
    const keys = loadApiKeys();
    const keyIndex = keys.findIndex(k => k.id === id);
    if (keyIndex === -1 || keys[keyIndex].userId !== userId) return false;
    keys[keyIndex].active = false;
    saveApiKeys(keys);
    return true;
  }
};

/**
 * Delete API key
 */
const deleteApiKey = async (id, userId) => {
  if (firestoreInitialized && db) {
    const apiKey = await getApiKeyById(id);
    if (!apiKey || apiKey.userId !== userId) return false;
    await db.collection('apiKeys').doc(id).delete();
    return true;
  } else {
    const keys = loadApiKeys();
    const keyIndex = keys.findIndex(k => k.id === id);
    if (keyIndex === -1 || keys[keyIndex].userId !== userId) return false;
    keys.splice(keyIndex, 1);
    saveApiKeys(keys);
    return true;
  }
};

/**
 * Check if API key is expired
 */
const isExpired = (apiKey) => {
  if (!apiKey.expiresAt) return false;
  return new Date(apiKey.expiresAt) < new Date();
};

/**
 * Validate API key permissions
 */
const hasPermission = (apiKey, requiredPermission) => {
  if (!apiKey.active) return false;
  if (isExpired(apiKey)) return false;
  if (apiKey.permissions.includes('admin')) return true;
  return apiKey.permissions.includes(requiredPermission);
};

module.exports = {
  createApiKey,
  getApiKeyByHash,
  getApiKeyById,
  getUserApiKeys,
  updateApiKeyUsage,
  revokeApiKey,
  deleteApiKey,
  hasPermission,
  isExpired
};
