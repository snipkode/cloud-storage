import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './firebase';

// Check if config is valid (not placeholder)
const isValidConfig = firebaseConfig.apiKey !== "YOUR_API_KEY" && 
                      firebaseConfig.projectId !== "YOUR_PROJECT_ID";

let app;

if (isValidConfig) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.warn('Firebase initialization error:', error.message);
    // Create a mock app for development
    app = { name: '[DEFAULT]', options: firebaseConfig };
  }
} else {
  console.warn('⚠️ Firebase not configured - using mock mode');
  console.warn('Set up Firebase credentials in client/.env');
  // Create a mock app for development
  app = { name: '[DEFAULT]', options: firebaseConfig };
}

export { app };
export const isFirebaseMock = !isValidConfig;
