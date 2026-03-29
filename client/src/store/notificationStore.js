import { create } from 'zustand';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
    if (!state.token) return;

    set({ loading: true, error: null });
    try {
      const headers = get().getHeaders();
      const response = await fetch(`${API_BASE_URL}/notifications?limit=${limit}`, { headers });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      set({
        notifications: data.notifications || [],
        loading: false
      });

      // Update unread count
      get().fetchUnreadCount();
    } catch (error) {
      set({ error: error.message, loading: false });
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
      console.error('Failed to fetch unread count:', error);
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
      console.error('Failed to mark notification as read:', error);
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
      console.error('Failed to mark all as read:', error);
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
      console.error('Failed to delete notification:', error);
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
