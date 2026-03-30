import { create } from 'zustand';
import { useAuthStore } from './authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const useAdminStore = create((set, get) => ({
  // State
  stats: null,
  users: [],
  activities: [],
  logs: [],
  sambaStatus: null,
  totalUsers: 0,
  totalLogs: 0,
  loading: false,
  error: null,

  // Actions
  fetchStats: async () => {
    set({ loading: true, error: null });
    try {
      const { token } = useAuthStore.getState();
      const res = await fetch(`${API_BASE_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        set({ stats: data.stats, loading: false });
      } else {
        set({ error: data.error, loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  fetchUsers: async (limit = 50, offset = 0) => {
    set({ loading: true, error: null });
    try {
      const { token } = useAuthStore.getState();
      const res = await fetch(
        `${API_BASE_URL}/api/admin/users?limit=${limit}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      
      if (res.ok) {
        set({ users: data.users, loading: false, totalUsers: data.total });
      } else {
        set({ error: data.error, loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  fetchActivities: async (limit = 20) => {
    set({ loading: true, error: null });
    try {
      const { token } = useAuthStore.getState();
      const res = await fetch(
        `${API_BASE_URL}/api/admin/activity?limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      
      if (res.ok) {
        set({ activities: data.activities, loading: false });
      } else {
        set({ error: data.error, loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  fetchLogs: async (level = 'all', limit = 50) => {
    set({ loading: true, error: null });
    try {
      const { token } = useAuthStore.getState();
      const res = await fetch(
        `${API_BASE_URL}/api/admin/logs?level=${level}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      
      if (res.ok) {
        set({ logs: data.logs, totalLogs: data.total, loading: false });
      } else {
        set({ error: data.error, loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  fetchSambaStatus: async () => {
    set({ loading: true, error: null });
    try {
      const { token } = useAuthStore.getState();
      const res = await fetch(`${API_BASE_URL}/api/admin/samba/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        set({ sambaStatus: data, loading: false });
      } else {
        set({ error: data.error, loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  updateUserRole: async (uid, role) => {
    set({ loading: true, error: null });
    try {
      const { token } = useAuthStore.getState();
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${uid}/role`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      
      if (res.ok) {
        // Refresh users list
        get().fetchUsers();
        set({ loading: false });
        return { success: true };
      } else {
        set({ error: data.error, loading: false });
        return { success: false, error: data.error };
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  deleteUser: async (uid) => {
    set({ loading: true, error: null });
    try {
      const { token } = useAuthStore.getState();
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${uid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        // Refresh users list
        get().fetchUsers();
        set({ loading: false });
        return { success: true };
      } else {
        set({ error: data.error, loading: false });
        return { success: false, error: data.error };
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  clearError: () => set({ error: null })
}));
