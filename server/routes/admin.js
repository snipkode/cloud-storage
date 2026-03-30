const express = require('express');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const fileMetadataStore = require('../lib/file-metadata-store');
const apiKeyStore = require('../lib/api-key-store');
const notificationStore = require('../lib/notification-store');
const logger = require('../lib/logger');

// Try to get Firebase Admin, fallback if not initialized
let db, initialized;
try {
  const firebaseAdmin = require('../lib/firebase-admin');
  db = firebaseAdmin.db;
  initialized = firebaseAdmin.initialized;
} catch (error) {
  db = null;
  initialized = false;
}

const router = express.Router();

const USERS_COLLECTION = 'users';
const FILES_COLLECTION = 'files';
const FOLDERS_COLLECTION = 'folders';
const API_KEYS_COLLECTION = 'apiKeys';
const NOTIFICATIONS_COLLECTION = 'notifications';
const LOGS_DIR = path.join(__dirname, '..', 'logs');

/**
 * GET /api/admin/stats
 * Get system statistics for admin dashboard
 */
router.get('/stats',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    try {
      const userRole = req.user.role;
      const isSuperAdmin = userRole === 'super_admin';

      // Count users
      let totalUsers = 0;
      if (initialized) {
        const usersSnapshot = await db.collection(USERS_COLLECTION).count().get();
        totalUsers = usersSnapshot.data().count;
      }

      // Count API keys (all users if super_admin, otherwise just current user)
      let totalApiKeys = 0;
      if (isSuperAdmin) {
        const apiKeysSnapshot = await db.collection(API_KEYS_COLLECTION).count().get();
        totalApiKeys = apiKeysSnapshot.data().count;
      } else {
        const apiKeysSnapshot = await db.collection(API_KEYS_COLLECTION)
          .where('userId', '==', req.user.uid)
          .count()
          .get();
        totalApiKeys = apiKeysSnapshot.data().count;
      }

      // Get storage stats for all users (sum up)
      let totalStorage = 0;
      let totalFiles = 0;

      if (isSuperAdmin) {
        // Get all files
        const filesSnapshot = await db.collection(FILES_COLLECTION).get();
        filesSnapshot.forEach(doc => {
          const data = doc.data();
          totalStorage += data.size || 0;
          totalFiles++;
        });
      } else {
        // Just current user
        const stats = await fileMetadataStore.getStorageStats(req.user.uid, 'live');
        totalStorage = stats.totalSize || 0;
        totalFiles = stats.totalFiles || 0;
      }

      // Count active users (users with activity in last 24h)
      // For now, use files created in last 24h as proxy
      let activeUsers = 0;
      if (isSuperAdmin && initialized) {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const recentFilesSnapshot = await db.collection(FILES_COLLECTION)
          .where('createdAt', '>=', yesterday)
          .get();
        
        const uniqueUsers = new Set();
        recentFilesSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.userId) uniqueUsers.add(data.userId);
        });
        activeUsers = uniqueUsers.size;
      }

      res.json({
        stats: {
          totalUsers,
          totalApiKeys,
          totalStorage,
          totalFiles,
          activeUsers,
          isSuperAdmin
        }
      });
    } catch (error) {
      logger.error('Admin stats error:', error.message);
      res.status(500).json({ error: 'Failed to get admin stats', details: error.message });
    }
  }
);

/**
 * GET /api/admin/users
 * List all users (super_admin only)
 */
router.get('/users',
  authMiddleware,
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;

      if (!initialized) {
        return res.status(503).json({ error: 'Firebase Admin SDK not initialized' });
      }

      // Get users from Firestore
      const usersSnapshot = await db.collection(USERS_COLLECTION)
        .limit(parseInt(limit))
        .offset(parseInt(offset))
        .get();

      const users = [];
      usersSnapshot.forEach(doc => {
        users.push({
          uid: doc.id,
          ...doc.data()
        });
      });

      // Get total count
      const countSnapshot = await db.collection(USERS_COLLECTION).count().get();
      const total = countSnapshot.data().count;

      res.json({
        users,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      logger.error('List users error:', error.message);
      res.status(500).json({ error: 'Failed to list users', details: error.message });
    }
  }
);

/**
 * GET /api/admin/users/:uid
 * Get user details (super_admin only)
 */
router.get('/users/:uid',
  authMiddleware,
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const { uid } = req.params;

      if (!initialized) {
        return res.status(503).json({ error: 'Firebase Admin SDK not initialized' });
      }

      const userDoc = await db.collection(USERS_COLLECTION).doc(uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = {
        uid: userDoc.id,
        ...userDoc.data()
      };

      // Get user's file count
      const filesSnapshot = await db.collection(FILES_COLLECTION)
        .where('userId', '==', uid)
        .count()
        .get();

      // Get user's API keys count
      const apiKeysSnapshot = await db.collection(API_KEYS_COLLECTION)
        .where('userId', '==', uid)
        .count()
        .get();

      // Get user's storage usage
      const userFiles = await db.collection(FILES_COLLECTION)
        .where('userId', '==', uid)
        .get();

      let totalStorage = 0;
      userFiles.forEach(doc => {
        const data = doc.data();
        totalStorage += data.size || 0;
      });

      res.json({
        user,
        stats: {
          fileCount: filesSnapshot.data().count,
          apiKeyCount: apiKeysSnapshot.data().count,
          totalStorage
        }
      });
    } catch (error) {
      logger.error('Get user error:', error.message);
      res.status(500).json({ error: 'Failed to get user', details: error.message });
    }
  }
);

/**
 * PATCH /api/admin/users/:uid/role
 * Update user role (super_admin only)
 */
