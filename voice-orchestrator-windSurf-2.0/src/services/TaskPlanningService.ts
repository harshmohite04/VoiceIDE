import { AIConversationService } from './AIConversationService';
import { IDEIntegrationService, TaskPlan, TaskStep } from './IDEIntegrationService';
import { Logger } from '../utils/Logger';
import { v4 as uuidv4 } from 'uuid';

export class TaskPlanningService {
    private taskPlanCallback?: (plan: TaskPlan) => void;

    constructor(
        private aiConversation: AIConversationService,
        private ideIntegration: IDEIntegrationService
    ) {}

    async createTaskPlan(userInput: string, aiResponse: string): Promise<TaskPlan> {
        try {
            Logger.info('Creating task plan from user input and AI response');

            // Use AI to analyze and create a structured task plan
            const planningPrompt = this.buildPlanningPrompt(userInput, aiResponse);
            const planResponse = await this.aiConversation.askQuestion(planningPrompt);

            // Parse the AI response into a structured task plan
            const taskPlan = this.parseTaskPlan(planResponse, userInput);

            // Trigger callback if set
            if (this.taskPlanCallback) {
                this.taskPlanCallback(taskPlan);
            }

            Logger.info(`Task plan created: ${taskPlan.title}`);
            return taskPlan;

        } catch (error) {
            Logger.error('Failed to create task plan', error);
            throw error;
        }
    }

    async breakDownComplexTask(task: string): Promise<TaskPlan> {
        try {
            Logger.info(`Breaking down complex task: ${task}`);

            const breakdownPrompt = `Break down this complex coding task into specific, actionable steps:
            
            Task: ${task}
            
            Please provide:
            1. A clear title for the task
            2. A brief description
            3. A list of specific steps with actions
            4. Estimated time if possible
            
            Format your response as a structured plan with clear steps that can be executed in an IDE.`;

            const response = await this.aiConversation.askQuestion(breakdownPrompt);
            const taskPlan = this.parseTaskPlan(response, task);

            Logger.info(`Complex task broken down into ${taskPlan.steps.length} steps`);
            return taskPlan;

        } catch (error) {
            Logger.error('Failed to break down complex task', error);
            throw error;
        }
    }

    onTaskPlan(callback: (plan: TaskPlan) => void): void {
        this.taskPlanCallback = callback;
    }

    private buildPlanningPrompt(userInput: string, aiResponse: string): string {
        return `Based on the user's request and the AI response, create a detailed task plan.

        User Request: ${userInput}
        AI Response: ${aiResponse}

        Please create a structured task plan with:
        1. A clear, concise title
        2. A brief description of what will be accomplished
        3. Specific, actionable steps
        4. For each step, specify the action type:
           - create_file: Create a new file
           - edit_file: Modify an existing file
           - run_command: Execute a terminal command
           - show_message: Display information to the user
           - ask_question: Ask the user for input

        Format your response as a JSON-like structure that can be parsed into executable steps.
        Focus on practical, implementable actions that can be performed in an IDE environment.`;
    }

    private parseTaskPlan(planResponse: string, originalInput: string): TaskPlan {
        try {
            // Try to extract structured information from the AI response
            const taskPlan: TaskPlan = {
                id: uuidv4(),
                title: this.extractTitle(planResponse, originalInput),
                description: this.extractDescription(planResponse),
                steps: this.extractSteps(planResponse),
                estimatedTime: this.extractEstimatedTime(planResponse)
            };

            return taskPlan;

        } catch (error) {
            Logger.error('Failed to parse task plan, creating fallback plan', error);
            return this.createFallbackTaskPlan(planResponse, originalInput);
        }
    }

