const express = require('express');
const SambaIntegration = require('@lib/samba');
const authMiddleware = require('@middleware/auth');
const { requireRole } = require('@middleware/role');
const logger = require('@lib/logger');

const router = express.Router();

// Initialize Samba integration
const samba = new SambaIntegration({
  uploadsDir: process.env.SAMBA_UPLOADS_DIR || '/app/uploads',
  testUploadsDir: process.env.SAMBA_TEST_UPLOADS_DIR || '/app/test-uploads',
  shareName: process.env.SAMBA_SHARE_NAME || 'cloud-storage',
  sambaConfigPath: process.env.SAMBA_CONFIG_PATH || '/etc/samba/smb.conf'
});

/**
 * GET /api/samba/status
 * Get Samba service status
 */
router.get('/status',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    try {
      const status = await samba.getStatus();
      res.json({
        samba: status,
        message: status.installed && status.running ? 'Samba is running' : 'Samba needs attention'
      });
    } catch (error) {
      logger.error('Failed to get Samba status:', error.message);
      res.status(500).json({ error: 'Failed to get Samba status', details: error.message });
    }
  }
);

/**
 * GET /api/samba/config
 * Generate and preview Samba configuration
 */
router.get('/config',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { includeTestShare = true } = req.query;
      const config = samba.generateConfig({ includeTestShare });
      
      res.json({
        config,
        path: samba.config.sambaConfigPath
      });
    } catch (error) {
      logger.error('Failed to generate Samba config:', error.message);
      res.status(500).json({ error: 'Failed to generate config', details: error.message });
    }
  }
);

/**
 * POST /api/samba/config/deploy
 * Deploy Samba configuration
 */
router.post('/config/deploy',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { includeTestShare = true, ...options } = req.body;
      
      // Generate config
      const config = samba.generateConfig({ includeTestShare, ...options });
      
      // Write config
      const writeResult = await samba.writeConfig(config);
      
      if (!writeResult.success) {
        return res.status(500).json({ error: 'Failed to write config', details: writeResult.error });
      }
      
      // Test config
      const testResult = await samba.testConfig();
      if (!testResult.valid) {
        return res.status(500).json({ error: 'Config validation failed', details: testResult.output });
      }
      
      // Restart Samba
      await samba.restartSamba();
      
      res.json({
        message: 'Samba configuration deployed successfully',
        backup: writeResult.backupPath,
        restarted: true
      });
    } catch (error) {
      logger.error('Failed to deploy Samba config:', error.message);
      res.status(500).json({ error: 'Failed to deploy config', details: error.message });
    }
  }
);

/**
 * POST /api/samba/restart
 * Restart Samba service
 */
router.post('/restart',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    try {
      const result = await samba.restartSamba();
      res.json({
        message: result ? 'Samba restarted successfully' : 'Failed to restart Samba',
        success: result
      });
    } catch (error) {
      logger.error('Failed to restart Samba:', error.message);
      res.status(500).json({ error: 'Failed to restart Samba', details: error.message });
    }
  }
);

/**
 * POST /api/samba/reload
 * Reload Samba configuration
 */
router.post('/reload',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    try {
      const result = await samba.reloadSambaConfig();
      res.json({
        message: result ? 'Samba configuration reloaded' : 'Failed to reload config',
        success: result
      });
    } catch (error) {
      logger.error('Failed to reload Samba config:', error.message);
      res.status(500).json({ error: 'Failed to reload config', details: error.message });
    }
  }
);

/**
 * GET /api/samba/users
 * List Samba users
 */
router.get('/users',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    try {
      const result = await samba.listUsers();
      res.json({
        users: result.users || [],
        total: (result.users || []).length
      });
    } catch (error) {
      logger.error('Failed to list Samba users:', error.message);
      res.status(500).json({ error: 'Failed to list users', details: error.message });
    }
  }
);

/**
 * POST /api/samba/users
 * Add Samba user
 */
