const express = require('express');
const { 
  generateApiKey, 
  generateKeyId, 
  maskApiKey 
} = require('@lib/api-key-generator');
const apiKeyStore = require('@lib/api-key-store');
const authMiddleware = require('@middleware/auth');
const { apiKeyMiddleware, requirePermission } = require('@middleware/api-key-auth');

const router = express.Router();

// Available permission levels
const PERMISSION_LEVELS = {
  READ_ONLY: ['read'],
  UPLOAD_ONLY: ['upload'],
  READ_WRITE: ['read', 'upload', 'delete'],
  ADMIN: ['admin'] // Full access
};

/**
 * Generate new API key
 * POST /api/api-keys
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, permissions, expiresAt, environment } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid name',
        message: 'API key name is required'
      });
    }

    // Validate environment
    const env = environment === 'test' ? 'test' : 'live';

    // Validate permissions
    let selectedPermissions = permissions;
    if (!selectedPermissions || !Array.isArray(selectedPermissions)) {
      // Default to read-only
      selectedPermissions = PERMISSION_LEVELS.READ_ONLY;
    }

    // Validate permission values
    const validPermissions = ['read', 'upload', 'delete', 'admin'];
    const hasInvalidPermission = selectedPermissions.some(p => !validPermissions.includes(p));
    if (hasInvalidPermission) {
      return res.status(400).json({
        error: 'Invalid permissions',
        message: `Valid permissions: ${validPermissions.join(', ')}`
      });
    }

    // Generate API key
    const apiKey = generateApiKey(env);
    const keyId = generateKeyId();

    // Store API key
    const storedKey = await apiKeyStore.createApiKey({
      id: keyId,
      key: apiKey,
      userId: req.user.uid,
      name: name.trim(),
      permissions: selectedPermissions,
      expiresAt: expiresAt || null
    });

    // Return the full API key (only time it's shown)
    res.status(201).json({
      message: 'API key created successfully',
      apiKey: {
        id: storedKey.id,
        key: apiKey, // Full key - show only once!
        maskedKey: maskApiKey(apiKey),
        name: storedKey.name,
        permissions: storedKey.permissions,
        expiresAt: storedKey.expiresAt,
        createdAt: storedKey.createdAt,
        environment: env,
        warning: 'Store this API key securely. It will not be shown again!'
      }
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({
      error: 'Failed to create API key',
      message: error.message
    });
  }
});

/**
 * List all API keys for current user
 * GET /api/api-keys
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const apiKeys = await apiKeyStore.getUserApiKeys(req.user.uid);

    // Map API keys to include environment info from key prefix
    const mappedKeys = apiKeys.map(key => ({
      ...key,
      environment: key.key?.startsWith('cs_test_') ? 'test' : 'live'
    }));

    res.json({
      apiKeys: mappedKeys,
      total: mappedKeys.length
    });
  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({
      error: 'Failed to list API keys',
      message: error.message
    });
  }
});

/**
 * Get available permission levels
 * GET /api/api-keys/permissions
 */
router.get('/permissions', (req, res) => {
  res.json({
    permissions: [
      {
        id: 'read_only',
        name: 'Read Only',
        description: 'Can only list and download files',
        permissions: PERMISSION_LEVELS.READ_ONLY
      },
      {
        id: 'upload_only',
        name: 'Upload Only',
        description: 'Can only upload files',
        permissions: PERMISSION_LEVELS.UPLOAD_ONLY
      },
      {
        id: 'read_write',
        name: 'Read & Write',
        description: 'Can read, upload, and delete files',
        permissions: PERMISSION_LEVELS.READ_WRITE
      },
      {
        id: 'admin',
        name: 'Admin',
        description: 'Full access to all operations',
        permissions: PERMISSION_LEVELS.ADMIN
      }
    ]
  });
});

