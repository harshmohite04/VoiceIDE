import * as vscode from 'vscode';
import { VoiceOrchestrator } from './core/VoiceOrchestrator';
import { Logger } from './utils/Logger';

let voiceOrchestrator: VoiceOrchestrator | undefined;

export function activate(context: vscode.ExtensionContext) {
    Logger.info('Voice Orchestrator extension is being activated');

    try {
        voiceOrchestrator = new VoiceOrchestrator(context);
        
        // Register commands
        const startListeningCommand = vscode.commands.registerCommand(
            'voiceOrchestrator.startListening',
            () => voiceOrchestrator?.startListening()
        );

        const stopListeningCommand = vscode.commands.registerCommand(
            'voiceOrchestrator.stopListening',
            () => voiceOrchestrator?.stopListening()
        );

        const toggleMuteCommand = vscode.commands.registerCommand(
            'voiceOrchestrator.toggleMute',
            () => voiceOrchestrator?.toggleMute()
        );

        context.subscriptions.push(
            startListeningCommand,
            stopListeningCommand,
            toggleMuteCommand
        );

        // Initialize the voice orchestrator
        voiceOrchestrator.initialize();

        Logger.info('Voice Orchestrator extension activated successfully');
        
        // Show welcome message
        vscode.window.showInformationMessage(
            'Voice Orchestrator is ready! Press Ctrl+Shift+V to start voice interaction.'
        );

    } catch (error) {
        Logger.error('Failed to activate Voice Orchestrator extension', error);
        vscode.window.showErrorMessage(
            'Failed to activate Voice Orchestrator. Please check your configuration.'
        );
    }
}

export function deactivate() {
    Logger.info('Voice Orchestrator extension is being deactivated');
    
    if (voiceOrchestrator) {
        voiceOrchestrator.dispose();
        voiceOrchestrator = undefined;
    }
    
    Logger.info('Voice Orchestrator extension deactivated');
}
