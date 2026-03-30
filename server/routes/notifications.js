const express = require('express');
const authMiddleware = require('@middleware/auth');
const { apiKeyMiddleware, requirePermission } = require('@middleware/api-key-auth');
const { requireRole } = require('@middleware/role');
const notificationStore = require('@lib/notification-store');
const logger = require('@lib/logger');

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
      const notifications = await notificationStore.getUserNotifications(req.user.uid, limit);

      res.json({
        notifications,
        total: notifications.length
      });
    } catch (error) {
      logger.error('Get notifications error:', error.message);
      res.status(500).json({ error: 'Failed to get notifications' });
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
      const count = await notificationStore.getUnreadCount(req.user.uid);

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
