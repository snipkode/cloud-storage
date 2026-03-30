import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from '@store/authStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useFilesStore = create((set, get) => ({
  files: [],
  folders: [],
  loading: false,
  uploadProgress: 0,
  error: null,
  stats: null,
  environment: 'live',

  fetchFiles: async (token, environment = 'live') => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/files?environment=${environment}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Handle 401 - Token expired
      if (res.status === 401) {
        const refreshed = await useAuthStore.getState().handleAuthError({ status: 401 });
        if (refreshed) {
          // Retry with new token
          const newToken = useAuthStore.getState().token;
          return fetchFiles(newToken, environment);
        }
      }

      const data = await res.json();
      if (res.ok) {
        set({
          files: data.files,
          stats: data.stats,
          environment: data.stats?.environment || environment,
          loading: false
        });
      } else {
        set({ error: data.error, loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  fetchFolders: async (token, environment = 'live') => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/folders?environment=${environment}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Handle 401 - Token expired
      if (res.status === 401) {
        const refreshed = await useAuthStore.getState().handleAuthError({ status: 401 });
        if (refreshed) {
          const newToken = useAuthStore.getState().token;
          return get().fetchFolders(newToken, environment);
        }
      }

      const data = await res.json();
      if (res.ok) {
        set({
          folders: data.folders,
          loading: false
        });
        return data.folders;
      } else {
        set({ error: data.error, loading: false });
        return [];
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return [];
    }
  },

  createFolder: async (name, parentId, token, environment = 'live') => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/folders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Environment': environment
        },
        body: JSON.stringify({ name, parentId })
      });

      // Handle 401 - Token expired
      if (res.status === 401) {
        const refreshed = await useAuthStore.getState().handleAuthError({ status: 401 });
        if (refreshed) {
          const newToken = useAuthStore.getState().token;
          return get().createFolder(name, parentId, newToken, environment);
        }
      }

      const data = await res.json();
      if (res.ok) {
        // Refresh folders after creation
        await get().fetchFolders(token, environment);
        set({ loading: false });
        return { success: true, folder: data.folder };
      } else {
        set({ error: data.error, loading: false });
        return { success: false, error: data.error };
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      return { success: false, error: error.message };
    }
  },

  deleteFolder: async (folderId, token, environment = 'live') => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/folders/${encodeURIComponent(folderId)}?environment=${environment}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Handle 401 - Token expired
      if (res.status === 401) {
        const refreshed = await useAuthStore.getState().handleAuthError({ status: 401 });
        if (refreshed) {
          const newToken = useAuthStore.getState().token;
          return get().deleteFolder(folderId, newToken, environment);
        }
      }

      const data = await res.json();
      if (res.ok) {
        // Refresh folders after deletion
        await get().fetchFolders(token, environment);
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

  uploadFile: async (file, token, environment = 'live', folderPath = null) => {
    set({ loading: true, uploadProgress: 0, error: null });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers = {
        'Authorization': `Bearer ${token}`,
        'X-Environment': environment,
        'Content-Type': 'multipart/form-data'
      };

      if (folderPath) {
        headers['X-Folder-Path'] = folderPath;
      }

      const response = await axios.post(`${API_BASE}/api/upload`, formData, {
        headers,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            set({ uploadProgress: (progressEvent.loaded / progressEvent.total) * 100 });
          }
        }
      });

      if (response.status === 201) {
        await get().fetchFiles(token, environment);
        return { success: true };
      } else {
        set({ error: response.data?.error || 'Upload failed' });
        return { success: false, error: response.data?.error || 'Upload failed' };
      }
    } catch (error) {
      console.error('Upload file error:', error);
      set({ error: error.response?.data?.error || 'Upload failed' });
      return { success: false, error: error.response?.data?.error || 'Upload failed' };
    }
  },

  uploadMultiple: async (files, token, environment = 'live', folderPath = null) => {
    set({ loading: true, uploadProgress: 0, error: null });

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const headers = {
        'Authorization': `Bearer ${token}`,
        'X-Environment': environment,
        'Content-Type': 'multipart/form-data'
      };

      if (folderPath) {
        headers['X-Folder-Path'] = folderPath;
      }

      const response = await axios.post(`${API_BASE}/api/upload-multiple`, formData, {
        headers,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            set({ uploadProgress: (progressEvent.loaded / progressEvent.total) * 100 });
          }
        }
      });

      if (response.status === 201) {
        await get().fetchFiles(token, environment);
        return { success: true };
      } else {
        set({ error: response.data?.error || 'Upload failed' });
        return { success: false, error: response.data?.error || 'Upload failed' };
      }
    } catch (error) {
      console.error('Upload multiple error:', error);
      set({ error: error.response?.data?.error || 'Upload failed' });
      return { success: false, error: error.response?.data?.error || 'Upload failed' };
    }
  },

  deleteFile: async (filename, token, environment = 'live') => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/delete/${encodeURIComponent(filename)}?environment=${environment}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        await get().fetchFiles(token, environment);
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

  downloadFile: async (filename, token, environment = 'live') => {
    console.log(`[Download] Filename: ${filename}, Environment: ${environment}, Token exists: ${!!token}`);
    
    try {
      const downloadUrl = `${API_BASE}/api/download/${encodeURIComponent(filename)}?environment=${environment}`;
      console.log(`[Download] URL: ${downloadUrl}`);
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(`[Download] Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Download] Error response:`, errorData);
        throw new Error(errorData.message || 'Download failed');
      }

      // Get the blob from response
      const blob = await response.blob();
      console.log(`[Download] Blob size: ${blob.size} bytes`);
      
      // Extract filename from Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      let downloadFilename = filename;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          downloadFilename = filenameMatch[1];
        }
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      console.log(`[Download] Complete`);
    } catch (error) {
      console.error('[Download] Error:', error);
      // Fallback: try direct download (may not work with auth required)
      window.location.href = `${API_BASE}/api/download/${encodeURIComponent(filename)}?environment=${environment}`;
    }
  },

  clearError: () => set({ error: null })
}));
