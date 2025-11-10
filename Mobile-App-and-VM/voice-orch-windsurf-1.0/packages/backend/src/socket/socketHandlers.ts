import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { VoiceService } from '../services/voiceService';
import { SessionService } from '../services/sessionService';

export const setupSocketHandlers = (io: SocketIOServer) => {
  const voiceService = new VoiceService();
  const sessionService = new SessionService();

  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Voice chat handlers
    socket.on('voice:start-session', async (data) => {
      try {
        const { userId, sessionId } = data;
        await sessionService.createSession(userId, sessionId);
        socket.join(`session:${sessionId}`);
        socket.emit('voice:session-started', { sessionId });
        logger.info(`Voice session started: ${sessionId} for user: ${userId}`);
      } catch (error) {
        logger.error('Error starting voice session:', error);
        socket.emit('voice:error', { message: 'Failed to start session' });
      }
    });

    socket.on('voice:audio-chunk', async (data) => {
      try {
        const { sessionId, audioData, userId } = data;
        const response = await voiceService.processAudioChunk(audioData, sessionId, userId);
        socket.emit('voice:response', response);
      } catch (error) {
        logger.error('Error processing audio chunk:', error);
        socket.emit('voice:error', { message: 'Failed to process audio' });
      }
    });

    socket.on('voice:text-message', async (data) => {
      try {
        const { sessionId, message, userId } = data;
        const response = await voiceService.processTextMessage(message, sessionId, userId);
        socket.emit('voice:response', response);
      } catch (error) {
        logger.error('Error processing text message:', error);
        socket.emit('voice:error', { message: 'Failed to process message' });
      }
    });

    socket.on('voice:end-session', async (data) => {
      try {
        const { sessionId, userId } = data;
        await sessionService.endSession(sessionId, userId);
        socket.leave(`session:${sessionId}`);
        socket.emit('voice:session-ended', { sessionId });
        logger.info(`Voice session ended: ${sessionId}`);
      } catch (error) {
        logger.error('Error ending voice session:', error);
        socket.emit('voice:error', { message: 'Failed to end session' });
      }
    });

    // Connection handlers
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });
};
