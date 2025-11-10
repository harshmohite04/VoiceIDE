import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '../utils/logger';

export class SessionService {
  private readonly sessionsCollection = 'voice_sessions';

  async createSession(userId: string, sessionId: string) {
    try {
      const sessionData = {
        userId,
        sessionId,
        createdAt: new Date(),
        lastActivity: new Date(),
        messages: [],
        status: 'active',
      };

      if (db) {
        await db.collection(this.sessionsCollection).doc(sessionId).set(sessionData);
      } else {
        logger.warn('Database not available, session not persisted');
      }
      
      logger.info(`Session created: ${sessionId} for user: ${userId}`);
      
      return sessionData;
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  async endSession(sessionId: string, userId: string) {
    try {
      if (db) {
        await db.collection(this.sessionsCollection).doc(sessionId).update({
          status: 'ended',
          endedAt: new Date(),
        });
      } else {
        logger.warn('Database not available, session end not persisted');
      }

      logger.info(`Session ended: ${sessionId}`);
    } catch (error) {
      logger.error('Error ending session:', error);
      throw error;
    }
  }

  async getSession(sessionId: string) {
    try {
      if (!db) {
        logger.warn('Database not available, returning mock session');
        return {
          sessionId,
          userId: 'dev-user',
          createdAt: new Date(),
          lastActivity: new Date(),
          messages: [],
          status: 'active'
        };
      }

      const doc = await db.collection(this.sessionsCollection).doc(sessionId).get();
      
      if (!doc.exists) {
        return null;
      }

      return doc.data();
    } catch (error) {
      logger.error('Error getting session:', error);
      throw error;
    }
  }

  async addMessage(sessionId: string, message: any) {
    try {
      if (db) {
        await db.collection(this.sessionsCollection).doc(sessionId).update({
          messages: FieldValue.arrayUnion(message),
          lastActivity: new Date(),
        });
      } else {
        logger.warn('Database not available, message not persisted');
      }
    } catch (error) {
      logger.error('Error adding message to session:', error);
      throw error;
    }
  }
}
