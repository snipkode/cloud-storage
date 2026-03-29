const { hashApiKey, isValidApiKeyFormat } = require('../lib/api-key-generator');
const apiKeyStore = require('../lib/api-key-store');
const { decrypt } = require('../lib/encryption');

/**
 * Middleware to validate API Key
 * Supports two authentication methods:
 * 1. Firebase JWT Token (Bearer token)
 * 2. API Key (Bearer key or X-API-Key header)
 */
const apiKeyMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];
    const apiKeyQuery = req.query.api_key;

    let apiKey = null;

    // Get API key from various sources
    if (apiKeyHeader) {
      apiKey = apiKeyHeader;
    } else if (apiKeyQuery) {
      apiKey = apiKeyQuery;
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
        console.error('API key decryption mismatch');
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid API key'
        });
      }
    }

    // Update usage stats (non-blocking)
    apiKeyStore.updateApiKeyUsage(keyHash);

    // Attach user info and permissions to request
    req.user = {
      uid: apiKeyRecord.userId,
      authMethod: 'api-key',
      apiKeyId: apiKeyRecord.id,
      apiKeyName: apiKeyRecord.name,
      permissions: apiKeyRecord.permissions
    };

    // Store the required permission for this route
    req.requiredPermission = null;

    next();
  } catch (error) {
    console.error('API Key middleware error:', error.message);
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
    // If authenticated via Firebase token, allow access
    if (req.user && req.user.authMethod === 'firebase') {
      return next();
    }

    // If authenticated via API key, check permissions
    if (req.user && req.user.authMethod === 'api-key') {
      const hasPermission = apiKeyStore.hasPermission(req.user, permission);

      if (!hasPermission) {
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
    const apiKeyQuery = req.query.api_key;

    let apiKey = null;

    if (apiKeyHeader) {
      apiKey = apiKeyHeader;
    } else if (apiKeyQuery) {
      apiKey = apiKeyQuery;
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
          permissions: apiKeyRecord.permissions
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
