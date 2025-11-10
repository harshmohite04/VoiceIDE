import { Router } from 'express';
import { auth } from '../config/firebase';
import { logger } from '../utils/logger';

const router = Router();

// Verify Firebase token middleware
export const verifyToken = async (req: any, res: any, next: any) => {
  try {
    // Skip authentication in development mode if Firebase is not configured
    if (!auth) {
      logger.warn('Firebase not configured, skipping authentication for development');
      req.user = { uid: 'dev-user', email: 'dev@example.com', name: 'Development User' };
      return next();
    }

    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Login endpoint (verify token)
router.post('/login', async (req: any, res: any) => {
  try {
    if (!auth) {
      return res.status(503).json({ error: 'Firebase authentication not configured' });
    }

    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    
    res.json({
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
      },
    });
  } catch (error) {
    logger.error('Login failed:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Get user profile
router.get('/profile', verifyToken, async (req: any, res: any) => {
  try {
    const user = req.user;
    res.json({
      uid: user.uid,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    logger.error('Error getting profile:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

export { router as authRoutes };
