import * as vscode from 'vscode';
import { GeminiVoiceManager } from './geminiVoiceManager';

export class WebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'voicePMDashboard';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly voicePMManager: GeminiVoiceManager
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this.context.extensionUri
            ]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'startVoice':
                        vscode.commands.executeCommand('voicePM.startVoiceChat');
                        break;
                    case 'stopVoice':
                        vscode.commands.executeCommand('voicePM.stopVoiceChat');
                        break;
                    case 'toggleMute':
                        vscode.commands.executeCommand('voicePM.toggleMute');
                        break;
                    case 'clearHistory':
                        this.voicePMManager.clearConversation();
                        this.updateConversationHistory();
                        break;
                    case 'changeMode':
                        this.changeConversationMode(message.mode);
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );

        // Register command to update UI
        const updateUICommand = vscode.commands.registerCommand('voicePM.updateUI', (data) => {
            this.updateUI(data);
        });
        this.context.subscriptions.push(updateUICommand);

        // Initial load
        this.updateConversationHistory();
    }

    private changeConversationMode(mode: string) {
        // This would need to be implemented in VoicePMManager
        vscode.window.showInformationMessage(`Conversation mode changed to: ${mode}`);
        this.updateUI({ type: 'mode_changed', message: mode });
    }

    private updateUI(data: any) {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateUI',
                data: data
            });
        }
    }

    private updateConversationHistory() {
        const history = this.voicePMManager.getConversationHistory();
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateHistory',
                history: history
            });
        }
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Voice PM Assistant</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 16px;
            height: 100vh;
            overflow-y: auto;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .logo {
            font-size: 24px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 8px;
        }

        .subtitle {
            font-size: 14px;
            opacity: 0.8;
        }

        .controls {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 20px;
        }

        .btn {
            padding: 12px 16px;
            border: 1px solid var(--vscode-button-border);
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .btn:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .btn.primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .btn.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .status {
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 16px;
            text-align: center;
            font-weight: 500;
            border: 1px solid var(--vscode-panel-border);
        }

        .status.listening {
            background: var(--vscode-inputValidation-infoBackground);
            color: var(--vscode-inputValidation-infoForeground);
            border-color: var(--vscode-inputValidation-infoBorder);
        }

        .status.thinking {
            background: var(--vscode-inputValidation-warningBackground);
            color: var(--vscode-inputValidation-warningForeground);
            border-color: var(--vscode-inputValidation-warningBorder);
        }

        .status.error {
            background: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            border-color: var(--vscode-inputValidation-errorBorder);
        }

        .mode-selector {
            margin-bottom: 16px;
        }

        .mode-selector select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-size: 14px;
        }

        .conversation {
            flex: 1;
            overflow-y: auto;
            max-height: 400px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 16px;
            background: var(--vscode-editor-background);
        }

        .message {
            margin-bottom: 16px;
            padding: 12px;
            border-radius: 8px;
            line-height: 1.5;
        }

        .message.user {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            margin-left: 20px;
        }

        .message.assistant {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-right: 20px;
        }

        .message.system {
            background: var(--vscode-panel-background);
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            font-size: 12px;
        }

        .message-role {
            font-weight: bold;
            margin-bottom: 4px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .message-content {
            font-size: 14px;
        }

        .timestamp {
            font-size: 11px;
            opacity: 0.6;
            margin-top: 4px;
        }

        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }

        .pulse {
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }

        .icon {
            width: 16px;
            height: 16px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🎤 Voice PM Assistant</div>
        <div class="subtitle">AI-powered discussion partner & product manager</div>
    </div>

    <div class="mode-selector">
        <select id="modeSelect">
            <option value="product_manager">Product Manager</option>
            <option value="discussion_partner">Discussion Partner</option>
            <option value="code_reviewer">Code Reviewer</option>
            <option value="brainstorming">Brainstorming</option>
        </select>
    </div>

    <div class="controls">
        <button id="startBtn" class="btn primary">
            <span>🎤</span> Start Voice
        </button>
        <button id="stopBtn" class="btn secondary" disabled>
            <span>⏹️</span> Stop Voice
        </button>
        <button id="muteBtn" class="btn secondary">
            <span>🔇</span> Toggle Mute
        </button>
        <button id="clearBtn" class="btn secondary">
            <span>🗑️</span> Clear History
        </button>
    </div>

    <div id="status" class="status" style="display: none;">
        Ready to start voice conversation
    </div>

    <div class="conversation" id="conversation">
        <div class="empty-state">
            <p>Start a voice conversation to see the discussion here.</p>
            <p style="margin-top: 8px; font-size: 12px;">Press <strong>Ctrl+Shift+V</strong> or click "Start Voice" to begin.</p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        // UI Elements
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const muteBtn = document.getElementById('muteBtn');
        const clearBtn = document.getElementById('clearBtn');
        const modeSelect = document.getElementById('modeSelect');
        const status = document.getElementById('status');
        const conversation = document.getElementById('conversation');

        // Event Listeners
        startBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'startVoice' });
            updateButtonStates(true);
        });

        stopBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'stopVoice' });
            updateButtonStates(false);
        });

        muteBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'toggleMute' });
        });

        clearBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'clearHistory' });
        });

        modeSelect.addEventListener('change', () => {
            vscode.postMessage({ 
                command: 'changeMode', 
                mode: modeSelect.value 
            });
        });

        // Message Handler
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'updateUI':
                    updateUI(message.data);
                    break;
                case 'updateHistory':
                    updateConversationHistory(message.history);
                    break;
            }
        });

        function updateButtonStates(isActive) {
            startBtn.disabled = isActive;
            stopBtn.disabled = !isActive;
        }

        function updateUI(data) {
            const { type, message, timestamp } = data;
            
            status.style.display = 'block';
            status.className = 'status ' + type;
            status.textContent = message;

            if (type === 'listening') {
                status.classList.add('pulse');
            } else {
                status.classList.remove('pulse');
            }

            if (type === 'stopped') {
                updateButtonStates(false);
                setTimeout(() => {
                    status.style.display = 'none';
                }, 3000);
            }
        }

        function updateConversationHistory(history) {
            if (!history || history.length <= 1) {
                conversation.innerHTML = '<div class="empty-state"><p>Start a voice conversation to see the discussion here.</p></div>';
                return;
            }

            const messages = history.slice(1); // Skip system message
            conversation.innerHTML = messages.map(msg => {
                const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
                return \`
                    <div class="message \${msg.role}">
                        <div class="message-role">\${msg.role}</div>
                        <div class="message-content">\${msg.content}</div>
                        \${time ? \`<div class="timestamp">\${time}</div>\` : ''}
                    </div>
                \`;
            }).join('');

            // Scroll to bottom
            conversation.scrollTop = conversation.scrollHeight;
        }
    </script>
</body>
</html>`;
    }
}
