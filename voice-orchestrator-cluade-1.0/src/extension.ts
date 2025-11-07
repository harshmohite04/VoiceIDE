// extension.ts - Main entry point for VSCode extension
import * as vscode from 'vscode';

// Task representation
interface Task {
    id: string;
    step: number;
    action: string;
    prompt: string;
    status: 'pending' | 'executing' | 'completed' | 'failed';
    result?: string;
}

interface TaskPlan {
    taskId: string;
    originalIntent: string;
    steps: Task[];
    currentStep: number;
    status: 'idle' | 'planning' | 'executing' | 'completed';
}

class VoiceTaskOrchestrator {
    private currentPlan: TaskPlan | null = null;
    private statusBarItem: vscode.StatusBarItem;
    private outputChannel: vscode.OutputChannel;

    constructor(private context: vscode.ExtensionContext) {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right, 
            100
        );
        this.outputChannel = vscode.window.createOutputChannel('Voice Task Planner');
        this.statusBarItem.text = "$(mic) Voice Task Planner";
        this.statusBarItem.command = 'voiceTaskPlanner.startListening';
        this.statusBarItem.show();
    }

    // Step 1: Capture voice input
    async startVoiceInput(): Promise<string> {
        // For now, we'll use text input (voice integration comes next)
        const input = await vscode.window.showInputBox({
            prompt: 'What would you like me to do? (Voice input coming soon)',
            placeHolder: 'e.g., Fix the login bug and add tests'
        });
        
        return input || '';
    }

    // Step 2: Break down the task into steps
    async planTask(userIntent: string): Promise<TaskPlan> {
        this.outputChannel.appendLine(`🎯 Planning task: ${userIntent}`);
        this.statusBarItem.text = "$(loading~spin) Planning...";

        // This will use AI to break down the task
        // For now, here's the structure:
        const steps = await this.decomposeTask(userIntent);

        const plan: TaskPlan = {
            taskId: `task_${Date.now()}`,
            originalIntent: userIntent,
            steps: steps,
            currentStep: 0,
            status: 'planning'
        };

        this.currentPlan = plan;
        return plan;
    }

    // Step 3: Decompose task into atomic steps
    private async decomposeTask(intent: string): Promise<Task[]> {
        // This is where we'll use AI to intelligently break down tasks
        // For now, here's a template-based approach:
        
        const keywords = intent.toLowerCase();
        const steps: Task[] = [];
        let stepNumber = 1;

        // Pattern matching (will be replaced with AI)
        if (keywords.includes('fix') || keywords.includes('bug')) {
            steps.push({
                id: `step_${stepNumber}`,
                step: stepNumber++,
                action: 'analyze',
                prompt: `Analyze the codebase to identify the issue related to: ${intent}`,
                status: 'pending'
            });

            steps.push({
                id: `step_${stepNumber}`,
                step: stepNumber++,
                action: 'fix',
                prompt: `Fix the identified issue`,
                status: 'pending'
            });
        }

        if (keywords.includes('test')) {
            steps.push({
                id: `step_${stepNumber}`,
                step: stepNumber++,
                action: 'test',
                prompt: `Write comprehensive tests for the changes`,
                status: 'pending'
            });
        }

        if (keywords.includes('document') || keywords.includes('docs')) {
            steps.push({
                id: `step_${stepNumber}`,
                step: stepNumber++,
                action: 'document',
                prompt: `Update documentation to reflect the changes`,
                status: 'pending'
            });
        }

        // Always add validation
        steps.push({
            id: `step_${stepNumber}`,
            step: stepNumber++,
            action: 'verify',
            prompt: `Verify all changes work correctly and run tests`,
            status: 'pending'
        });

        return steps;
    }

    // Step 4: Execute steps one by one
    async executeTask() {
        if (!this.currentPlan) return;

        this.currentPlan.status = 'executing';
        this.outputChannel.appendLine(`\n🚀 Starting execution of ${this.currentPlan.steps.length} steps`);

        for (let i = 0; i < this.currentPlan.steps.length; i++) {
            const step = this.currentPlan.steps[i];
            this.currentPlan.currentStep = i;

            this.outputChannel.appendLine(`\n📍 Step ${step.step}/${this.currentPlan.steps.length}: ${step.action}`);
            this.statusBarItem.text = `$(loading~spin) Step ${step.step}/${this.currentPlan.steps.length}`;

            step.status = 'executing';

            // Send prompt to Cursor/Windsurf
            await this.sendToCursorAI(step.prompt);

            // Wait for user confirmation (automated detection comes later)
            const result = await vscode.window.showInformationMessage(
                `Step ${step.step}: ${step.action} - Is this step complete?`,
                'Yes, Continue',
                'No, Retry',
                'Cancel'
            );

            if (result === 'Yes, Continue') {
                step.status = 'completed';
                this.outputChannel.appendLine(`✅ Step ${step.step} completed`);
            } else if (result === 'No, Retry') {
                i--; // Retry this step
                step.status = 'pending';
            } else {
                step.status = 'failed';
                this.outputChannel.appendLine(`❌ Task cancelled at step ${step.step}`);
                break;
            }
        }

        this.currentPlan.status = 'completed';
        this.statusBarItem.text = "$(check) Task Complete";
        this.outputChannel.appendLine(`\n✨ All steps completed!`);
    }

    // Step 5: Send prompt to Cursor/Windsurf AI
    private async sendToCursorAI(prompt: string) {
        // Method 1: Use Cursor's composer command if available
        try {
            await vscode.commands.executeCommand('composer.startComposerChat');
            // Insert the prompt into the chat
            await vscode.env.clipboard.writeText(prompt);
            this.outputChannel.appendLine(`📤 Sent to Cursor AI: ${prompt}`);
            
            // Show notification
            vscode.window.showInformationMessage(
                `Prompt ready in clipboard. Paste into Cursor AI chat.`
            );
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Could not auto-send. Copy this prompt: ${prompt}`);
        }
    }

    // Step 6: Get current status (non-blocking)
    getCurrentStatus(): string {
        if (!this.currentPlan) {
            return "No active task";
        }

        const completed = this.currentPlan.steps.filter(s => s.status === 'completed').length;
        const total = this.currentPlan.steps.length;
        const current = this.currentPlan.steps[this.currentPlan.currentStep];

        return `
Task: ${this.currentPlan.originalIntent}
Progress: ${completed}/${total} steps completed
Current: ${current?.action} - ${current?.prompt}
Status: ${this.currentPlan.status}
        `.trim();
    }

    async showStatus() {
        const status = this.getCurrentStatus();
        this.outputChannel.show();
        this.outputChannel.appendLine(`\n📊 Current Status:\n${status}`);
        vscode.window.showInformationMessage(status);
    }

    dispose() {
        this.statusBarItem.dispose();
        this.outputChannel.dispose();
    }
}

// Extension activation
export function activate(context: vscode.ExtensionContext) {
    console.log('Voice Task Planner is now active!');

    const orchestrator = new VoiceTaskOrchestrator(context);

    // Command: Start listening for voice input
    let startListening = vscode.commands.registerCommand(
        'voiceTaskPlanner.startListening',
        async () => {
            const userIntent = await orchestrator.startVoiceInput();
            if (userIntent) {
                await orchestrator.planTask(userIntent);
                await orchestrator.executeTask();
            }
        }
    );

    // Command: Show current status
    let showStatus = vscode.commands.registerCommand(
        'voiceTaskPlanner.showStatus',
        () => {
            orchestrator.showStatus();
        }
    );

    context.subscriptions.push(startListening);
    context.subscriptions.push(showStatus);
    context.subscriptions.push(orchestrator);
}

export function deactivate() {}