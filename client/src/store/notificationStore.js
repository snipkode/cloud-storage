import { create } from 'zustand';

// Use relative path for API - Vite proxy will handle it
const API_BASE_URL = '/api';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  token: null,

  // Get headers with auth
  getHeaders: () => {
    const state = get();
    return {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
    };
  },

  // Fetch notifications
  fetchNotifications: async (limit = 50) => {
    const state = get();
    if (!state.token) {
      console.warn('[Notification] No token available');
      return;
    }

    set({ loading: true, error: null });
    try {
      const headers = get().getHeaders();
      const url = `${API_BASE_URL}/notifications?limit=${limit}`;
      console.log('[Notification] Fetching from:', url);
      
      const response = await fetch(url, { headers });

      console.log('[Notification] Response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      console.log('[Notification] Received:', data.notifications?.length || 0, 'notifications');

      set({
        notifications: data.notifications || [],
        loading: false
      });

      // Update unread count
      get().fetchUnreadCount();
    } catch (error) {
      console.error('[Notification] Fetch error:', error.message);
      set({ loading: false, error: error.message });
    }
  },

  // Fetch unread count
  fetchUnreadCount: async () => {
    const state = get();
    if (!state.token) return;

    try {
      const headers = get().getHeaders();
      const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, { headers });

      if (response.ok) {
        const data = await response.json();
        set({ unreadCount: data.unreadCount || 0 });
      }
    } catch (error) {
      // Silently fail - notifications are optional
      // console.warn('Failed to fetch unread count:', error.message);
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    const state = get();
    if (!state.token) return;

    try {
      const headers = get().getHeaders();
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'POST',
        headers
      });

      if (response.ok) {
        // Update local state
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1)
        }));
      }
    } catch (error) {
      // Silently fail - notification is optional
      console.warn('Failed to mark notification as read:', error.message);
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const state = get();
    if (!state.token) return;

    try {
      const headers = get().getHeaders();
      const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'POST',
        headers
      });

      if (response.ok) {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0
        }));
      }
    } catch (error) {
      // Silently fail
      console.warn('Failed to mark all as read:', error.message);
    }
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    const state = get();
    if (!state.token) return;

    try {
      const headers = get().getHeaders();
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== notificationId),
          unreadCount: state.notifications.find((n) => n.id === notificationId && !n.read)
            ? Math.max(0, state.unreadCount - 1)
            : state.unreadCount
        }));
      }
    } catch (error) {
      // Silently fail
      console.warn('Failed to delete notification:', error.message);
    }
  },

  // Set token from auth store
  setToken: (token) => {
    set({ token });
  },

  // Clear notifications (on logout)
  clear: () => {
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      token: null
    });
  }
}));

export { useNotificationStore };
