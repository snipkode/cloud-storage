import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './firebase';

// Check if config is valid (not placeholder)
const isValidConfig = firebaseConfig.apiKey !== "YOUR_API_KEY" &&
                      firebaseConfig.apiKey !== undefined &&
                      firebaseConfig.projectId !== "YOUR_PROJECT_ID" &&
                      firebaseConfig.projectId !== undefined;

let app;

if (isValidConfig) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.warn('❌ [Firebase] Initialization error:', error.message);
    app = { name: '[DEFAULT]', options: firebaseConfig };
  }
} else {
  console.warn('⚠️ [Firebase] Not configured - using mock mode');
  app = { name: '[DEFAULT]', options: firebaseConfig };
}

export { app };
export const isFirebaseMock = !isValidConfig;
