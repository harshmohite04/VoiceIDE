import * as vscode from 'vscode';
import { Logger } from '../utils/Logger';

export interface ConversationContext {
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
    }>;
    currentFile?: string;
    currentSelection?: string;
    workspaceInfo?: WorkspaceInfo;
    recentActions?: string[];
}

export interface WorkspaceInfo {
    rootPath: string;
    openFiles: string[];
    projectType?: string;
    dependencies?: string[];
}

export class ContextManager {
    private context: ConversationContext;
    private maxMessages: number = 50;
    private maxRecentActions: number = 20;

    constructor() {
        this.context = {
            messages: [],
            recentActions: []
        };
        this.initializeWorkspaceInfo();
    }

    addVoiceInput(text: string): void {
        this.context.messages.push({
            role: 'user',
            content: text,
            timestamp: new Date()
        });
        this.trimMessages();
        Logger.debug(`Added voice input to context: ${text}`);
    }

    addAIResponse(response: string): void {
        this.context.messages.push({
            role: 'assistant',
            content: response,
            timestamp: new Date()
        });
        this.trimMessages();
        Logger.debug(`Added AI response to context`);
    }

    updateDocumentContext(document: vscode.TextDocument): void {
        this.context.currentFile = document.fileName;
        this.addRecentAction(`Edited file: ${document.fileName}`);
        Logger.debug(`Updated document context: ${document.fileName}`);
    }

    updateActiveEditor(editor: vscode.TextEditor): void {
        this.context.currentFile = editor.document.fileName;
        
        // Get current selection if any
        const selection = editor.selection;
        if (!selection.isEmpty) {
            this.context.currentSelection = editor.document.getText(selection);
        } else {
            this.context.currentSelection = undefined;
        }
        
        this.addRecentAction(`Switched to file: ${editor.document.fileName}`);
        Logger.debug(`Updated active editor context: ${editor.document.fileName}`);
    }

    addRecentAction(action: string): void {
        if (!this.context.recentActions) {
            this.context.recentActions = [];
        }
        
        this.context.recentActions.unshift(action);
        
        if (this.context.recentActions.length > this.maxRecentActions) {
            this.context.recentActions = this.context.recentActions.slice(0, this.maxRecentActions);
        }
        
        Logger.debug(`Added recent action: ${action}`);
    }

    getContext(): ConversationContext {
        return { ...this.context };
    }

    getRecentMessages(count: number = 10): Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }> {
        return this.context.messages.slice(-count);
    }

    getCurrentFileContent(): string | undefined {
        if (!this.context.currentFile) {
            return undefined;
        }

        try {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.fileName === this.context.currentFile) {
                return activeEditor.document.getText();
            }
        } catch (error) {
            Logger.error('Failed to get current file content', error);
        }

        return undefined;
    }

    getWorkspaceContext(): string {
        const context = this.getContext();
        const parts: string[] = [];

        if (context.workspaceInfo) {
            parts.push(`Workspace: ${context.workspaceInfo.rootPath}`);
            if (context.workspaceInfo.projectType) {
                parts.push(`Project Type: ${context.workspaceInfo.projectType}`);
            }
        }

        if (context.currentFile) {
            parts.push(`Current File: ${context.currentFile}`);
        }

        if (context.currentSelection) {
            parts.push(`Selected Text: ${context.currentSelection.substring(0, 200)}...`);
        }

        if (context.recentActions && context.recentActions.length > 0) {
            parts.push(`Recent Actions: ${context.recentActions.slice(0, 5).join(', ')}`);
        }

        return parts.join('\n');
    }

    private initializeWorkspaceInfo(): void {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const rootPath = workspaceFolders[0].uri.fsPath;
                
                this.context.workspaceInfo = {
                    rootPath,
                    openFiles: this.getOpenFiles(),
                    projectType: this.detectProjectType(rootPath)
                };
                
                Logger.debug(`Initialized workspace info: ${rootPath}`);
            }
        } catch (error) {
            Logger.error('Failed to initialize workspace info', error);
        }
    }

    private getOpenFiles(): string[] {
        try {
            return vscode.workspace.textDocuments
                .filter(doc => !doc.isUntitled)
                .map(doc => doc.fileName);
        } catch (error) {
            Logger.error('Failed to get open files', error);
            return [];
        }
    }

    private detectProjectType(rootPath: string): string | undefined {
        try {
            const fs = require('fs');
            const path = require('path');

            if (fs.existsSync(path.join(rootPath, 'package.json'))) {
                return 'Node.js/JavaScript';
            }
            if (fs.existsSync(path.join(rootPath, 'requirements.txt')) || 
                fs.existsSync(path.join(rootPath, 'setup.py'))) {
                return 'Python';
            }
            if (fs.existsSync(path.join(rootPath, 'Cargo.toml'))) {
                return 'Rust';
            }
            if (fs.existsSync(path.join(rootPath, 'go.mod'))) {
                return 'Go';
            }
            if (fs.existsSync(path.join(rootPath, 'pom.xml'))) {
                return 'Java (Maven)';
            }
            if (fs.existsSync(path.join(rootPath, 'build.gradle'))) {
                return 'Java (Gradle)';
            }
        } catch (error) {
            Logger.error('Failed to detect project type', error);
        }

        return undefined;
    }

    private trimMessages(): void {
        if (this.context.messages.length > this.maxMessages) {
            this.context.messages = this.context.messages.slice(-this.maxMessages);
        }
    }

    clearContext(): void {
        this.context.messages = [];
        this.context.recentActions = [];
        this.context.currentSelection = undefined;
        Logger.info('Context cleared');
    }

    dispose(): void {
        this.clearContext();
        Logger.debug('ContextManager disposed');
    }
}
