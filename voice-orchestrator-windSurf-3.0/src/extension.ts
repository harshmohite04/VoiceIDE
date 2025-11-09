import * as vscode from 'vscode';
import { GeminiVoiceManager } from './geminiVoiceManager';
import { WebviewProvider } from './webviewProvider';

let voicePMManager: GeminiVoiceManager;
let webviewProvider: WebviewProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('Voice PM Assistant is now active!');

    // Initialize managers
    voicePMManager = new GeminiVoiceManager(context);
    webviewProvider = new WebviewProvider(context, voicePMManager);

    // Register webview provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('voicePMDashboard', webviewProvider)
    );

    // Register commands
    const startVoiceChat = vscode.commands.registerCommand('voicePM.startVoiceChat', async () => {
        try {
            await voicePMManager.startVoiceSession();
            vscode.window.showInformationMessage('Voice discussion started! Speak to begin...');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start voice chat: ${error}`);
        }
    });

    const stopVoiceChat = vscode.commands.registerCommand('voicePM.stopVoiceChat', () => {
        voicePMManager.stopVoiceSession();
        vscode.window.showInformationMessage('Voice discussion stopped.');
    });

    const toggleMute = vscode.commands.registerCommand('voicePM.toggleMute', () => {
        const isMuted = voicePMManager.toggleMute();
        vscode.window.showInformationMessage(`Microphone ${isMuted ? 'muted' : 'unmuted'}`);
    });

    const openDashboard = vscode.commands.registerCommand('voicePM.openDashboard', () => {
        vscode.commands.executeCommand('workbench.view.extension.voicePMView');
    });

    // Add commands to subscriptions
    context.subscriptions.push(
        startVoiceChat,
        stopVoiceChat,
        toggleMute,
        openDashboard
    );

    // Show welcome message
    vscode.window.showInformationMessage(
        'Voice PM Assistant loaded! Use Ctrl+Shift+V to start voice discussion.',
        'Open Dashboard'
    ).then(selection => {
        if (selection === 'Open Dashboard') {
            vscode.commands.executeCommand('voicePM.openDashboard');
        }
    });
}

export function deactivate() {
    if (voicePMManager) {
        voicePMManager.dispose();
    }
}