router.post('/users',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      
      const result = await samba.addUser(username, password);
      
      if (result.success) {
        res.status(201).json({
          message: 'User added successfully',
          username
        });
      } else {
        res.status(500).json({ error: 'Failed to add user', details: result.error });
      }
    } catch (error) {
      logger.error('Failed to add Samba user:', error.message);
      res.status(500).json({ error: 'Failed to add user', details: error.message });
    }
  }
);

/**
 * DELETE /api/samba/users/:username
 * Remove Samba user
 */
router.delete('/users/:username',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { username } = req.params;
      const result = await samba.removeUser(username);
      
      if (result.success) {
        res.json({ message: 'User removed successfully', username });
      } else {
        res.status(500).json({ error: 'Failed to remove user', details: result.error });
      }
    } catch (error) {
      logger.error('Failed to remove Samba user:', error.message);
      res.status(500).json({ error: 'Failed to remove user', details: error.message });
    }
  }
);

/**
 * POST /api/samba/users/:username/toggle
 * Enable/disable Samba user
 */
router.post('/users/:username/toggle',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { username } = req.params;
      const { enable } = req.body;
      
      if (typeof enable !== 'boolean') {
        return res.status(400).json({ error: 'Enable must be a boolean' });
      }
      
      const result = await samba.toggleUser(username, enable);
      
      if (result.success) {
        res.json({
          message: `User ${enable ? 'enabled' : 'disabled'} successfully`,
          username,
          enabled: enable
        });
      } else {
        res.status(500).json({ error: 'Failed to toggle user', details: result.error });
      }
    } catch (error) {
      logger.error('Failed to toggle Samba user:', error.message);
      res.status(500).json({ error: 'Failed to toggle user', details: error.message });
    }
  }
);

/**
 * POST /api/samba/users/sync
 * Sync app users to Samba users
 */
router.post('/users/sync',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { users } = req.body;
      
      if (!users || !Array.isArray(users)) {
        return res.status(400).json({ error: 'Users array is required' });
      }
      
      const result = await samba.syncUsers(users);
      
      res.json({
        message: 'User sync completed',
        results: result
      });
    } catch (error) {
      logger.error('Failed to sync users:', error.message);
      res.status(500).json({ error: 'Failed to sync users', details: error.message });
    }
  }
);

/**
 * POST /api/samba/setup
 * Complete Samba setup
 */
router.post('/setup',
  authMiddleware,
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const options = req.body;
      const result = await samba.setup(options);
      
      if (result.success) {
        res.json({
          message: 'Samba setup completed successfully',
          steps: result.steps
        });
      } else {
        res.status(500).json({
          error: 'Samba setup failed',
          steps: result.steps
        });
      }
    } catch (error) {
      logger.error('Failed to setup Samba:', error.message);
      res.status(500).json({ error: 'Failed to setup Samba', details: error.message });
    }
  }
);

/**
 * GET /api/samba/help
 * Get Samba connection help
 */
router.get('/help',
  authMiddleware,
  async (req, res) => {
    try {
      const serverIp = process.env.SAMBA_SERVER_IP || 'your-server-ip';
      const shareName = samba.config.shareName;
      
      res.json({
        connection: {
          windows: `\\\\${serverIp}\\${shareName}`,
          mac: `smb://${serverIp}/${shareName}`,
          linux: `smb://${serverIp}/${shareName}`,
          command: `mount -t cifs //${serverIp}/${shareName} /mnt/local -o username=YOUR_USERNAME`
        },
        instructions: {
          windows: 'Open File Explorer → Enter the Windows path in address bar',
          mac: 'Open Finder → Go → Connect to Server → Enter the Mac path',
          linux: 'Use file manager or mount command with the Linux path'
        }
      });
    } catch (error) {
      logger.error('Failed to get Samba help:', error.message);
      res.status(500).json({ error: 'Failed to get help', details: error.message });
    }
  }
);

module.exports = router;
