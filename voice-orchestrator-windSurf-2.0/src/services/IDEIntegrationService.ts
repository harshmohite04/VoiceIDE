import * as vscode from 'vscode';
import { ContextManager } from './ContextManager';
import { Logger } from '../utils/Logger';

export interface TaskPlan {
    id: string;
    title: string;
    description: string;
    steps: TaskStep[];
    estimatedTime?: string;
}

export interface TaskStep {
    id: string;
    description: string;
    action: 'create_file' | 'edit_file' | 'run_command' | 'show_message' | 'ask_question';
    parameters: any;
    completed?: boolean;
}

export class IDEIntegrationService {
    private outputChannel: vscode.OutputChannel;
    private isInitialized: boolean = false;

    constructor(private contextManager: ContextManager) {
        this.outputChannel = vscode.window.createOutputChannel('Voice Orchestrator');
    }

    async initialize(): Promise<void> {
        try {
            Logger.info('Initializing IDE Integration Service...');
            
            this.isInitialized = true;
            Logger.info('IDE Integration Service initialized successfully');
            
        } catch (error) {
            Logger.error('Failed to initialize IDE Integration Service', error);
            throw error;
        }
    }

    async showResponse(response: string): Promise<void> {
        try {
            // Show in output channel
            this.outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] AI Response:`);
            this.outputChannel.appendLine(response);
            this.outputChannel.appendLine('---');
            
            // If response contains code, offer to create/insert it
            if (response.includes('```')) {
                await this.handleCodeResponse(response);
            }
            
