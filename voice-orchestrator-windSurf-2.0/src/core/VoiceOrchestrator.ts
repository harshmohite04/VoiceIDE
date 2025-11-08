import * as vscode from 'vscode';
import { VoiceRecognitionService } from '../services/VoiceRecognitionService';
import { AIConversationService } from '../services/AIConversationService';
import { IDEIntegrationService } from '../services/IDEIntegrationService';
import { TaskPlanningService } from '../services/TaskPlanningService';
import { ContextManager } from '../services/ContextManager';
import { Logger } from '../utils/Logger';

export interface VoiceOrchestratorConfig {
    openaiApiKey: string;
    voiceLanguage: string;
    aiModel: string;
}

export class VoiceOrchestrator {
    private voiceRecognition: VoiceRecognitionService;
    private aiConversation: AIConversationService;
    private ideIntegration: IDEIntegrationService;
    private taskPlanning: TaskPlanningService;
    private contextManager: ContextManager;
    
    private isListening: boolean = false;
    private isMuted: boolean = false;
    private statusBarItem: vscode.StatusBarItem;

    constructor(private context: vscode.ExtensionContext) {
        // Initialize status bar
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'voiceOrchestrator.toggleMute';
        this.updateStatusBar();
        
        // Get configuration
        const config = this.getConfiguration();
        
        // Initialize services
        this.contextManager = new ContextManager();
        this.voiceRecognition = new VoiceRecognitionService(config, this.contextManager);
        this.aiConversation = new AIConversationService(config, this.contextManager);
        this.ideIntegration = new IDEIntegrationService(this.contextManager);
        this.taskPlanning = new TaskPlanningService(this.aiConversation, this.ideIntegration);
        
        // Setup event handlers
        this.setupEventHandlers();
    }

    async initialize(): Promise<void> {
        try {
            Logger.info('Initializing Voice Orchestrator...');
            
            // Check configuration first
            const config = this.getConfiguration();
            if (!config.openaiApiKey) {
                const message = 'OpenAI API key is required. Please configure it in VS Code settings.';
                Logger.error(message);
                vscode.window.showErrorMessage(message, 'Open Settings').then(selection => {
                    if (selection === 'Open Settings') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'voiceOrchestrator.openaiApiKey');
                    }
                });
                return; // Don't throw, just return without initializing
            }
            
            await this.voiceRecognition.initialize();
            await this.aiConversation.initialize();
            await this.ideIntegration.initialize();
            
            this.statusBarItem.show();
            
