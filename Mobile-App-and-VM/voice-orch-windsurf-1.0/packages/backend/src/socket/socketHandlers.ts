import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { VoiceService } from '../services/voiceService';
import { RealtimeVoiceService } from '../services/realtimeVoiceService';
import { SessionService } from '../services/sessionService';

export const setupSocketHandlers = (io: SocketIOServer) => {
  const voiceService = new VoiceService();
  const realtimeVoiceService = new RealtimeVoiceService();
  const sessionService = new SessionService();

  // Setup RealtimeVoiceService event listeners
  realtimeVoiceService.on('session-connected', (data) => {
    io.to(`realtime:${data.sessionId}`).emit('realtime:connected', data);
  });

  realtimeVoiceService.on('session-disconnected', (data) => {
    io.to(`realtime:${data.sessionId}`).emit('realtime:disconnected', data);
  });

  realtimeVoiceService.on('session-error', (data) => {
    io.to(`realtime:${data.sessionId}`).emit('realtime:error', data);
  });

  realtimeVoiceService.on('speech-started', (data) => {
    io.to(`realtime:${data.sessionId}`).emit('realtime:speech-started', data);
  });

  realtimeVoiceService.on('speech-stopped', (data) => {
    io.to(`realtime:${data.sessionId}`).emit('realtime:speech-stopped', data);
  });

  realtimeVoiceService.on('transcription', (data) => {
    io.to(`realtime:${data.sessionId}`).emit('realtime:transcription', data);
  });

  realtimeVoiceService.on('audio-response', (data) => {
    io.to(`realtime:${data.sessionId}`).emit('realtime:audio-response', data);
  });

  realtimeVoiceService.on('text-response', (data) => {
    io.to(`realtime:${data.sessionId}`).emit('realtime:text-response', data);
  });

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

    // Realtime voice handlers
    socket.on('realtime:start-session', async (data) => {
      try {
        const { userId, sessionId } = data;
        
        // Create session in both services
        await sessionService.createSession(userId, sessionId);
        const success = await realtimeVoiceService.createSession(sessionId, userId);
        
        if (success) {
          // Connect to OpenAI Realtime API
          await realtimeVoiceService.connectToOpenAI(sessionId);
          socket.join(`realtime:${sessionId}`);
          socket.emit('realtime:session-started', { sessionId });
          logger.info(`Realtime session started: ${sessionId} for user: ${userId}`);
        } else {
          socket.emit('realtime:error', { message: 'Failed to create realtime session' });
        }
      } catch (error) {
        logger.error('Error starting realtime session:', error);
        socket.emit('realtime:error', { message: 'Failed to start realtime session' });
      }
    });

    socket.on('realtime:audio-chunk', async (data) => {
      try {
        const { sessionId, audioData } = data;
        const success = await realtimeVoiceService.sendAudioChunk(sessionId, audioData);
        
        if (!success) {
          socket.emit('realtime:error', { message: 'Failed to send audio chunk' });
        }
      } catch (error) {
        logger.error('Error processing realtime audio chunk:', error);
        socket.emit('realtime:error', { message: 'Failed to process audio chunk' });
      }
    });

    socket.on('realtime:audio-commit', async (data) => {
      try {
        const { sessionId } = data;
        const success = await realtimeVoiceService.commitAudio(sessionId);
        
        if (!success) {
          socket.emit('realtime:error', { message: 'Failed to commit audio' });
        }
      } catch (error) {
        logger.error('Error committing realtime audio:', error);
        socket.emit('realtime:error', { message: 'Failed to commit audio' });
      }
    });

    socket.on('realtime:end-session', async (data) => {
      try {
        const { sessionId, userId } = data;
        await realtimeVoiceService.endSession(sessionId);
        await sessionService.endSession(sessionId, userId);
        socket.leave(`realtime:${sessionId}`);
        socket.emit('realtime:session-ended', { sessionId });
        logger.info(`Realtime session ended: ${sessionId}`);
      } catch (error) {
        logger.error('Error ending realtime session:', error);
        socket.emit('realtime:error', { message: 'Failed to end realtime session' });
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