/**
 * Get single API key info
 * GET /api/api-keys/:id
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const apiKey = await apiKeyStore.getApiKeyById(req.params.id);

    if (!apiKey || apiKey.userId !== req.user.uid) {
      return res.status(404).json({
        error: 'Not found',
        message: 'API key not found'
      });
    }

    res.json({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        permissions: apiKey.permissions,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        lastUsedAt: apiKey.lastUsedAt,
        usageCount: apiKey.usageCount,
        active: apiKey.active,
        maskedKey: maskApiKey(apiKey.keyHash) // Just for display
      }
    });
  } catch (error) {
    console.error('Get API key error:', error);
    res.status(500).json({
      error: 'Failed to get API key',
      message: error.message
    });
  }
});

/**
 * Get API key usage stats
 * GET /api/api-keys/:id/usage
 */
router.get('/:id/usage', authMiddleware, async (req, res) => {
  try {
    const apiKey = await apiKeyStore.getApiKeyById(req.params.id);

    if (!apiKey || apiKey.userId !== req.user.uid) {
      return res.status(404).json({
        error: 'Not found',
        message: 'API key not found'
      });
    }

    res.json({
      usage: {
        id: apiKey.id,
        name: apiKey.name,
        usageCount: apiKey.usageCount,
        lastUsedAt: apiKey.lastUsedAt,
        createdAt: apiKey.createdAt,
        active: apiKey.active
      }
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ 
      error: 'Failed to get usage stats',
      message: error.message 
    });
  }
});

/**
 * Revoke API key
 * POST /api/api-keys/:id/revoke
 */
router.post('/:id/revoke', authMiddleware, async (req, res) => {
  try {
    const success = await apiKeyStore.revokeApiKey(req.params.id, req.user.uid);

    if (!success) {
      return res.status(404).json({
        error: 'Not found',
        message: 'API key not found'
      });
    }

    res.json({
      message: 'API key revoked successfully',
      apiKey: {
        id: req.params.id,
        active: false
      }
    });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({
      error: 'Failed to revoke API key',
      message: error.message
    });
  }
});

/**
 * Reactivate API key (reverse revoke)
 * POST /api/api-keys/:id/reactivate
 */
router.post('/:id/reactivate', authMiddleware, async (req, res) => {
  try {
    const success = await apiKeyStore.reactivateApiKey(req.params.id, req.user.uid);

    if (!success) {
      return res.status(404).json({
        error: 'Not found',
        message: 'API key not found'
      });
    }

    res.json({
      message: 'API key reactivated successfully',
      apiKey: {
        id: req.params.id,
        active: true
      }
    });
  } catch (error) {
    console.error('Reactivate API key error:', error);
    res.status(500).json({
      error: 'Failed to reactivate API key',
      message: error.message
    });
  }
});

/**
 * Toggle API key active status
 * POST /api/api-keys/:id/toggle
 */
router.post('/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const result = await apiKeyStore.toggleApiKeyStatus(req.params.id, req.user.uid);

    if (!result) {
      return res.status(404).json({
        error: 'Not found',
        message: 'API key not found'
      });
    }

    res.json({
      message: `API key ${result.active ? 'activated' : 'revoked'} successfully`,
      apiKey: result
    });
  } catch (error) {
    console.error('Toggle API key error:', error);
    res.status(500).json({
      error: 'Failed to toggle API key',
      message: error.message
    });
  }
});

/**
 * Reveal API key (decrypt for display)
 * GET /api/api-keys/:id/reveal
 */
router.get('/:id/reveal', authMiddleware, async (req, res) => {
  try {
    const result = await apiKeyStore.revealApiKey(req.params.id, req.user.uid);

    if (!result || !result.key) {
      return res.status(404).json({
        error: 'Not found',
        message: 'API key not found or cannot be revealed'
      });
    }

    res.json({
      apiKey: {
        id: result.id,
        key: result.key,
        environment: result.environment
      }
    });
  } catch (error) {
    console.error('Reveal API key error:', error);
    res.status(500).json({
      error: 'Failed to reveal API key',
      message: error.message
    });
  }
});

/**
 * Delete API key permanently
 * DELETE /api/api-keys/:id
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const success = await apiKeyStore.deleteApiKey(req.params.id, req.user.uid);

    if (!success) {
      return res.status(404).json({
        error: 'Not found',
        message: 'API key not found'
      });
    }

    res.json({
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({
      error: 'Failed to delete API key',
      message: error.message
    });
  }
});

module.exports = router;