            Logger.info('Voice Orchestrator initialized successfully');
        } catch (error) {
            Logger.error('Failed to initialize Voice Orchestrator', error);
            
            let errorMessage = 'Failed to initialize Voice Orchestrator';
            if (error instanceof Error) {
                if (error.message.includes('API key')) {
                    errorMessage = 'Invalid OpenAI API key. Please check your configuration.';
                } else if (error.message.includes('network') || error.message.includes('connect')) {
                    errorMessage = 'Network error. Please check your internet connection.';
                } else {
                    errorMessage = `Initialization failed: ${error.message}`;
                }
            }
            
            vscode.window.showErrorMessage(errorMessage, 'Open Settings', 'Retry').then(selection => {
                if (selection === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'voiceOrchestrator');
                } else if (selection === 'Retry') {
                    this.initialize();
                }
            });
        }
    }

    async startListening(): Promise<void> {
        if (this.isListening || this.isMuted) {
            return;
        }

        try {
            Logger.info('Starting voice listening...');
            
            // Check if services are initialized
            const voiceStatus = this.voiceRecognition.getStatus();
            if (!voiceStatus.isInitialized) {
                throw new Error('Voice Recognition Service not initialized. Please check your OpenAI API key configuration.');
            }
            
            this.isListening = true;
            this.updateStatusBar();
            
            await this.voiceRecognition.startListening();
            
            vscode.window.showInformationMessage('Voice Assistant is now listening...');
        } catch (error) {
            Logger.error('Failed to start voice listening', error);
            this.isListening = false;
            this.updateStatusBar();
            
            // Provide more specific error messages
            let errorMessage = 'Failed to start voice listening';
            if (error instanceof Error) {
                if (error.message.includes('OpenAI API key')) {
                    errorMessage = 'OpenAI API key not configured. Please set it in VS Code settings.';
                } else if (error.message.includes('not initialized')) {
                    errorMessage = 'Voice service not initialized. Please reload the window and try again.';
                } else {
                    errorMessage = `Failed to start voice listening: ${error.message}`;
                }
            }
            
            vscode.window.showErrorMessage(errorMessage, 'Open Settings', 'Reload Window').then(selection => {
                if (selection === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'voiceOrchestrator');
                } else if (selection === 'Reload Window') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        }
    }

    async stopListening(): Promise<void> {
        if (!this.isListening) {
            return;
        }

        try {
            Logger.info('Stopping voice listening...');
            this.isListening = false;
            this.updateStatusBar();
            
            await this.voiceRecognition.stopListening();
            
            vscode.window.showInformationMessage('Voice Assistant stopped listening');
        } catch (error) {
            Logger.error('Failed to stop voice listening', error);
        }
    }

    toggleMute(): void {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted && this.isListening) {
            this.stopListening();
        }
        
        this.updateStatusBar();
        
        const message = this.isMuted ? 'Voice Assistant muted' : 'Voice Assistant unmuted';
        vscode.window.showInformationMessage(message);
    }

    private setupEventHandlers(): void {
        // Handle voice input
        this.voiceRecognition.onSpeechRecognized((text: string) => {
            this.handleVoiceInput(text);
        });

        // Handle AI responses
        this.aiConversation.onResponse((response: string) => {
            this.handleAIResponse(response);
        });

        // Handle task planning results
        this.taskPlanning.onTaskPlan((plan: any) => {
            this.handleTaskPlan(plan);
        });

        // Handle workspace changes
        vscode.workspace.onDidChangeTextDocument((event) => {
            this.contextManager.updateDocumentContext(event.document);
        });

        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                this.contextManager.updateActiveEditor(editor);
            }
        });
    }

    private async handleVoiceInput(text: string): Promise<void> {
        try {
            Logger.info(`Voice input received: ${text}`);
            
            // Update context with voice input
            this.contextManager.addVoiceInput(text);
            
            // Send to AI for processing
            const response = await this.aiConversation.processInput(text);
            
            // Check if this requires task planning
            if (this.shouldPlanTask(text, response.content)) {
                await this.taskPlanning.createTaskPlan(text, response.content);
            }
            
        } catch (error) {
            Logger.error('Failed to handle voice input', error);
        }
    }

    private async handleAIResponse(response: string): Promise<void> {
        try {
            Logger.info(`AI response: ${response}`);
            
            // Speak the response if TTS is enabled
            await this.voiceRecognition.speak(response);
            
            // Show response in IDE if needed
            if (this.shouldShowInIDE(response)) {
                await this.ideIntegration.showResponse(response);
            }
            
        } catch (error) {
            Logger.error('Failed to handle AI response', error);
        }
    }

    private async handleTaskPlan(plan: any): Promise<void> {
        try {
            Logger.info('Task plan received', plan);
            
            // Execute the task plan through IDE integration
            await this.ideIntegration.executeTaskPlan(plan);
            
        } catch (error) {
            Logger.error('Failed to handle task plan', error);
        }
    }

    private shouldPlanTask(input: string, response: string): boolean {
        // Simple heuristics to determine if task planning is needed
        const taskKeywords = ['create', 'build', 'implement', 'fix', 'refactor', 'add', 'remove', 'update'];
        const inputLower = input.toLowerCase();
        
        return taskKeywords.some(keyword => inputLower.includes(keyword));
    }

    private shouldShowInIDE(response: string): boolean {
        // Determine if response should be shown in IDE
        return response.includes('```') || response.length > 200;
    }

    private getConfiguration(): VoiceOrchestratorConfig {
        const config = vscode.workspace.getConfiguration('voiceOrchestrator');
        
        return {
            openaiApiKey: config.get('openaiApiKey') || process.env.OPENAI_API_KEY || '',
            voiceLanguage: config.get('voiceLanguage') || 'en-US',
            aiModel: config.get('aiModel') || 'gpt-4'
        };
    }

    private updateStatusBar(): void {
        if (this.isMuted) {
            this.statusBarItem.text = '$(mute) Voice Assistant (Muted)';
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else if (this.isListening) {
            this.statusBarItem.text = '$(mic) Voice Assistant (Listening)';
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
        } else {
            this.statusBarItem.text = '$(mic-off) Voice Assistant (Idle)';
            this.statusBarItem.backgroundColor = undefined;
        }
    }

    dispose(): void {
        Logger.info('Disposing Voice Orchestrator...');
        
        this.stopListening();
        this.statusBarItem.dispose();
        
        this.voiceRecognition?.dispose();
        this.aiConversation?.dispose();
        this.ideIntegration?.dispose();
        this.taskPlanning?.dispose();
        this.contextManager?.dispose();
        
        Logger.info('Voice Orchestrator disposed');
    }
}
