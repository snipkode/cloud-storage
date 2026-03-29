const { db } = require('./firebase-admin');
const { hashApiKey } = require('./api-key-generator');

const API_KEYS_COLLECTION = 'apiKeys';

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

  await db.collection(API_KEYS_COLLECTION).doc(newKey.id).set(newKey);

  return newKey;
};

/**
 * Get API key by hashed key
 */
const getApiKeyByHash = async (keyHash) => {
  const snapshot = await db.collection(API_KEYS_COLLECTION)
    .where('keyHash', '==', keyHash)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

/**
 * Get API key by ID
 */
const getApiKeyById = async (id) => {
  const doc = await db.collection(API_KEYS_COLLECTION).doc(id).get();

  if (!doc.exists) return null;

  return { id: doc.id, ...doc.data() };
};

/**
 * Get all API keys for a user
 */
const getUserApiKeys = async (userId) => {
  const snapshot = await db.collection(API_KEYS_COLLECTION)
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
};

/**
 * Update API key usage
 */
const updateApiKeyUsage = async (keyHash) => {
  const apiKey = await getApiKeyByHash(keyHash);
  if (!apiKey) return null;

  const updateData = {
    lastUsedAt: new Date().toISOString(),
    usageCount: apiKey.usageCount + 1
  };

  await db.collection(API_KEYS_COLLECTION).doc(apiKey.id).update(updateData);

  return { ...apiKey, ...updateData };
};

/**
 * Revoke API key
 */
const revokeApiKey = async (id, userId) => {
  const apiKey = await getApiKeyById(id);

  if (!apiKey || apiKey.userId !== userId) return false;

  await db.collection(API_KEYS_COLLECTION).doc(id).update({ active: false });

  return true;
};

/**
 * Delete API key
 */
const deleteApiKey = async (id, userId) => {
  const apiKey = await getApiKeyById(id);

  if (!apiKey || apiKey.userId !== userId) return false;

  await db.collection(API_KEYS_COLLECTION).doc(id).delete();

  return true;
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
