import { Router } from 'express';
import { SessionService } from '../services/sessionService';
import { verifyToken } from './auth';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const sessionService = new SessionService();

// Create new session
router.post('/create', verifyToken, async (req: any, res: any) => {
  try {
    const userId = req.user.uid;
    const sessionId = uuidv4();

    const session = await sessionService.createSession(userId, sessionId);
    res.json({ success: true, session });
  } catch (error) {
    logger.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get session by ID
router.get('/:sessionId', verifyToken, async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.uid;

    const session = await sessionService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if user owns the session
    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ success: true, session });
  } catch (error) {
    logger.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// End session
router.post('/:sessionId/end', verifyToken, async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.uid;

    await sessionService.endSession(sessionId, userId);
    res.json({ success: true, message: 'Session ended' });
  } catch (error) {
    logger.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

export { router as sessionRoutes };
