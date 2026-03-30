const { hashApiKey, isValidApiKeyFormat } = require('../lib/api-key-generator');
const apiKeyStore = require('../lib/api-key-store');
const { decrypt } = require('../lib/encryption');
const logger = require('../lib/logger');

/**
 * Middleware to validate API Key
 * Supports two authentication methods:
 * 1. Firebase JWT Token (Bearer token)
 * 2. API Key (Bearer key or X-API-Key header)
 * 
 * Note: API keys via query parameters are NOT supported for security reasons
 * (query params can be logged in server logs, browser history, referer headers)
 */
const apiKeyMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];

    let apiKey = null;

    // Get API key from headers only (NOT query params for security)
    if (apiKeyHeader) {
      apiKey = apiKeyHeader;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];

      // Check if it's an API key (starts with cs_)
      if (token.startsWith('cs_')) {
        apiKey = token;
      } else {
        // It's a Firebase token, skip to Firebase auth
        return next();
      }
    }

    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No API key or Firebase token provided'
      });
    }

    // Validate API key format
    if (!isValidApiKeyFormat(apiKey)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key format'
      });
    }

    // Hash and lookup
    const keyHash = hashApiKey(apiKey);
    const apiKeyRecord = await apiKeyStore.getApiKeyByHash(keyHash);

    if (!apiKeyRecord) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    // Check if active
    if (!apiKeyRecord.active) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key has been revoked'
      });
    }

    // Check expiration
    if (apiKeyStore.isExpired(apiKeyRecord)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key has expired'
      });
    }

    // Verify encrypted key can be decrypted (for keys stored with encryption)
    if (apiKeyRecord.encryptedKey) {
      const decryptedKey = decrypt(apiKeyRecord.encryptedKey);
      if (!decryptedKey || decryptedKey !== apiKey) {
        logger.error('API key decryption mismatch');
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid API key'
        });
      }
    }
    // Note: Keys without encryptedKey (old keys) are allowed for backward compatibility

    // Update usage stats (non-blocking)
    apiKeyStore.updateApiKeyUsage(keyHash);

    // Attach user info and permissions to request
    req.user = {
      uid: apiKeyRecord.userId,
      authMethod: 'api-key',
      apiKeyId: apiKeyRecord.id,
      apiKeyName: apiKeyRecord.name,
      permissions: apiKeyRecord.permissions,
      environment: apiKey.startsWith('cs_test_') ? 'test' : 'live',
      active: apiKeyRecord.active,
      expiresAt: apiKeyRecord.expiresAt
    };

    // Store the required permission for this route
    req.requiredPermission = null;

    next();
  } catch (error) {
    logger.error('API Key middleware error:', error.message);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed'
    });
  }
};

/**
 * Middleware to check specific permission
 * Usage: requirePermission('read')(req, res, next)
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    // If authenticated via Firebase token, check role-based access
    if (req.user && req.user.authMethod === 'firebase') {
      // For admin permission, require admin or super_admin role
      if (permission === 'admin') {
        const userRole = req.user.role || 'user';
        if (userRole !== 'admin' && userRole !== 'super_admin') {
          return res.status(403).json({
            error: 'Forbidden',
            message: `Insufficient permissions. Required role: admin or super_admin, your role: ${userRole}`
          });
        }
        return next();
      }
      // For other permissions, allow Firebase authenticated users
      return next();
    }

    // If authenticated via API key, check permissions
    if (req.user && req.user.authMethod === 'api-key') {
      const hasPerm = apiKeyStore.hasPermission(req.user, permission);

      if (!hasPerm) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `API key does not have '${permission}' permission`,
          apiKeyPermissions: req.user.permissions
        });
      }

      return next();
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Not authenticated'
    });
  };
};

/**
 * Optional auth middleware - doesn't fail if no auth
 * Just attaches user info if available
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];

    let apiKey = null;

    if (apiKeyHeader) {
      apiKey = apiKeyHeader;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      if (token.startsWith('cs_')) {
        apiKey = token;
      } else {
        return next();
      }
    }

    if (apiKey && isValidApiKeyFormat(apiKey)) {
      const keyHash = hashApiKey(apiKey);
      const apiKeyRecord = await apiKeyStore.getApiKeyByHash(keyHash);

      if (apiKeyRecord && apiKeyRecord.active && !apiKeyStore.isExpired(apiKeyRecord)) {
        apiKeyStore.updateApiKeyUsage(keyHash);
        req.user = {
          uid: apiKeyRecord.userId,
          authMethod: 'api-key',
          apiKeyId: apiKeyRecord.id,
          permissions: apiKeyRecord.permissions,
          active: true
        };
      }
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

module.exports = {
  apiKeyMiddleware,
  requirePermission,
  optionalAuth
};
