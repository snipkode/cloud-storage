const { db } = require('./firebase-admin');

const NOTIFICATIONS_COLLECTION = 'notifications';
const USER_NOTIFICATIONS_COLLECTION = 'user_notifications';

/**
 * Create a notification (for broadcast or user-specific)
 */
const createNotification = async (notificationData) => {
  const newNotification = {
    id: notificationData.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: notificationData.title,
    message: notificationData.message,
    type: notificationData.type || 'info', // info, warning, success, error
    priority: notificationData.priority || 'normal', // low, normal, high, urgent
    isBroadcast: notificationData.isBroadcast || false,
    targetUserId: notificationData.targetUserId || null, // null for broadcast to all
    createdBy: notificationData.createdBy || 'system',
    createdAt: new Date().toISOString(),
    read: false,
    metadata: notificationData.metadata || {}
  };

  await db.collection(NOTIFICATIONS_COLLECTION).doc(newNotification.id).set(newNotification);

  // If broadcast, create user notification records for all users
  if (newNotification.isBroadcast) {
    await createUserNotificationsForAll(newNotification);
  } else if (newNotification.targetUserId) {
    await createUserNotification(newNotification, newNotification.targetUserId);
  }

  return newNotification;
};

/**
 * Create user notification records for all users (for broadcast)
 */
const createUserNotificationsForAll = async (notification) => {
  try {
    // Get all unique user IDs from files collection
    const filesSnapshot = await db.collection('files')
      .select('userId')
      .get();

    const userIds = new Set();
    filesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.userId) {
        userIds.add(data.userId);
      }
    });

    // Also get users from folders collection
    const foldersSnapshot = await db.collection('folders')
      .select('userId')
      .get();

    foldersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.userId) {
        userIds.add(data.userId);
      }
    });

    // Create user notification for each user
    const batch = db.batch();
    userIds.forEach(userId => {
      const userNotifRef = db.collection(USER_NOTIFICATIONS_COLLECTION).doc(
        `${notification.id}_${userId}`
      );
      batch.set(userNotifRef, {
        notificationId: notification.id,
        userId,
        read: false,
        createdAt: new Date().toISOString()
      });
    });

    await batch.commit();
    console.log(`[Notification] Broadcast to ${userIds.size} users`);
  } catch (error) {
    console.error('[Notification] Error creating broadcast:', error);
  }
};

/**
 * Create user notification record
 */
const createUserNotification = async (notification, userId) => {
  const userNotif = {
    notificationId: notification.id,
    userId,
    read: false,
    createdAt: new Date().toISOString()
  };

  await db.collection(USER_NOTIFICATIONS_COLLECTION)
    .doc(`${notification.id}_${userId}`)
    .set(userNotif);

  return userNotif;
};

/**
 * Get notifications for a user
 */
const getUserNotifications = async (userId, limit = 50) => {
  const snapshot = await db.collection(USER_NOTIFICATIONS_COLLECTION)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  const notifications = [];
  for (const doc of snapshot.docs) {
    const userNotif = doc.data();
    const notifDoc = await db.collection(NOTIFICATIONS_COLLECTION)
      .doc(userNotif.notificationId)
      .get();

    if (notifDoc.exists) {
      const notifData = notifDoc.data();
      notifications.push({
        id: notifDoc.id,
        ...notifData,
        read: userNotif.read,
        userNotificationId: doc.id
      });
    }
  }

  return notifications;
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, userId) => {
  const userNotifDoc = await db.collection(USER_NOTIFICATIONS_COLLECTION)
    .doc(`${notificationId}_${userId}`)
    .get();

  if (!userNotifDoc.exists) {
    return false;
  }

  await userNotifDoc.ref.update({ read: true });
  return true;
};

/**
 * Mark all notifications as read for a user
 */
const markAllAsRead = async (userId) => {
  const snapshot = await db.collection(USER_NOTIFICATIONS_COLLECTION)
    .where('userId', '==', userId)
    .where('read', '==', false)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { read: true });
  });

  await batch.commit();
  return snapshot.size;
};

/**
 * Get unread notification count for a user
 */
const getUnreadCount = async (userId) => {
  const snapshot = await db.collection(USER_NOTIFICATIONS_COLLECTION)
    .where('userId', '==', userId)
    .where('read', '==', false)
    .count()
    .get();

  return snapshot.data().count;
};

/**
 * Delete notification
 */
const deleteNotification = async (notificationId, userId) => {
  const userNotifDoc = await db.collection(USER_NOTIFICATIONS_COLLECTION)
    .doc(`${notificationId}_${userId}`)
    .get();

  if (!userNotifDoc.exists) {
    return false;
  }

  await userNotifDoc.ref.delete();
  return true;
};

/**
 * Get all notifications (for admin)
 */
const getAllNotifications = async (limit = 100) => {
  const snapshot = await db.collection(NOTIFICATIONS_COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  getAllNotifications
};
