const express = require('express');
const authMiddleware = require('@middleware/auth');
const { apiKeyMiddleware, requirePermission } = require('@middleware/api-key-auth');
const { requireRole } = require('@middleware/role');
const notificationStore = require('@lib/notification-store');
const logger = require('@lib/logger');
const { validateBody } = require('@lib/validation');
const { z } = require('zod');

// Combined auth middleware - supports both Firebase JWT and API Key
const combinedAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'];

  if (apiKeyHeader || (authHeader && authHeader.includes('cs_'))) {
    return apiKeyMiddleware(req, res, next);
  }

  return authMiddleware(req, res, next);
};

const router = express.Router();

/**
 * Get user notifications
 * GET /api/notifications
 */
router.get('/',
  combinedAuth,
  requirePermission('read'),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      logger.debug(`[Notifications] Getting notifications for user: ${req.user.uid}, limit: ${limit}`);

      let notifications = [];
      try {
        notifications = await notificationStore.getUserNotifications(req.user.uid, limit);
        logger.debug(`[Notifications] Found ${notifications.length} notifications`);
      } catch (firestoreError) {
        logger.error('[Notifications] Firestore query failed:', firestoreError.message);
        // Return empty notifications array instead of 500
        return res.json({
          notifications: [],
          total: 0
        });
      }

      res.json({
        notifications,
        total: notifications.length
      });
    } catch (error) {
      logger.error('Get notifications error:', error.message, error.stack);
      res.status(500).json({
        error: 'Failed to get notifications',
        details: error.message
      });
    }
  }
);

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
router.get('/unread-count',
  combinedAuth,
  requirePermission('read'),
  async (req, res) => {
    try {
      let count = 0;
      try {
        count = await notificationStore.getUnreadCount(req.user.uid);
      } catch (firestoreError) {
        logger.error('[Unread Count] Firestore query failed:', firestoreError.message);
        // Return 0 instead of 500
        count = 0;
      }

      res.json({
        unreadCount: count
      });
    } catch (error) {
      logger.error('Get unread count error:', error.message);
      res.status(500).json({ error: 'Failed to get unread count' });
    }
  }
);

/**
 * Mark notification as read
 * POST /api/notifications/:id/read
 */
router.post('/:id/read',
  combinedAuth,
  requirePermission('read'),
  async (req, res) => {
    try {
      const success = await notificationStore.markAsRead(req.params.id, req.user.uid);

      if (success) {
        res.json({ message: 'Notification marked as read' });
      } else {
        res.status(404).json({ error: 'Notification not found' });
      }
    } catch (error) {
      logger.error('Mark as read error:', error.message);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  }
);

/**
 * Mark all notifications as read
 * POST /api/notifications/read-all
 */
router.post('/read-all',
  combinedAuth,
  requirePermission('read'),
  async (req, res) => {
    try {
      const count = await notificationStore.markAllAsRead(req.user.uid);

      res.json({
        message: `Marked ${count} notification(s) as read`
      });
    } catch (error) {
      logger.error('Mark all as read error:', error.message);
      res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
  }
);

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
router.delete('/:id',
  combinedAuth,
  requirePermission('delete'),
  async (req, res) => {
    try {
      const success = await notificationStore.deleteNotification(req.params.id, req.user.uid);

      if (success) {
        res.json({ message: 'Notification deleted' });
      } else {
        res.status(404).json({ error: 'Notification not found' });
      }
    } catch (error) {
      logger.error('Delete notification error:', error.message);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  }
);

/**
 * Broadcast notification (super_admin only)
 * POST /api/notifications/broadcast
 */
router.post('/broadcast',
  authMiddleware,
  requireRole('super_admin'),
  validateBody(z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters')
      .trim(),
    message: z.string()
      .min(1, 'Message is required')
      .max(1000, 'Message must be less than 1000 characters')
      .trim(),
    type: z.enum(['info', 'warning', 'error', 'success'])
      .optional()
      .default('info'),
    priority: z.enum(['low', 'normal', 'high', 'urgent'])
      .optional()
      .default('normal'),
    metadata: z.record(z.any()).optional()
  })),
  async (req, res) => {
    try {
      const { title, message, type, priority, metadata } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: 'Title and message are required' });
      }

      const notification = await notificationStore.createNotification({
        title,
        message,
        type: type || 'info',
        priority: priority || 'normal',
        isBroadcast: true,
        createdBy: req.user.uid
      });

      res.status(201).json({
        message: 'Broadcast sent successfully',
        notification
      });
    } catch (error) {
      logger.error('Broadcast error:', error.message);
      res.status(500).json({ error: 'Failed to send broadcast' });
    }
  }
);

