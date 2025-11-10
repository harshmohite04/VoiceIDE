import OpenAI from 'openai';
import { logger } from '../utils/logger';

export class VoiceService {
  private openai: OpenAI | null;

  constructor() {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      logger.info('OpenAI client initialized successfully');
    } else {
      this.openai = null;
      logger.warn('OpenAI API key not configured. Voice processing will return mock responses.');
    }
  }

  async processAudioChunk(audioData: Buffer, sessionId: string, userId: string) {
    try {
      logger.info(`Processing audio chunk for session: ${sessionId}`);
      
      // Convert audio to text using Whisper
      const transcription = await this.transcribeAudio(audioData);
      
      if (!transcription) {
        return { type: 'error', message: 'Failed to transcribe audio' };
      }

      // Process the transcribed text
      const response = await this.processTextMessage(transcription, sessionId, userId);
      
      return {
        ...response,
        transcription,
      };
    } catch (error) {
      logger.error('Error processing audio chunk:', error);
      throw error;
    }
  }

  async processTextMessage(message: string, sessionId: string, userId: string) {
    try {
      logger.info(`Processing text message for session: ${sessionId}`);
      
      // Get conversation context (implement context management later)
      const context = await this.getConversationContext(sessionId);
      
      // Generate AI response using GPT-4
      const aiResponse = await this.generateAIResponse(message, context);
      
      // Generate audio response
      const audioResponse = await this.generateAudioResponse(aiResponse);
      
      return {
        type: 'response',
        text: aiResponse,
        audio: audioResponse,
        timestamp: new Date().toISOString(),
        sessionId,
      };
    } catch (error) {
      logger.error('Error processing text message:', error);
      throw error;
    }
  }

  private async transcribeAudio(audioData: Buffer): Promise<string | null> {
    try {
      if (!this.openai) {
        logger.warn('OpenAI not available, returning mock transcription');
        return 'This is a mock transcription for development mode.';
      }

      // Create a temporary file for the audio data
      const response = await this.openai.audio.transcriptions.create({
        file: new File([audioData], 'audio.wav', { type: 'audio/wav' }),
        model: 'whisper-1',
      });
      
      return response.text;
    } catch (error) {
      logger.error('Error transcribing audio:', error);
      return null;
    }
  }

  private async generateAIResponse(message: string, context: any[]): Promise<string> {
    try {
      if (!this.openai) {
        logger.warn('OpenAI not available, returning mock AI response');
        return `This is a mock AI response for development mode. You said: "${message}". In a real environment, this would be processed by GPT-4.`;
      }

      const systemPrompt = `You are VoiceDev Partner, an AI development companion. You help developers discuss ideas, plan projects, and provide technical guidance. Be conversational, helpful, and focus on practical development advice.`;
      
      const messages = [
        { role: 'system', content: systemPrompt },
        ...context,
        { role: 'user', content: message },
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages as any,
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response.';
    } catch (error) {
      logger.error('Error generating AI response:', error);
      throw error;
    }
  }

  private async generateAudioResponse(text: string): Promise<Buffer | null> {
    try {
      if (!this.openai) {
        logger.warn('OpenAI not available, skipping audio generation');
        return null;
      }

      const response = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer;
    } catch (error) {
      logger.error('Error generating audio response:', error);
      return null;
    }
  }

  private async getConversationContext(sessionId: string): Promise<any[]> {
    // TODO: Implement context retrieval from database
    // For now, return empty context
    return [];
  }
}