            // Show notification for important responses
            if (this.isImportantResponse(response)) {
                const action = await vscode.window.showInformationMessage(
                    'Voice Assistant has a response for you',
                    'Show Output',
                    'Dismiss'
                );
                
                if (action === 'Show Output') {
                    this.outputChannel.show();
                }
            }
            
        } catch (error) {
            Logger.error('Failed to show response', error);
        }
    }

    async executeTaskPlan(taskPlan: TaskPlan): Promise<void> {
        try {
            Logger.info(`Executing task plan: ${taskPlan.title}`);
            
            // Show task plan to user
            const executeAction = await vscode.window.showInformationMessage(
                `Execute task plan: ${taskPlan.title}?`,
                { detail: taskPlan.description },
                'Execute',
                'Review Steps',
                'Cancel'
            );
            
            if (executeAction === 'Cancel') {
                return;
            }
            
            if (executeAction === 'Review Steps') {
                await this.showTaskPlanDetails(taskPlan);
                return;
            }
            
            // Execute each step
            for (const step of taskPlan.steps) {
                try {
                    await this.executeTaskStep(step);
                    step.completed = true;
                    this.contextManager.addRecentAction(`Completed: ${step.description}`);
                } catch (error) {
                    Logger.error(`Failed to execute step: ${step.description}`, error);
                    
                    const continueAction = await vscode.window.showErrorMessage(
                        `Failed to execute step: ${step.description}`,
                        'Continue',
                        'Stop'
                    );
                    
                    if (continueAction !== 'Continue') {
                        break;
                    }
                }
            }
            
            vscode.window.showInformationMessage(`Task plan "${taskPlan.title}" completed!`);
            
        } catch (error) {
            Logger.error('Failed to execute task plan', error);
            vscode.window.showErrorMessage('Failed to execute task plan');
        }
    }

    async createFile(filePath: string, content: string): Promise<void> {
        try {
            const uri = vscode.Uri.file(filePath);
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(uri, encoder.encode(content));
            
            // Open the created file
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            
            this.contextManager.addRecentAction(`Created file: ${filePath}`);
            Logger.info(`Created file: ${filePath}`);
            
        } catch (error) {
            Logger.error(`Failed to create file: ${filePath}`, error);
            throw error;
        }
    }

    async editFile(filePath: string, changes: Array<{ line: number; content: string }>): Promise<void> {
        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document);
            
            await editor.edit(editBuilder => {
                changes.forEach(change => {
                    const line = document.lineAt(change.line);
                    editBuilder.replace(line.range, change.content);
                });
            });
            
            this.contextManager.addRecentAction(`Edited file: ${filePath}`);
            Logger.info(`Edited file: ${filePath}`);
            
        } catch (error) {
            Logger.error(`Failed to edit file: ${filePath}`, error);
            throw error;
        }
    }

    async insertCodeAtCursor(code: string): Promise<void> {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor to insert code');
                return;
            }
            
            await editor.edit(editBuilder => {
                editBuilder.insert(editor.selection.active, code);
            });
            
            this.contextManager.addRecentAction('Inserted code at cursor');
            Logger.info('Inserted code at cursor');
            
        } catch (error) {
            Logger.error('Failed to insert code at cursor', error);
            throw error;
        }
    }

    async runCommand(command: string): Promise<void> {
        try {
            const terminal = vscode.window.createTerminal('Voice Orchestrator');
            terminal.sendText(command);
            terminal.show();
            
            this.contextManager.addRecentAction(`Ran command: ${command}`);
            Logger.info(`Ran command: ${command}`);
            
        } catch (error) {
            Logger.error(`Failed to run command: ${command}`, error);
            throw error;
        }
    }

    private async handleCodeResponse(response: string): Promise<void> {
        const codeBlocks = this.extractCodeBlocks(response);
        
        if (codeBlocks.length === 0) {
            return;
        }
        
        for (const codeBlock of codeBlocks) {
            const action = await vscode.window.showInformationMessage(
                `Found ${codeBlock.language || 'code'} snippet. What would you like to do?`,
                'Insert at Cursor',
                'Create New File',
                'Copy to Clipboard',
                'Skip'
            );
            
            switch (action) {
                case 'Insert at Cursor':
                    await this.insertCodeAtCursor(codeBlock.code);
                    break;
                    
                case 'Create New File':
                    const fileName = await vscode.window.showInputBox({
                        prompt: 'Enter file name',
                        value: `untitled.${this.getFileExtension(codeBlock.language)}`
                    });
                    
                    if (fileName) {
                        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                        if (workspaceFolder) {
                            const filePath = vscode.Uri.joinPath(workspaceFolder.uri, fileName).fsPath;
                            await this.createFile(filePath, codeBlock.code);
                        }
                    }
                    break;
                    
                case 'Copy to Clipboard':
                    await vscode.env.clipboard.writeText(codeBlock.code);
                    vscode.window.showInformationMessage('Code copied to clipboard');
                    break;
            }
        }
    }

    private extractCodeBlocks(text: string): Array<{ language?: string; code: string }> {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        const codeBlocks: Array<{ language?: string; code: string }> = [];
        let match;
        
        while ((match = codeBlockRegex.exec(text)) !== null) {
            codeBlocks.push({
                language: match[1],
                code: match[2].trim()
            });
        }
        
        return codeBlocks;
    }

    private getFileExtension(language?: string): string {
        const extensions: { [key: string]: string } = {
            javascript: 'js',
            typescript: 'ts',
            python: 'py',
            java: 'java',
            csharp: 'cs',
            cpp: 'cpp',
            c: 'c',
            html: 'html',
            css: 'css',
            json: 'json',
            xml: 'xml',
            yaml: 'yml',
            markdown: 'md'
        };
        
        return extensions[language?.toLowerCase() || ''] || 'txt';
    }

    private async executeTaskStep(step: TaskStep): Promise<void> {
        Logger.info(`Executing step: ${step.description}`);
        
        switch (step.action) {
            case 'create_file':
                await this.createFile(step.parameters.filePath, step.parameters.content);
                break;
                
            case 'edit_file':
                await this.editFile(step.parameters.filePath, step.parameters.changes);
                break;
                
            case 'run_command':
                await this.runCommand(step.parameters.command);
                break;
                
            case 'show_message':
                vscode.window.showInformationMessage(step.parameters.message);
                break;
                
            case 'ask_question':
                const answer = await vscode.window.showInputBox({
                    prompt: step.parameters.question
                });
                step.parameters.answer = answer;
                break;
                
            default:
                Logger.warn(`Unknown step action: ${step.action}`);
        }
    }

    private async showTaskPlanDetails(taskPlan: TaskPlan): Promise<void> {
        const stepsText = taskPlan.steps
            .map((step, index) => `${index + 1}. ${step.description}`)
            .join('\n');
        
        const content = `# Task Plan: ${taskPlan.title}\n\n${taskPlan.description}\n\n## Steps:\n${stepsText}`;
        
        const document = await vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        });
        
        await vscode.window.showTextDocument(document);
    }

    private isImportantResponse(response: string): boolean {
        const importantKeywords = ['error', 'warning', 'important', 'note:', 'attention'];
        const responseLower = response.toLowerCase();
        
        return importantKeywords.some(keyword => responseLower.includes(keyword)) ||
               response.includes('```') ||
               response.length > 500;
    }

    getStatus(): { isInitialized: boolean } {
        return {
            isInitialized: this.isInitialized
        };
    }

    dispose(): void {
        Logger.info('Disposing IDE Integration Service...');
        this.outputChannel.dispose();
        this.isInitialized = false;
        Logger.info('IDE Integration Service disposed');
    }
}
