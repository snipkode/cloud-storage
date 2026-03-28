import { create } from 'zustand';
import { 
  getAuth, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider 
} from 'firebase/auth';
import { app } from './firebase';

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,

  init: () => {
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
      } else {
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false,
          loading: false 
        });
      }
    });
  },

  login: async () => {
    try {
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
    try {
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
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken(true);
      set({ token });
      return token;
    }
    return null;
  }
}));
