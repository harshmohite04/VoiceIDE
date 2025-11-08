import OpenAI from 'openai';
import { VoiceOrchestratorConfig } from '../core/VoiceOrchestrator';
import { ContextManager } from './ContextManager';
import { Logger } from '../utils/Logger';

export class VoiceRecognitionService {
    private openai: OpenAI | undefined;
    private mediaRecorder: MediaRecorder | undefined;
    private audioChunks: Blob[] = [];
    private stream: MediaStream | undefined;
    
    private isInitialized: boolean = false;
    private isListening: boolean = false;
    
    private speechRecognizedCallback?: (text: string) => void;

    constructor(
        private config: VoiceOrchestratorConfig,
        private contextManager: ContextManager
    ) {}

    async initialize(): Promise<void> {
        try {
            Logger.info('Initializing Voice Recognition Service with OpenAI Whisper...');

            if (!this.config.openaiApiKey) {
                throw new Error('OpenAI API key not configured');
            }

            // Initialize OpenAI client
            this.openai = new OpenAI({
                apiKey: this.config.openaiApiKey
            });
            
            // Test the connection
            await this.testConnection();
            
            this.isInitialized = true;
            Logger.info('Voice Recognition Service initialized successfully');
            
        } catch (error) {
            Logger.error('Failed to initialize Voice Recognition Service', error);
            throw error;
        }
    }

    private async testConnection(): Promise<void> {
        try {
            // Test with a minimal API call
            const models = await this.openai!.models.list();
            Logger.debug('OpenAI connection test successful');
        } catch (error) {
            Logger.error('OpenAI connection test failed', error);
            throw new Error('Failed to connect to OpenAI service');
        }
    }

    async startListening(): Promise<void> {
        if (!this.isInitialized || !this.openai) {
            throw new Error('Voice Recognition Service not initialized');
        }

        if (this.isListening) {
            return;
        }

        try {
            Logger.info('Starting voice recording...');
            
            // For VS Code extension environment, we need to use a different approach
            // Since browser APIs are not available, we'll simulate voice input for now
            // and provide instructions to the user
            
            this.isListening = true;
            Logger.info('Voice recording simulation started');
            
            // Show user instruction for now
            const vscode = require('vscode');
            const userInput = await vscode.window.showInputBox({
                prompt: 'Voice input simulation - Type your voice command:',
                placeHolder: 'e.g., "Create a React component for user login"'
            });
            
            if (userInput && userInput.trim()) {
                Logger.info(`Simulated voice input: ${userInput}`);
                this.handleRecognizedSpeech(userInput.trim());
            }
            
            this.isListening = false;
            
        } catch (error) {
            Logger.error('Failed to start listening', error);
            this.isListening = false;
            throw error;
        }
    }

    async stopListening(): Promise<void> {
        if (!this.isListening) {
            return;
        }

        try {
            Logger.info('Stopping voice recording...');
            this.isListening = false;
            Logger.info('Voice recording stopped successfully');
            
        } catch (error) {
            Logger.error('Failed to stop listening', error);
            throw error;
        }
    }

    private async processAudioChunks(): Promise<void> {
        // This method is no longer needed in the current implementation
        // but keeping it for potential future use with actual audio processing
        Logger.debug('processAudioChunks called - currently not implemented');
    }

    async speak(text: string): Promise<void> {
        if (!this.isInitialized || !this.openai) {
            Logger.warn('Cannot speak: Voice Recognition Service not initialized');
            return;
        }

        try {
            Logger.info(`Speaking text: ${text.substring(0, 50)}...`);
            
            // For VS Code extension environment, we'll show the response instead of speaking
            // In a real implementation, you'd need to use a different approach for audio playback
            const vscode = require('vscode');
            
            // Show the AI response in an information message
            vscode.window.showInformationMessage(`AI Response: ${text}`, 'OK');
            
            Logger.debug('Speech synthesis simulated - text shown to user');
            
        } catch (error) {
            Logger.error('Failed to speak text', error);
            throw error;
        }
    }

    onSpeechRecognized(callback: (text: string) => void): void {
        this.speechRecognizedCallback = callback;
    }

    private handleRecognizedSpeech(text: string): void {
        try {
            this.contextManager.addRecentAction(`Voice input: ${text}`);
            
            if (this.speechRecognizedCallback) {
                this.speechRecognizedCallback(text);
            }
        } catch (error) {
            Logger.error('Failed to handle recognized speech', error);
        }
    }

    private isValidSpeechInput(text: string): boolean {
        const trimmedText = text.trim().toLowerCase();
        
        // Filter out very short inputs
        if (trimmedText.length < 3) {
            return false;
        }
        
        // Filter out common noise words
        const noiseWords = ['um', 'uh', 'hmm', 'ah', 'oh', 'okay', 'ok'];
        if (noiseWords.includes(trimmedText)) {
            return false;
        }
        
        // Filter out single character inputs
        if (trimmedText.length === 1) {
            return false;
        }
        
        return true;
    }

    getStatus(): { isInitialized: boolean; isListening: boolean } {
        return {
            isInitialized: this.isInitialized,
            isListening: this.isListening
        };
    }

    dispose(): void {
        Logger.info('Disposing Voice Recognition Service...');
        
        if (this.isListening) {
            this.stopListening();
        }
        
        this.mediaRecorder = undefined;
        this.audioChunks = [];
        this.stream = undefined;
        this.openai = undefined;
        this.isInitialized = false;
        
        Logger.info('Voice Recognition Service disposed');
    }
}
