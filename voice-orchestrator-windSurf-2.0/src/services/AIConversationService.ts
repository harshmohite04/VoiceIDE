import OpenAI from 'openai';
import { VoiceOrchestratorConfig } from '../core/VoiceOrchestrator';
import { ContextManager } from './ContextManager';
import { Logger } from '../utils/Logger';

export interface AIResponse {
    content: string;
    requiresAction?: boolean;
    actionType?: 'code_generation' | 'file_operation' | 'task_planning' | 'question';
    metadata?: any;
}

export class AIConversationService {
    private openai: OpenAI | undefined;
    private isInitialized: boolean = false;
    private responseCallback?: (response: string) => void;

    constructor(
        private config: VoiceOrchestratorConfig,
        private contextManager: ContextManager
    ) {}

    async initialize(): Promise<void> {
        try {
            Logger.info('Initializing AI Conversation Service...');

            if (!this.config.openaiApiKey) {
                throw new Error('OpenAI API key not configured');
            }

            this.openai = new OpenAI({
                apiKey: this.config.openaiApiKey
            });

            // Test the connection
            await this.testConnection();

            this.isInitialized = true;
            Logger.info('AI Conversation Service initialized successfully');

        } catch (error) {
            Logger.error('Failed to initialize AI Conversation Service', error);
            throw error;
        }
    }

    async processInput(userInput: string): Promise<AIResponse> {
        if (!this.isInitialized || !this.openai) {
            throw new Error('AI Conversation Service not initialized');
        }

        try {
            Logger.info(`Processing user input: ${userInput.substring(0, 50)}...`);

            // Add user input to context
            this.contextManager.addVoiceInput(userInput);

            // Prepare the conversation context
            const systemPrompt = this.buildSystemPrompt();
            const conversationHistory = this.buildConversationHistory();

            // Make the API call
            const completion = await this.openai.chat.completions.create({
                model: this.config.aiModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...conversationHistory,
                    { role: 'user', content: userInput }
                ],
                temperature: 0.7,
                max_tokens: 1000
            });

            const responseContent = completion.choices[0]?.message?.content || '';
            
            if (!responseContent) {
                throw new Error('Empty response from AI service');
            }

            // Add AI response to context
            this.contextManager.addAIResponse(responseContent);

            // Analyze the response for action requirements
            const aiResponse = this.analyzeResponse(responseContent);

            // Trigger callback if set
            if (this.responseCallback) {
                this.responseCallback(responseContent);
            }

            Logger.info('AI response processed successfully');
            return aiResponse;

        } catch (error) {
            Logger.error('Failed to process user input', error);
            throw error;
        }
    }

    async askQuestion(question: string, context?: string): Promise<string> {
        if (!this.isInitialized || !this.openai) {
            throw new Error('AI Conversation Service not initialized');
        }

        try {
            const systemPrompt = `You are a helpful coding assistant. Answer the following question concisely and accurately.
            ${context ? `Context: ${context}` : ''}`;

            const completion = await this.openai.chat.completions.create({
                model: this.config.aiModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: question }
                ],
                temperature: 0.5,
                max_tokens: 500
            });

            return completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

        } catch (error) {
            Logger.error('Failed to ask question', error);
            throw error;
        }
    }

    onResponse(callback: (response: string) => void): void {
        this.responseCallback = callback;
    }

    private buildSystemPrompt(): string {
        const workspaceContext = this.contextManager.getWorkspaceContext();
        
        return `You are Jarvis, a voice-powered AI assistant for code editors like Windsurf and Cursor. 
        You help developers by:
        1. Discussing code and providing explanations
        2. Planning and breaking down coding tasks
        3. Generating code snippets and solutions
        4. Answering questions about the codebase
        5. Providing guidance on best practices

        Current workspace context:
        ${workspaceContext}

        Guidelines:
        - Be conversational and helpful, like a pair programming partner
        - When asked to create or modify code, provide clear, working solutions
        - Break down complex tasks into manageable steps
        - Ask clarifying questions when needed
        - Keep responses concise but informative
        - If you need to perform actions in the IDE, clearly state what you plan to do
        - Always consider the current file and selection context when relevant

        Remember: You can see the current workspace, files, and recent actions. Use this context to provide relevant assistance.`;
    }

    private buildConversationHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
        const recentMessages = this.contextManager.getRecentMessages(10);
        return recentMessages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }

    private analyzeResponse(response: string): AIResponse {
        const aiResponse: AIResponse = {
            content: response
        };

        // Check if response contains code blocks
        if (response.includes('```')) {
            aiResponse.requiresAction = true;
            aiResponse.actionType = 'code_generation';
        }

        // Check for task planning keywords
        const taskPlanningKeywords = ['step 1', 'first,', 'then,', 'next,', 'finally', 'plan:', 'steps:'];
        if (taskPlanningKeywords.some(keyword => response.toLowerCase().includes(keyword))) {
            aiResponse.requiresAction = true;
            aiResponse.actionType = 'task_planning';
        }

        // Check for file operations
        const fileOperationKeywords = ['create file', 'save to', 'write to', 'modify file', 'update file'];
        if (fileOperationKeywords.some(keyword => response.toLowerCase().includes(keyword))) {
            aiResponse.requiresAction = true;
            aiResponse.actionType = 'file_operation';
        }

        // Check for questions
        if (response.includes('?') && response.split('?').length > 2) {
            aiResponse.actionType = 'question';
        }

        return aiResponse;
    }

    private async testConnection(): Promise<void> {
        try {
            await this.openai!.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 5
            });
            Logger.debug('OpenAI connection test successful');
        } catch (error) {
            Logger.error('OpenAI connection test failed', error);
            throw new Error('Failed to connect to OpenAI service');
        }
    }

    getStatus(): { isInitialized: boolean } {
        return {
            isInitialized: this.isInitialized
        };
    }

    dispose(): void {
        Logger.info('Disposing AI Conversation Service...');
        this.isInitialized = false;
        this.openai = undefined;
        this.responseCallback = undefined;
        Logger.info('AI Conversation Service disposed');
    }
}
