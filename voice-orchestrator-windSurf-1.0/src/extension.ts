import * as vscode from 'vscode';
import { VoiceCommandHandler } from './voice/voiceCommandHandler';
import { TaskPlanner } from './planner/taskPlanner';

export function activate(context: vscode.ExtensionContext) {
    console.log('Voice IDE Orchestrator extension is now active!');

    // Initialize components
    const taskPlanner = new TaskPlanner();
    const voiceHandler = new VoiceCommandHandler(context, taskPlanner);

    // Register commands
    const startListening = vscode.commands.registerCommand('voice-ide-orchestrator.startListening', () => {
        voiceHandler.startListening();
    });

    const stopListening = vscode.commands.registerCommand('voice-ide-orchestrator.stopListening', () => {
        voiceHandler.stopListening();
    });

    // Auto-start if configured
    const config = vscode.workspace.getConfiguration('voiceIDE');
    if (config.get('autoStart')) {
        voiceHandler.startListening();
    }

    context.subscriptions.push(startListening, stopListening, voiceHandler);
}

export function deactivate() {
    console.log('Voice IDE Orchestrator extension is now deactivated');
}
