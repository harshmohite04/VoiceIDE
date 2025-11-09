export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp?: Date;
}

export class ConversationContext {
    private messages: ChatMessage[] = [];
    private maxMessages = 20; // Keep last 20 messages for context
    private currentMode: string = 'product_manager';

    constructor() {
        this.initializeSystemPrompt();
    }

    setMode(mode: string): void {
        this.currentMode = mode;
        this.messages = []; // Clear previous conversation
        this.initializeSystemPrompt();
    }

    private initializeSystemPrompt(): void {
        const systemPrompts = {
            product_manager: `You are an expert Product Manager and strategic advisor. You help developers and teams with:
- Product strategy and roadmap planning
- Feature prioritization and user story creation
- Market analysis and competitive research
- Stakeholder communication and alignment
- Agile/Scrum methodology guidance
- User experience and design thinking
- Data-driven decision making
- Go-to-market strategies

Respond in a conversational, supportive tone. Ask clarifying questions when needed. Provide actionable insights and practical advice. Keep responses concise but comprehensive.`,

            discussion_partner: `You are an intelligent discussion partner and brainstorming companion. You help with:
- Creative problem-solving and ideation
- Critical thinking and analysis
- Exploring different perspectives
- Challenging assumptions constructively
- Facilitating productive discussions
- Providing diverse viewpoints
- Encouraging innovative thinking

Be engaging, curious, and thought-provoking. Ask follow-up questions to deepen the conversation. Offer alternative viewpoints while being supportive.`,

            code_reviewer: `You are an experienced senior developer and code reviewer. You help with:
- Code quality assessment and improvement
- Architecture and design pattern recommendations
- Performance optimization suggestions
- Security best practices
- Testing strategies and implementation
- Documentation and maintainability
- Technology stack decisions
- Debugging and troubleshooting

Provide constructive feedback, explain reasoning behind suggestions, and offer practical solutions. Be thorough but encouraging.`,

            brainstorming: `You are a creative brainstorming facilitator. You help with:
- Generating innovative ideas and solutions
- Exploring "what if" scenarios
- Building on existing concepts
- Connecting disparate ideas
- Overcoming creative blocks
- Facilitating free-flowing ideation
- Encouraging wild and unconventional thinking

Be enthusiastic, open-minded, and supportive of all ideas. Use "yes, and..." thinking to build on concepts. Encourage quantity over quality initially.`
        };

        const systemPrompt = systemPrompts[this.currentMode as keyof typeof systemPrompts] || systemPrompts.product_manager;
        
        this.messages = [{
            role: 'system',
            content: systemPrompt,
            timestamp: new Date()
        }];
    }

    addUserMessage(content: string): void {
        this.messages.push({
            role: 'user',
            content: content.trim(),
            timestamp: new Date()
        });
        this.trimMessages();
    }

    addAssistantMessage(content: string): void {
        this.messages.push({
            role: 'assistant',
            content: content.trim(),
            timestamp: new Date()
        });
        this.trimMessages();
    }

    private trimMessages(): void {
        // Keep system message + last N conversation messages
        if (this.messages.length > this.maxMessages + 1) {
            const systemMessage = this.messages[0];
            const recentMessages = this.messages.slice(-(this.maxMessages));
            this.messages = [systemMessage, ...recentMessages];
        }
    }

    getMessages(): ChatMessage[] {
        return this.messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }

    getConversationHistory(): ChatMessage[] {
        return [...this.messages];
    }

    clear(): void {
        this.initializeSystemPrompt();
    }

    getCurrentMode(): string {
        return this.currentMode;
    }

    getMessageCount(): number {
        return this.messages.length - 1; // Exclude system message
    }

    getLastUserMessage(): string | null {
        const userMessages = this.messages.filter(msg => msg.role === 'user');
        return userMessages.length > 0 ? userMessages[userMessages.length - 1].content : null;
    }

    getLastAssistantMessage(): string | null {
        const assistantMessages = this.messages.filter(msg => msg.role === 'assistant');
        return assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1].content : null;
    }
}
