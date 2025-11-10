import { Router } from 'express';
import multer from 'multer';
import { VoiceService } from '../services/voiceService';
import { verifyToken } from './auth';
import { logger } from '../utils/logger';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const voiceService = new VoiceService();

// Process audio upload
router.post('/process-audio', verifyToken, upload.single('audio'), async (req: any, res: any) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.uid;
    const audioBuffer = req.file?.buffer;

    if (!audioBuffer) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const response = await voiceService.processAudioChunk(audioBuffer, sessionId, userId);
    res.json(response);
  } catch (error) {
    logger.error('Error processing audio:', error);
    res.status(500).json({ error: 'Failed to process audio' });
  }
});

// Process text message
router.post('/process-text', verifyToken, async (req: any, res: any) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user.uid;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const response = await voiceService.processTextMessage(message, sessionId, userId);
    res.json(response);
  } catch (error) {
    logger.error('Error processing text:', error);
    res.status(500).json({ error: 'Failed to process text' });
  }
});

export { router as voiceRoutes };
