import * as vscode from 'vscode';
import { Task, TaskStatus } from '../models/task';

export class TaskPlanner {
    private tasks: Map<string, Task> = new Map();
    private currentTaskId: string | null = null;
    private taskQueue: string[] = [];

    public async processCommand(command: string): Promise<void> {
        // Log the command
        console.log(`Processing command: ${command}`);
        
        // Create a new task
        const task = this.createTask(command);
        this.taskQueue.push(task.id);
        
        // If no task is currently running, start processing the queue
        if (!this.currentTaskId) {
            await this.processQueue();
        }
    }

    private createTask(description: string): Task {
        const taskId = `task-${Date.now()}`;
        const task: Task = {
            id: taskId,
            description,
            status: TaskStatus.Pending,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {}
        };
        
        this.tasks.set(taskId, task);
        return task;
    }

    private async processQueue(): Promise<void> {
        if (this.taskQueue.length === 0) {
            this.currentTaskId = null;
            return;
        }

        const taskId = this.taskQueue.shift()!;
        const task = this.tasks.get(taskId);
        
        if (!task) {
            // Skip if task not found
            return this.processQueue();
        }

        this.currentTaskId = taskId;
        task.status = TaskStatus.InProgress;
        task.updatedAt = new Date();
        
        try {
            // Show progress notification
            const progressOptions = {
                location: vscode.ProgressLocation.Notification,
                title: `Processing: ${task.description}`,
                cancellable: true
            };

            await vscode.window.withProgress(progressOptions, async (progress, token) => {
                token.onCancellationRequested(() => {
                    task.status = TaskStatus.Cancelled;
                    task.updatedAt = new Date();
                    vscode.window.showInformationMessage(`Task cancelled: ${task.description}`);
                });

                // Process the task
                await this.executeTask(task, progress, token);
            });

            task.status = TaskStatus.Completed;
            task.updatedAt = new Date();
            
        } catch (error) {
            console.error(`Error processing task ${task.id}:`, error);
            task.status = TaskStatus.Failed;
            task.error = error instanceof Error ? error.message : 'Unknown error';
            task.updatedAt = new Date();
            
            vscode.window.showErrorMessage(`Task failed: ${task.description}\n${task.error}`);
        } finally {
            // Process next task in the queue
            await this.processQueue();
        }
    }

    private async executeTask(task: Task, progress: vscode.Progress<{ message?: string; increment?: number }>, token: vscode.CancellationToken): Promise<void> {
        // Update progress
        progress.report({ message: 'Analyzing command...' });
        
        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check for cancellation
        if (token.isCancellationRequested) {
            return;
        }
        
        // Here we would analyze the command and break it down into subtasks
        // For now, we'll just simulate this with a simple example
        const subtasks = this.analyzeCommand(task.description);
        
        // Process subtasks
        for (let i = 0; i < subtasks.length; i++) {
            const subtask = subtasks[i];
            progress.report({ 
                message: `Processing: ${subtask.description}`,
                increment: (1 / subtasks.length) * 100
            });
            
            // Simulate work for each subtask
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check for cancellation
            if (token.isCancellationRequested) {
                return;
            }
        }
        
        // Apply changes to the editor
        await this.applyChanges(task);
    }
    
    private analyzeCommand(command: string): Array<{ description: string; action: () => Promise<void> }> {
        // This is a simplified example - in a real implementation, this would use NLP
        // to understand the intent and break it down into actionable steps
        
        const lowerCommand = command.toLowerCase();
        const subtasks: Array<{ description: string; action: () => Promise<void> }> = [];
        
        if (lowerCommand.includes('login') && (lowerCommand.includes('page') || lowerCommand.includes('form'))) {
            subtasks.push(
                { 
                    description: 'Find login page files', 
                    action: async () => {
                        // Implementation would search for login-related files
                    } 
                },
                { 
                    description: 'Analyze current implementation', 
                    action: async () => {
                        // Implementation would analyze the current code
                    } 
                },
                { 
                    description: 'Update login form styling', 
                    action: async () => {
                        // Implementation would update CSS/JSX/HTML
                    } 
                }
            );
        } else if (lowerCommand.includes('api') && (lowerCommand.includes('create') || lowerCommand.includes('add'))) {
            subtasks.push(
                { 
                    description: 'Define API endpoint structure', 
                    action: async () => {
                        // Implementation would define API structure
                    } 
                },
                { 
                    description: 'Implement endpoint logic', 
                    action: async () => {
                        // Implementation would add the endpoint code
                    } 
                },
                { 
                    description: 'Add input validation', 
                    action: async () => {
                        // Implementation would add validation
                    } 
                },
                { 
                    description: 'Write tests', 
                    action: async () => {
                        // Implementation would add tests
                    } 
                }
            );
        } else {
            // Default subtask for unrecognized commands
            subtasks.push({
                description: `Process: ${command}`,
                action: async () => {
                    // Default action
                }
            });
        }
        
        return subtasks;
    }
    
    private async applyChanges(task: Task): Promise<void> {
        // This is where we would apply the actual changes to the code
        // For now, we'll just show a message with the proposed changes
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor');
            return;
        }
        
        // Example: Show a diff of the changes that would be made
        const document = editor.document;
        const position = editor.selection.active;
        
        // In a real implementation, we would use the AI to generate the code changes
        // For now, we'll just show a message with the proposed changes
        const changes = `Proposed changes for: ${task.description}\n\n` +
                       `- Update file: ${document.fileName}\n` +
                       `- At position: line ${position.line + 1}, character ${position.character + 1}\n` +
                       `- Action: ${task.description}`;
        
        // Show a preview of the changes
        const selection = await vscode.window.showInformationMessage(
            changes,
            'Apply Changes',
            'Preview Changes',
            'Cancel'
        );
        
        if (selection === 'Apply Changes') {
            // Apply the changes to the document
            await editor.edit(editBuilder => {
                // In a real implementation, this would apply the actual changes
                editBuilder.insert(position, `// ${task.description}\n`);
            });
            
            vscode.window.showInformationMessage('Changes applied successfully');
        } else if (selection === 'Preview Changes') {
            // Show a diff view of the changes
            // In a real implementation, this would show a proper diff view
            const diffDoc = await vscode.workspace.openTextDocument({
                content: `// Original content\n${document.getText()}\n\n` +
                         `// Proposed changes for: ${task.description}\n` +
                         `// [The actual changes would be shown here in a real implementation]`,
                language: document.languageId
            });
            
            await vscode.window.showTextDocument(diffDoc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
        }
    }
    
    public getCurrentTask(): Task | null {
        if (!this.currentTaskId) {
            return null;
        }
        return this.tasks.get(this.currentTaskId) || null;
    }
    
    public getTaskQueue(): Task[] {
        return this.taskQueue.map(id => this.tasks.get(id)).filter(Boolean) as Task[];
    }
    
    public getCompletedTasks(): Task[] {
        return Array.from(this.tasks.values())
            .filter(task => task.status === TaskStatus.Completed)
            .sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1));
    }
    
    public clearCompletedTasks(): void {
        const completedTaskIds = Array.from(this.tasks.entries())
            .filter(([_, task]) => task.status === TaskStatus.Completed)
            .map(([id]) => id);
            
        for (const id of completedTaskIds) {
            this.tasks.delete(id);
            const index = this.taskQueue.indexOf(id);
            if (index !== -1) {
                this.taskQueue.splice(index, 1);
            }
        }
    }
}
