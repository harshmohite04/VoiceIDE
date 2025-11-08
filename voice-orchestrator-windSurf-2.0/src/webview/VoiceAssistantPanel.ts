import * as vscode from 'vscode';
import { Logger } from '../utils/Logger';

export class VoiceAssistantPanel {
    public static currentPanel: VoiceAssistantPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (VoiceAssistantPanel.currentPanel) {
            VoiceAssistantPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'voiceAssistant',
            'Voice Assistant',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        VoiceAssistantPanel.currentPanel = new VoiceAssistantPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.onDidChangeViewState(
            e => {
                if (this._panel.visible) {
                    this._update();
                }
            },
            null,
            this._disposables
        );

        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'startListening':
                        vscode.commands.executeCommand('voiceOrchestrator.startListening');
                        return;
                    case 'stopListening':
                        vscode.commands.executeCommand('voiceOrchestrator.stopListening');
                        return;
                    case 'toggleMute':
                        vscode.commands.executeCommand('voiceOrchestrator.toggleMute');
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public updateStatus(status: { isListening: boolean; isMuted: boolean; lastMessage?: string }) {
        this._panel.webview.postMessage({
            command: 'updateStatus',
            status: status
        });
    }

    public addMessage(message: { role: 'user' | 'assistant'; content: string; timestamp: Date }) {
        this._panel.webview.postMessage({
            command: 'addMessage',
            message: message
        });
    }

    public dispose() {
        VoiceAssistantPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Voice Assistant';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Voice Assistant</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    font-weight: var(--vscode-font-weight);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    margin: 0;
                }
                
                .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                
                .title {
                    font-size: 18px;
                    font-weight: bold;
                }
                
                .status {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .status-indicator {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background-color: var(--vscode-charts-red);
                }
                
                .status-indicator.listening {
                    background-color: var(--vscode-charts-green);
                    animation: pulse 1.5s infinite;
                }
                
                .status-indicator.muted {
                    background-color: var(--vscode-charts-orange);
                }
                
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                
                .controls {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                
                .btn {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .btn:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .btn.primary {
                    background-color: var(--vscode-button-background);
                }
                
                .btn.secondary {
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                
                .conversation {
                    max-height: 400px;
                    overflow-y: auto;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    padding: 10px;
                    background-color: var(--vscode-editor-background);
                }
                
                .message {
                    margin-bottom: 15px;
                    padding: 10px;
                    border-radius: 8px;
                    max-width: 80%;
                }
                
                .message.user {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    margin-left: auto;
                    text-align: right;
                }
                
                .message.assistant {
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                }
                
                .message-header {
                    font-size: 12px;
                    opacity: 0.7;
                    margin-bottom: 5px;
                }
                
                .message-content {
                    line-height: 1.4;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 40px 20px;
                    color: var(--vscode-descriptionForeground);
                }
                
                .empty-state h3 {
                    margin-bottom: 10px;
                }
                
                .empty-state p {
                    margin-bottom: 20px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">🎤 Voice Assistant</div>
                <div class="status">
                    <div id="statusIndicator" class="status-indicator"></div>
                    <span id="statusText">Idle</span>
                </div>
            </div>
            
            <div class="controls">
                <button id="startBtn" class="btn primary">Start Listening</button>
                <button id="stopBtn" class="btn secondary" disabled>Stop Listening</button>
                <button id="muteBtn" class="btn secondary">Toggle Mute</button>
            </div>
            
            <div class="conversation" id="conversation">
                <div class="empty-state">
                    <h3>Welcome to Voice Assistant!</h3>
                    <p>Click "Start Listening" to begin voice interaction with your AI coding assistant.</p>
                    <p>You can ask questions, request code generation, or get help with your projects.</p>
                </div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                const startBtn = document.getElementById('startBtn');
                const stopBtn = document.getElementById('stopBtn');
                const muteBtn = document.getElementById('muteBtn');
                const statusIndicator = document.getElementById('statusIndicator');
                const statusText = document.getElementById('statusText');
                const conversation = document.getElementById('conversation');
                
                let messages = [];
                
                startBtn.addEventListener('click', () => {
                    vscode.postMessage({ command: 'startListening' });
                });
                
                stopBtn.addEventListener('click', () => {
                    vscode.postMessage({ command: 'stopListening' });
                });
                
                muteBtn.addEventListener('click', () => {
                    vscode.postMessage({ command: 'toggleMute' });
                });
                
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.command) {
                        case 'updateStatus':
                            updateStatus(message.status);
                            break;
                        case 'addMessage':
                            addMessage(message.message);
                            break;
                    }
                });
                
                function updateStatus(status) {
                    if (status.isMuted) {
                        statusIndicator.className = 'status-indicator muted';
                        statusText.textContent = 'Muted';
                        startBtn.disabled = true;
                        stopBtn.disabled = true;
                    } else if (status.isListening) {
                        statusIndicator.className = 'status-indicator listening';
                        statusText.textContent = 'Listening...';
                        startBtn.disabled = true;
                        stopBtn.disabled = false;
                    } else {
                        statusIndicator.className = 'status-indicator';
                        statusText.textContent = 'Idle';
                        startBtn.disabled = false;
                        stopBtn.disabled = true;
                    }
                }
                
                function addMessage(message) {
                    messages.push(message);
                    renderConversation();
                }
                
                function renderConversation() {
                    if (messages.length === 0) {
                        return;
                    }
                    
                    conversation.innerHTML = messages.map(msg => \`
                        <div class="message \${msg.role}">
                            <div class="message-header">
                                \${msg.role === 'user' ? 'You' : 'Assistant'} • \${new Date(msg.timestamp).toLocaleTimeString()}
                            </div>
                            <div class="message-content">\${msg.content}</div>
                        </div>
                    \`).join('');
                    
                    conversation.scrollTop = conversation.scrollHeight;
                }
            </script>
        </body>
        </html>`;
    }
}
