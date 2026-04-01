const express = require('express');
const authMiddleware = require('@middleware/auth');
const { requireRole } = require('@middleware/role');
const settingsStore = require('@lib/settings-store');
const logger = require('@lib/logger');

const router = express.Router();

/**
 * GET /api/admin/settings
 * Get cloud settings (admin only)
 */
router.get('/settings',
  authMiddleware,
  requireRole('admin', 'super_admin'),
  async (req, res) => {
    try {
      const settings = await settingsStore.getSettings();
      
      res.json({
        success: true,
        settings
      });
    } catch (error) {
      logger.error('[Admin Settings] Get error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to get settings'
      });
    }
  }
);

/**
 * PUT /api/admin/settings
 * Update cloud settings (super_admin only)
 */
router.put('/settings',
  authMiddleware,
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const { uploadLimit, downloadLimit, enableTranscoding, defaultQuality } = req.body;
      
      // Validate input
      if (uploadLimit && (uploadLimit < 1 || uploadLimit > 1000)) {
        return res.status(400).json({
          success: false,
          error: 'Upload limit must be between 1 and 1000 MB'
        });
      }
      
      if (downloadLimit && (downloadLimit < 10 || downloadLimit > 10000)) {
        return res.status(400).json({
          success: false,
          error: 'Download limit must be between 10 and 10000 MB/day'
        });
      }
      
      const validQualities = ['360p', '480p', '720p', '1080p'];
      if (defaultQuality && !validQualities.includes(defaultQuality)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid quality option'
        });
      }
      
      const updateData = {};
      if (uploadLimit !== undefined) updateData.uploadLimit = uploadLimit;
      if (downloadLimit !== undefined) updateData.downloadLimit = downloadLimit;
      if (enableTranscoding !== undefined) updateData.enableTranscoding = enableTranscoding;
      if (defaultQuality !== undefined) updateData.defaultQuality = defaultQuality;
      
      const result = await settingsStore.updateSettings(updateData);
      
      if (result.success) {
        res.json({
          success: true,
          message: 'Settings updated successfully',
          settings: result.settings
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      logger.error('[Admin Settings] Update error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to update settings'
      });
    }
  }
);

/**
 * GET /api/admin/settings/check-upload
 * Check if file size is within limit
 */
router.get('/settings/check-upload',
  authMiddleware,
  async (req, res) => {
    try {
      const fileSize = parseFloat(req.query.size); // in MB
      
      if (!fileSize || fileSize <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file size'
        });
      }
      
      const allowed = await settingsStore.isUploadSizeAllowed(fileSize);
      const settings = await settingsStore.getSettings();
      
      res.json({
        success: true,
        allowed,
        limit: settings.uploadLimit,
        requested: fileSize
      });
    } catch (error) {
      logger.error('[Admin Settings] Check upload error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to check upload limit'
      });
    }
  }
);

module.exports = router;
