import * as vscode from 'vscode';
import { GeminiVoiceManager } from './geminiVoiceManager';
import { WebviewProvider } from './webviewProvider';
import { PermissionManager } from './permissionManager';

let voicePMManager: GeminiVoiceManager;
let webviewProvider: WebviewProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('Voice PM Assistant is now active!');

    // Auto-configure webview permissions for microphone access
    configureWebviewPermissions();

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

    const resetPermissions = vscode.commands.registerCommand('voicePM.resetPermissions', async () => {
        const permissionManager = PermissionManager.getInstance(context);
        permissionManager.resetPermissions();
        
        const choice = await vscode.window.showInformationMessage(
            '🔄 Microphone permissions have been reset.',
            'You can now set up voice recognition again.',
            'Setup Voice Now',
            'OK'
        );
        
        if (choice === 'Setup Voice Now') {
            vscode.commands.executeCommand('voicePM.startVoiceChat');
        }
    });

    // Add commands to subscriptions
    context.subscriptions.push(
        startVoiceChat,
        stopVoiceChat,
        toggleMute,
        openDashboard,
        resetPermissions
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

/**
 * Automatically configure webview permissions for microphone access
 * This eliminates the need for users to manually edit settings.json
 */
async function configureWebviewPermissions() {
    try {
        const config = vscode.workspace.getConfiguration();
        
        // Check if webview permissions are already configured
        const useIframes = config.get('webview.experimental.useIframes');
        const enablePermissions = config.get('webview.experimental.enablePermissions');
        const trustEnabled = config.get('security.workspace.trust.enabled');
        
        let needsRestart = false;
        
        // Configure webview settings if not already set
        if (useIframes !== true) {
            await config.update('webview.experimental.useIframes', true, vscode.ConfigurationTarget.Global);
            needsRestart = true;
        }
        
        if (enablePermissions !== true) {
            await config.update('webview.experimental.enablePermissions', true, vscode.ConfigurationTarget.Global);
            needsRestart = true;
        }
        
        if (trustEnabled !== false) {
            await config.update('security.workspace.trust.enabled', false, vscode.ConfigurationTarget.Global);
            needsRestart = true;
        }
        
        // Notify user if restart is needed
        if (needsRestart) {
            const action = await vscode.window.showInformationMessage(
                'Voice PM Assistant: Webview permissions configured for microphone access. Restart Windsurf to enable voice recognition.',
                'Restart Now',
                'Later'
            );
            
            if (action === 'Restart Now') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        }
        
    } catch (error) {
        console.error('Failed to configure webview permissions:', error);
        // Fallback: Show manual instructions
        vscode.window.showWarningMessage(
            'Voice PM Assistant: Could not auto-configure webview permissions. Please check the extension documentation for manual setup.',
            'Open Documentation'
        ).then(selection => {
            if (selection === 'Open Documentation') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/your-repo/voice-pm-assistant#microphone-setup'));
            }
        });
    }
}
