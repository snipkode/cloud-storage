import { create } from 'zustand';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useFilesStore = create((set, get) => ({
  files: [],
  loading: false,
  uploadProgress: 0,
  error: null,
  stats: null,

  fetchFiles: async (token) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/files`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        set({ files: data.files, stats: data.stats, loading: false });
      } else {
        set({ error: data.error, loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  uploadFile: async (file, token) => {
    set({ loading: true, uploadProgress: 0, error: null });
    
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          set({ uploadProgress: (e.loaded / e.total) * 100 });
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status === 201) {
          await get().fetchFiles(token);
          resolve({ success: true });
        } else {
          const data = JSON.parse(xhr.responseText);
          set({ error: data.error, loading: false });
          resolve({ success: false, error: data.error });
        }
      });

      xhr.addEventListener('error', () => {
        set({ error: 'Upload failed', loading: false });
        resolve({ success: false, error: 'Upload failed' });
      });

      xhr.open('POST', `${API_BASE}/api/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  },

  uploadMultiple: async (files, token) => {
    set({ loading: true, uploadProgress: 0, error: null });
    
    return new Promise((resolve) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          set({ uploadProgress: (e.loaded / e.total) * 100 });
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status === 201) {
          await get().fetchFiles(token);
          resolve({ success: true });
        } else {
          const data = JSON.parse(xhr.responseText);
          set({ error: data.error, loading: false });
          resolve({ success: false, error: data.error });
        }
      });

      xhr.addEventListener('error', () => {
        set({ error: 'Upload failed', loading: false });
        resolve({ success: false, error: 'Upload failed' });
      });

      xhr.open('POST', `${API_BASE}/api/upload-multiple`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  },

  deleteFile: async (filename, token) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/delete/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        await get().fetchFiles(token);
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

  downloadFile: async (filename, token) => {
    try {
      const response = await fetch(`${API_BASE}/api/download/${encodeURIComponent(filename)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback to direct download if fetch fails
      window.location.href = `${API_BASE}/api/download/${encodeURIComponent(filename)}`;
    }
  },

  clearError: () => set({ error: null })
}));