/**
 * Send notification to specific user (super_admin only)
 * POST /api/notifications/send
 */
router.post('/send',
  authMiddleware,
  requireRole('super_admin'),
  validateBody(z.object({
    userId: z.string()
      .min(1, 'User ID is required')
      .max(128, 'User ID too long'),
    title: z.string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters')
      .trim(),
    message: z.string()
      .min(1, 'Message is required')
      .max(1000, 'Message must be less than 1000 characters')
      .trim(),
    type: z.enum(['info', 'warning', 'error', 'success'])
      .optional()
      .default('info'),
    priority: z.enum(['low', 'normal', 'high', 'urgent'])
      .optional()
      .default('normal'),
    metadata: z.record(z.any()).optional()
  })),
  async (req, res) => {
    try {
      const { userId, title, message, type, priority, metadata } = req.body;

      if (!userId || !title || !message) {
        return res.status(400).json({ error: 'userId, title, and message are required' });
      }

      const notification = await notificationStore.createNotification({
        title,
        message,
        type: type || 'info',
        priority: priority || 'normal',
        targetUserId: userId,
        createdBy: req.user.uid
      });

      res.status(201).json({
        message: 'Notification sent successfully',
        notification
      });
    } catch (error) {
      logger.error('Send notification error:', error.message);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  }
);

/**
 * Send notification to multiple users (super_admin only)
 * POST /api/notifications/send-batch
 */
router.post('/send-batch',
  authMiddleware,
  requireRole('super_admin'),
  validateBody(z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters')
      .trim(),
    message: z.string()
      .min(1, 'Message is required')
      .max(1000, 'Message must be less than 1000 characters')
      .trim(),
    type: z.enum(['info', 'warning', 'error', 'success'])
      .optional()
      .default('info'),
    priority: z.enum(['low', 'normal', 'high', 'urgent'])
      .optional()
      .default('normal'),
    userIds: z.array(z.string()).min(1, 'At least one user ID required')
  })),
  async (req, res) => {
    try {
      const { title, message, type, priority, userIds } = req.body;

      if (!title || !message || !userIds || userIds.length === 0) {
        return res.status(400).json({ error: 'title, message, and userIds are required' });
      }

      // Create notification for each user
      const notifications = [];
      for (const userId of userIds) {
        const notification = await notificationStore.createNotification({
          title,
          message,
          type: type || 'info',
          priority: priority || 'normal',
          targetUserId: userId,
          createdBy: req.user.uid
        });
        notifications.push(notification);
      }

      logger.info(`[Batch] Sent to ${notifications.length} users`);

      res.status(201).json({
        message: `Notification sent to ${notifications.length} user(s)`,
        count: notifications.length
      });
    } catch (error) {
      logger.error('Batch send error:', error.message);
      res.status(500).json({ error: 'Failed to send batch notification' });
    }
  }
);

/**
 * Get all notifications (super_admin only)
 * GET /api/notifications/admin/all
 */
router.get('/admin/all',
  authMiddleware,
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const notifications = await notificationStore.getAllNotifications(limit);

      res.json({
        notifications,
        total: notifications.length
      });
    } catch (error) {
      logger.error('Get all notifications error:', error.message);
      res.status(500).json({ error: 'Failed to get notifications' });
    }
  }
);

module.exports = router;
