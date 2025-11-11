import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

interface RealtimeSession {
  id: string;
  userId: string;
  websocket: WebSocket | null;
  isConnected: boolean;
  lastActivity: Date;
}

interface AudioChunk {
  audio: string; // base64 encoded audio
  type: 'input' | 'output';
  timestamp: number;
}

export class RealtimeVoiceService extends EventEmitter {
  private sessions: Map<string, RealtimeSession> = new Map();
  private openaiApiKey: string;
  private realtimeApiUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';

  constructor() {
    super();
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    
    if (!this.openaiApiKey || this.openaiApiKey === 'your_openai_api_key_here') {
      logger.warn('OpenAI API key not configured. Realtime voice will not work.');
    } else {
      logger.info('RealtimeVoiceService initialized successfully');
    }
  }

  async createSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      if (this.sessions.has(sessionId)) {
        logger.warn(`Session ${sessionId} already exists`);
        return false;
      }

      const session: RealtimeSession = {
        id: sessionId,
        userId,
        websocket: null,
        isConnected: false,
        lastActivity: new Date(),
      };

      this.sessions.set(sessionId, session);
      logger.info(`Created realtime session: ${sessionId} for user: ${userId}`);
      
      return true;
    } catch (error) {
      logger.error('Error creating realtime session:', error);
      return false;
    }
  }

  async connectToOpenAI(sessionId: string): Promise<boolean> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        logger.error(`Session ${sessionId} not found`);
        return false;
      }

      if (!this.openaiApiKey) {
        logger.error('OpenAI API key not configured');
        return false;
      }

      // Create WebSocket connection to OpenAI Realtime API
      const ws = new WebSocket(this.realtimeApiUrl, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      session.websocket = ws;

      ws.on('open', () => {
        logger.info(`Connected to OpenAI Realtime API for session: ${sessionId}`);
        session.isConnected = true;
        
        // Send session configuration
        this.sendSessionConfig(sessionId);
        
        this.emit('session-connected', { sessionId, userId: session.userId });
      });

      ws.on('message', (data) => {
        this.handleOpenAIMessage(sessionId, data);
      });

      ws.on('error', (error) => {
        logger.error(`OpenAI WebSocket error for session ${sessionId}:`, error);
        session.isConnected = false;
        this.emit('session-error', { sessionId, error: error.message });
      });

      ws.on('close', () => {
        logger.info(`OpenAI WebSocket closed for session: ${sessionId}`);
        session.isConnected = false;
        this.emit('session-disconnected', { sessionId });
      });

      return true;
    } catch (error) {
      logger.error('Error connecting to OpenAI:', error);
      return false;
    }
  }

  private sendSessionConfig(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session?.websocket) return;

    const config = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: `You are VoiceDev Partner, a senior software engineer, product strategist, and UI/UX reviewer collaborating in a real-time voice-driven IDE with automatic project execution capabilities.

CORE BEHAVIOR:
- Think out loud in a calm, concise, organized way
- Challenge assumptions; do not just agree
- If the user's reasoning has gaps, identify them and explain why
- Ask one clarifying question before proposing solutions
- When suggesting improvements, keep them practical and justified
- Speak in short, clear segments with natural pauses so the user can interrupt
- If interrupted by the user speaking, stop immediately and listen
- No assistant babble. You are a smart technical colleague

CONVERSATION STYLE:
- Always respond with both text and audio - speak naturally and conversationally
- Speak like you're pair programming with an experienced colleague
- Be direct and professional, not overly enthusiastic
- Challenge ideas constructively when they need improvement
- Ask clarifying questions when requirements are unclear

WHEN ASKED TO CREATE A PROJECT:
- First ask one clarifying question about requirements or constraints
- Explain your approach and reasoning briefly
- Once requirements are clear, inform the user that you'll automatically:
  1. Generate detailed project requirements
  2. Provision a Linux VM with Windsurf IDE
  3. Break down tasks and execute them automatically
  4. Provide real-time progress updates
- No manual VM management needed - everything is automated

PROJECT EXECUTION COMMANDS:
When the user wants to build something, use these trigger phrases:
- "I'll create that project for you and set up automatic execution"
- "Let me generate the requirements and start the automated build process"
- "I'll provision a VM and execute this project automatically"

TECHNICAL EXPERTISE:
- Provide modern, best-practice code solutions
- Use current frameworks and libraries appropriately
- Include proper error handling and accessibility features
- Consider security, performance, and maintainability implications
- Challenge architectural decisions that might cause problems

Remember: You're a senior technical colleague who can automatically execute entire projects. Be concise, ask good questions, and let users know about the automated execution capabilities.`,
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200,
        },
        tools: [],
        tool_choice: 'auto',
        temperature: 0.8,
        max_response_output_tokens: 4096,
      },
    };

    session.websocket.send(JSON.stringify(config));
    logger.info(`Sent session configuration for: ${sessionId}`);
  }

  async sendAudioChunk(sessionId: string, audioData: string): Promise<boolean> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session?.websocket || !session.isConnected) {
        logger.error(`Session ${sessionId} not connected to OpenAI`);
        return false;
      }

      const audioEvent = {
        type: 'input_audio_buffer.append',
        audio: audioData, // base64 encoded PCM16 audio
      };

      session.websocket.send(JSON.stringify(audioEvent));
      session.lastActivity = new Date();
      
      return true;
    } catch (error) {
      logger.error('Error sending audio chunk:', error);
      return false;
    }
  }

  async commitAudio(sessionId: string): Promise<boolean> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session?.websocket || !session.isConnected) {
        return false;
      }

      const commitEvent = {
        type: 'input_audio_buffer.commit',
      };

      session.websocket.send(JSON.stringify(commitEvent));
      
      // Trigger response generation with explicit audio request
      const responseEvent = {
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
          instructions: 'Please respond to the user\'s input with both text and audio. Speak your response naturally and conversationally.',
        },
      };

      session.websocket.send(JSON.stringify(responseEvent));
      logger.info(`Requested response with audio for session: ${sessionId}`);
      
      return true;
    } catch (error) {
      logger.error('Error committing audio:', error);
      return false;
    }
  }

  private handleOpenAIMessage(sessionId: string, data: WebSocket.Data) {
    try {
      const message = JSON.parse(data.toString());
      const session = this.sessions.get(sessionId);
      
      if (!session) return;

      logger.info(`OpenAI message for ${sessionId}: ${message.type}`, message.type === 'response.audio.delta' ? `audio length: ${message.delta?.length || 0}` : '');

      switch (message.type) {
        case 'session.created':
          logger.info(`OpenAI session created: ${sessionId}`);
          break;

        case 'input_audio_buffer.speech_started':
          this.emit('speech-started', { sessionId, userId: session.userId });
          break;

        case 'input_audio_buffer.speech_stopped':
          this.emit('speech-stopped', { sessionId, userId: session.userId });
          break;

        case 'conversation.item.input_audio_transcription.completed':
          this.emit('transcription', {
            sessionId,
            userId: session.userId,
            transcript: message.transcript,
          });
          break;

        case 'response.audio.delta':
          // Stream audio response back to client
          logger.debug(`Audio delta received for ${sessionId}, length: ${message.delta?.length || 0}`);
          this.emit('audio-response', {
            sessionId,
            userId: session.userId,
            audioData: message.delta, // base64 audio chunk
            type: 'delta',
          });
          break;

        case 'response.audio.done':
          this.emit('audio-response', {
            sessionId,
            userId: session.userId,
            type: 'done',
          });
          break;

        case 'response.text.delta':
          this.emit('text-response', {
            sessionId,
            userId: session.userId,
            textData: message.delta,
            type: 'delta',
          });
          break;

        case 'response.text.done':
          this.emit('text-response', {
            sessionId,
            userId: session.userId,
            text: message.text,
            type: 'done',
          });
          break;

        case 'error':
          logger.error(`OpenAI error for session ${sessionId}:`, message.error);
          this.emit('session-error', {
            sessionId,
            error: message.error.message || 'Unknown OpenAI error',
          });
          break;

        default:
          logger.debug(`Unhandled OpenAI message type: ${message.type}`);
      }
    } catch (error) {
      logger.error('Error handling OpenAI message:', error);
    }
  }

  async endSession(sessionId: string): Promise<boolean> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return false;
      }

      if (session.websocket) {
        session.websocket.close();
      }

      this.sessions.delete(sessionId);
      logger.info(`Ended realtime session: ${sessionId}`);
      
      return true;
    } catch (error) {
      logger.error('Error ending session:', error);
      return false;
    }
  }

  getSessionStatus(sessionId: string): RealtimeSession | null {
    return this.sessions.get(sessionId) || null;
  }

  // Cleanup inactive sessions
  cleanupInactiveSessions(maxInactiveMinutes: number = 30) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - maxInactiveMinutes * 60 * 1000);

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity < cutoff) {
        logger.info(`Cleaning up inactive session: ${sessionId}`);
        this.endSession(sessionId);
      }
    }
  }
}
