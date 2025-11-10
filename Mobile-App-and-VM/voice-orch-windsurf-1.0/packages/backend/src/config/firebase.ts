import admin from 'firebase-admin';
import { logger } from '../utils/logger';

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    if (!admin.apps.length) {
      // Check if we have Firebase credentials
      if (!process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID === 'your_firebase_project_id') {
        logger.warn('Firebase credentials not configured. Running in development mode without Firebase.');
        return null;
      }

      const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });

      logger.info('Firebase Admin initialized successfully');
      return admin;
    }
    return admin;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin:', error);
    logger.warn('Continuing without Firebase for development...');
    return null;
  }
};

const firebaseApp = initializeFirebase();

// Export Firebase services or mock objects for development
export const auth = firebaseApp ? admin.auth() : null;
export const db = firebaseApp ? admin.firestore() : null;

export default admin;
