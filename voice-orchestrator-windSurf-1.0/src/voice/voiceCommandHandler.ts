import * as vscode from 'vscode';
import { TaskPlanner } from '../planner/taskPlanner';

export class VoiceCommandHandler implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private isListening: boolean = false;
    private readonly config: vscode.WorkspaceConfiguration;
    private recognition: any;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly taskPlanner: TaskPlanner
    ) {
        this.config = vscode.workspace.getConfiguration('voiceIDE');
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.text = '$(mic) Voice IDE';
        this.statusBarItem.tooltip = 'Click to start voice command';
        this.statusBarItem.command = 'voice-ide-orchestrator.startListening';
        this.statusBarItem.show();

        // Initialize speech recognition
        this.initializeRecognition();
    }

    private initializeRecognition() {
        // This is a placeholder for browser-based speech recognition
        // In a real extension, we would use the Web Speech API or a native module
        if ('webkitSpeechRecognition' in window) {
            // @ts-ignore
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = this.config.get('language') || 'en-US';

            this.recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript.trim();
                this.processVoiceCommand(transcript);
            };

            this.recognition.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                this.updateStatus('Error: ' + event.error, 'error');
                this.stopListening();
            };
        } else {
            vscode.window.showErrorMessage('Speech recognition not supported in this environment');
        }
    }

    public startListening() {
        if (this.isListening) {
            return;
        }

        if (!this.recognition) {
            vscode.window.showErrorMessage('Speech recognition not available');
            return;
        }

        try {
            this.recognition.start();
            this.isListening = true;
            this.updateStatus('Listening...', 'listening');
            
            // Auto-stop after 10 seconds of inactivity
            setTimeout(() => {
                if (this.isListening) {
                    this.stopListening();
                }
            }, 10000);

        } catch (error) {
            console.error('Error starting speech recognition:', error);
            this.updateStatus('Error starting', 'error');
        }
    }

    public stopListening() {
        if (!this.isListening) {
            return;
        }

        try {
            if (this.recognition) {
                this.recognition.stop();
            }
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
        } finally {
            this.isListening = false;
            this.updateStatus('Ready', 'ready');
        }
    }

    private async processVoiceCommand(command: string) {
        if (!command) {
            return;
        }

        this.updateStatus('Processing...', 'processing');
        
        try {
            // Show the command in a status message
            vscode.window.setStatusBarMessage(`Voice Command: ${command}`, 3000);
            
            // Process the command through the task planner
            await this.taskPlanner.processCommand(command);
            
            // Play a confirmation sound if enabled
            if (this.config.get('confirmationSound')) {
                this.playConfirmationSound();
            }
            
        } catch (error) {
            console.error('Error processing voice command:', error);
            this.updateStatus('Error', 'error');
            vscode.window.showErrorMessage(`Error processing command: ${error.message}`);
        } finally {
            this.updateStatus('Ready', 'ready');
        }
    }

    private updateStatus(text: string, state: 'ready' | 'listening' | 'processing' | 'error') {
        let icon = '$(mic)';
        let backgroundColor = new vscode.ThemeColor('statusBar.background');
        
        switch (state) {
            case 'listening':
                icon = '$(mic-filled)';
                backgroundColor = new vscode.ThemeColor('statusBarItem.prominentForeground');
                break;
            case 'processing':
                icon = '$(sync~spin)';
                backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                break;
            case 'error':
                icon = '$(error)';
                backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                break;
        }

        this.statusBarItem.text = `${icon} ${text}`;
        this.statusBarItem.backgroundColor = backgroundColor;
    }

    private playConfirmationSound() {
        // Play a simple beep sound
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    public dispose() {
        this.stopListening();
        this.statusBarItem.dispose();
    }
}
