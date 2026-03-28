const fs = require('fs');
const path = require('path');
const { hashApiKey } = require('./api-key-generator');

const DB_PATH = path.join(__dirname, '..', 'data', 'api-keys.json');

// Ensure data directory exists
const ensureDataDir = () => {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Initialize database file if not exists
const initDb = () => {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ apiKeys: [] }, null, 2));
  }
};

// Read database
const readDb = () => {
  initDb();
  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data);
};

// Write database
const writeDb = (data) => {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

/**
 * Create new API key
 */
const createApiKey = (apiKeyData) => {
  const db = readDb();
  
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
  
  db.apiKeys.push(newKey);
  writeDb(db);
  
  return newKey;
};

/**
 * Get API key by hashed key
 */
const getApiKeyByHash = (keyHash) => {
  const db = readDb();
  return db.apiKeys.find(key => key.keyHash === keyHash);
};

/**
 * Get API key by ID
 */
const getApiKeyById = (id) => {
  const db = readDb();
  return db.apiKeys.find(key => key.id === id);
};

/**
 * Get all API keys for a user
 */
const getUserApiKeys = (userId) => {
  const db = readDb();
  return db.apiKeys
    .filter(key => key.userId === userId)
    .map(key => ({
      id: key.id,
      name: key.name,
      permissions: key.permissions,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      usageCount: key.usageCount,
      active: key.active,
      // Don't return keyHash for security
    }));
};

/**
 * Update API key usage
 */
const updateApiKeyUsage = (keyHash) => {
  const db = readDb();
  const keyIndex = db.apiKeys.findIndex(key => key.keyHash === keyHash);
  
  if (keyIndex === -1) return null;
  
  db.apiKeys[keyIndex].lastUsedAt = new Date().toISOString();
  db.apiKeys[keyIndex].usageCount += 1;
  
  writeDb(db);
  return db.apiKeys[keyIndex];
};

/**
 * Revoke API key
 */
const revokeApiKey = (id, userId) => {
  const db = readDb();
  const keyIndex = db.apiKeys.findIndex(key => key.id === id && key.userId === userId);
  
  if (keyIndex === -1) return false;
  
  db.apiKeys[keyIndex].active = false;
  writeDb(db);
  
  return true;
};

/**
 * Delete API key
 */
const deleteApiKey = (id, userId) => {
  const db = readDb();
  const initialLength = db.apiKeys.length;
  db.apiKeys = db.apiKeys.filter(key => !(key.id === id && key.userId === userId));
  
  if (db.apiKeys.length === initialLength) return false;
  
  writeDb(db);
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