router.patch('/users/:uid/role',
  authMiddleware,
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const { uid } = req.params;
      const { role } = req.body;

      if (!['user', 'admin', 'super_admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      if (!initialized) {
        return res.status(503).json({ error: 'Firebase Admin SDK not initialized' });
      }

      await db.collection(USERS_COLLECTION).doc(uid).update({
        role,
        updatedAt: new Date().toISOString()
      });

      res.json({ message: 'User role updated', uid, role });
    } catch (error) {
      logger.error('Update user role error:', error.message);
      res.status(500).json({ error: 'Failed to update user role', details: error.message });
    }
  }
);

/**
 * DELETE /api/admin/users/:uid
 * Delete user (super_admin only)
 */
router.delete('/users/:uid',
  authMiddleware,
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const { uid } = req.params;

      if (!initialized) {
        return res.status(503).json({ error: 'Firebase Admin SDK not initialized' });
      }

      // Delete user from Firestore
      await db.collection(USERS_COLLECTION).doc(uid).delete();

      // Delete user's files metadata
      const filesSnapshot = await db.collection(FILES_COLLECTION)
        .where('userId', '==', uid)
        .get();

      const batch = db.batch();
      filesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Delete user's API keys
      const apiKeysSnapshot = await db.collection(API_KEYS_COLLECTION)
        .where('userId', '==', uid)
        .get();

      const apiKeyBatch = db.batch();
      apiKeysSnapshot.forEach(doc => {
        apiKeyBatch.delete(doc.ref);
      });
      await apiKeyBatch.commit();

      res.json({ message: 'User deleted successfully', uid });
    } catch (error) {
      logger.error('Delete user error:', error.message);
      res.status(500).json({ error: 'Failed to delete user', details: error.message });
    }
  }
);

/**
 * GET /api/admin/activity
 * Get recent activity (super_admin only)
 */
router.get('/activity',
  authMiddleware,
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const { limit = 20 } = req.query;

      if (!initialized) {
        return res.status(503).json({ error: 'Firebase Admin SDK not initialized' });
      }

      const activities = [];

      // Get recent files
      const filesSnapshot = await db.collection(FILES_COLLECTION)
        .orderBy('createdAt', 'desc')
        .limit(parseInt(limit))
        .get();

      filesSnapshot.forEach(doc => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          type: 'file',
          action: 'File uploaded',
          user: data.userId,
          filename: data.originalname || data.filename,
          timestamp: data.createdAt,
          environment: data.environment
        });
      });

      // Get recent API keys
      const apiKeysSnapshot = await db.collection(API_KEYS_COLLECTION)
        .orderBy('createdAt', 'desc')
        .limit(parseInt(limit))
        .get();

      apiKeysSnapshot.forEach(doc => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          type: 'api',
          action: 'API key created',
          user: data.userId,
          keyName: data.name,
          timestamp: data.createdAt,
          environment: data.environment
        });
      });

      // Get recent notifications (broadcasts)
      const notificationsSnapshot = await db.collection(NOTIFICATIONS_COLLECTION)
        .orderBy('createdAt', 'desc')
        .limit(parseInt(limit))
        .get();

      notificationsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.isBroadcast) {
          activities.push({
            id: doc.id,
            type: 'broadcast',
            action: 'Broadcast sent',
            title: data.title,
            timestamp: data.createdAt
          });
        }
      });

      // Sort by timestamp
      activities.sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      // Take top N
      const recentActivities = activities.slice(0, parseInt(limit));

      res.json({ activities: recentActivities });
    } catch (error) {
      logger.error('Get activity error:', error.message);
      res.status(500).json({ error: 'Failed to get activity', details: error.message });
    }
  }
);

/**
 * GET /api/admin/logs
 * Get system logs (super_admin only)
 */
router.get('/logs',
  authMiddleware,
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const { level = 'all', limit = 50 } = req.query;

      if (!fs.existsSync(LOGS_DIR)) {
        return res.json({ logs: [], total: 0 });
      }

      // Read log files
      const logFiles = fs.readdirSync(LOGS_DIR)
        .filter(f => f.endsWith('.log'))
        .sort()
        .reverse()
        .slice(0, 5); // Last 5 log files

      const logs = [];

      for (const file of logFiles) {
        const filePath = path.join(LOGS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const log = JSON.parse(line);
            
            // Filter by level
            if (level !== 'all' && log.level !== level) continue;

            logs.push({
              timestamp: log.timestamp,
              level: log.level,
              message: log.message,
              ...log.context
            });
          } catch {
            // Skip non-JSON lines
          }
        }
      }

      // Sort by timestamp desc
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Limit results
      const limitedLogs = logs.slice(0, parseInt(limit));

      res.json({
        logs: limitedLogs,
        total: logs.length
      });
    } catch (error) {
      logger.error('Get logs error:', error.message);
      res.status(500).json({ error: 'Failed to get logs', details: error.message });
    }
  }
);

/**
 * GET /api/admin/samba/status
 * Get Samba integration status
 */
router.get('/samba/status',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    try {
      const sambaConfigPath = path.join(__dirname, '..', '..', 'samba-config', 'config.json');
      
      let config = null;
      let isEnabled = false;

      if (fs.existsSync(sambaConfigPath)) {
        config = JSON.parse(fs.readFileSync(sambaConfigPath, 'utf-8'));
        isEnabled = config.enabled || false;
      }

      res.json({
        enabled: isEnabled,
        config: config || {}
      });
    } catch (error) {
      logger.error('Get Samba status error:', error.message);
      res.status(500).json({ error: 'Failed to get Samba status', details: error.message });
    }
  }
);

module.exports = router;