    private extractTitle(response: string, fallback: string): string {
        // Look for title patterns
        const titlePatterns = [
            /title:\s*(.+)/i,
            /^#\s*(.+)/m,
            /task:\s*(.+)/i
        ];

        for (const pattern of titlePatterns) {
            const match = response.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        // Fallback: use first line or create from input
        const firstLine = response.split('\n')[0].trim();
        if (firstLine.length > 5 && firstLine.length < 100) {
            return firstLine;
        }

        return `Task: ${fallback.substring(0, 50)}...`;
    }

    private extractDescription(response: string): string {
        // Look for description patterns
        const descriptionPatterns = [
            /description:\s*(.+)/i,
            /overview:\s*(.+)/i,
            /summary:\s*(.+)/i
        ];

        for (const pattern of descriptionPatterns) {
            const match = response.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        // Fallback: use first paragraph
        const paragraphs = response.split('\n\n');
        if (paragraphs.length > 1) {
            return paragraphs[1].trim().substring(0, 200);
        }

        return response.substring(0, 200).trim();
    }

    private extractSteps(response: string): TaskStep[] {
        const steps: TaskStep[] = [];

        // Look for numbered steps
        const stepPattern = /(\d+)\.\s*(.+)/g;
        let match;
        let stepIndex = 0;

        while ((match = stepPattern.exec(response)) !== null) {
            const stepDescription = match[2].trim();
            const step: TaskStep = {
                id: uuidv4(),
                description: stepDescription,
                action: this.determineStepAction(stepDescription),
                parameters: this.extractStepParameters(stepDescription)
            };

            steps.push(step);
            stepIndex++;
        }

        // If no numbered steps found, try bullet points
        if (steps.length === 0) {
            const bulletPattern = /[-*]\s*(.+)/g;
            while ((match = bulletPattern.exec(response)) !== null) {
                const stepDescription = match[1].trim();
                const step: TaskStep = {
                    id: uuidv4(),
                    description: stepDescription,
                    action: this.determineStepAction(stepDescription),
                    parameters: this.extractStepParameters(stepDescription)
                };

                steps.push(step);
            }
        }

        // If still no steps, create a single step
        if (steps.length === 0) {
            steps.push({
                id: uuidv4(),
                description: 'Execute the planned task',
                action: 'show_message',
                parameters: { message: response }
            });
        }

        return steps;
    }

    private determineStepAction(stepDescription: string): TaskStep['action'] {
        const desc = stepDescription.toLowerCase();

        if (desc.includes('create') && (desc.includes('file') || desc.includes('component'))) {
            return 'create_file';
        }
        if (desc.includes('edit') || desc.includes('modify') || desc.includes('update')) {
            return 'edit_file';
        }
        if (desc.includes('run') || desc.includes('execute') || desc.includes('command')) {
            return 'run_command';
        }
        if (desc.includes('ask') || desc.includes('input') || desc.includes('question')) {
            return 'ask_question';
        }

        return 'show_message';
    }

    private extractStepParameters(stepDescription: string): any {
        const desc = stepDescription.toLowerCase();
        const parameters: any = {};

        // Extract file paths
        const filePathPattern = /(?:file|path):\s*([^\s,]+)/i;
        const fileMatch = stepDescription.match(filePathPattern);
        if (fileMatch) {
            parameters.filePath = fileMatch[1];
        }

        // Extract commands
        const commandPattern = /(?:command|run):\s*`([^`]+)`/i;
        const commandMatch = stepDescription.match(commandPattern);
        if (commandMatch) {
            parameters.command = commandMatch[1];
        }

        // Extract questions
        const questionPattern = /(?:ask|question):\s*"([^"]+)"/i;
        const questionMatch = stepDescription.match(questionPattern);
        if (questionMatch) {
            parameters.question = questionMatch[1];
        }

        // Default message parameter
        if (Object.keys(parameters).length === 0) {
            parameters.message = stepDescription;
        }

        return parameters;
    }

    private extractEstimatedTime(response: string): string | undefined {
        const timePatterns = [
            /estimated time:\s*(.+)/i,
            /time:\s*(.+)/i,
            /duration:\s*(.+)/i
        ];

        for (const pattern of timePatterns) {
            const match = response.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return undefined;
    }

    private createFallbackTaskPlan(response: string, originalInput: string): TaskPlan {
        return {
            id: uuidv4(),
            title: `Task: ${originalInput.substring(0, 50)}...`,
            description: response.substring(0, 200),
            steps: [{
                id: uuidv4(),
                description: 'Review and execute the planned task',
                action: 'show_message',
                parameters: { message: response }
            }]
        };
    }

    dispose(): void {
        Logger.info('Disposing Task Planning Service...');
        this.taskPlanCallback = undefined;
        Logger.info('Task Planning Service disposed');
    }
}
