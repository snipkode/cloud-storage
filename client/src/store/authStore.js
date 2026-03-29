import { create } from 'zustand';
import { app, isFirebaseMock } from '@lib/firebase-app';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  tokenRefreshInterval: null,

  init: () => {
    if (isFirebaseMock) {
      // Mock mode - skip Firebase auth
      console.log('🔧 Running in mock mode - Firebase not configured');
      set({ loading: false });
      return;
    }

    // Real Firebase mode
    import('firebase/auth').then(({ getAuth, onAuthStateChanged }) => {
      const auth = getAuth(app);
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          const token = await user.getIdToken();
          set({
            user: {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL
            },
            token,
            isAuthenticated: true,
            loading: false
          });
          
          // Auto-refresh token every 50 minutes (token expires in 60 minutes)
          const { refreshToken } = get();
          const interval = setInterval(refreshToken, 50 * 60 * 1000);
          set({ tokenRefreshInterval: interval });
        } else {
          // Clear interval on logout
          const { tokenRefreshInterval } = get();
          if (tokenRefreshInterval) {
            clearInterval(tokenRefreshInterval);
          }
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
            tokenRefreshInterval: null
          });
        }
      });
    }).catch(err => {
      console.error('Firebase auth error:', err);
      set({ loading: false });
    });
  },

  login: async () => {
    if (isFirebaseMock) {
      // Mock login for development
      console.log('🔧 Mock login - Firebase not configured');
      set({
        user: {
          uid: 'mock-user',
          email: 'dev@example.com',
          displayName: 'Dev User',
          photoURL: 'https://ui-avatars.com/api/?name=Dev+User&background=6366f1&color=fff'
        },
        token: 'mock-token',
        isAuthenticated: true
      });
      return { success: true };
    }

    try {
      const { getAuth, signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const auth = getAuth(app);
      const googleProvider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      set({
        user: {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL
        },
        token,
        isAuthenticated: true
      });
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  },

  logout: async () => {
    if (isFirebaseMock) {
      set({
        user: null,
        token: null,
        isAuthenticated: false
      });
      return { success: true };
    }

    try {
      const { getAuth, signOut } = await import('firebase/auth');
      const auth = getAuth(app);
      await signOut(auth);
      set({
        user: null,
        token: null,
        isAuthenticated: false
      });
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  },

  refreshToken: async () => {
    if (isFirebaseMock) return null;

    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth(app);
      if (auth.currentUser) {
        // Force refresh to get a new token
        const newToken = await auth.currentUser.getIdToken(true);
        set({ token: newToken });
        console.log('🔄 Token refreshed successfully');
        return newToken;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, user should re-login
      get().logout();
    }
    return null;
  },

  // Check if error is 401 and try to refresh
  handleAuthError: async (error) => {
    if (error?.status === 401 || error?.message?.includes('Unauthorized')) {
      console.log('⚠️ 401 Unauthorized - Attempting token refresh');
      const { refreshToken } = get();
      const newToken = await refreshToken();
      return newToken !== null; // Return true if refresh succeeded
    }
    return false;
  }
}));

export { useAuthStore };
