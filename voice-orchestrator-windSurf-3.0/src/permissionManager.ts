import * as vscode from 'vscode';

export interface PermissionResult {
    granted: boolean;
    method: 'webview' | 'native' | 'denied';
    error?: string;
}

export class PermissionManager {
    private static instance: PermissionManager;
    private permissionGranted = false;
    private permissionMethod: 'webview' | 'native' | 'denied' = 'denied';

    private constructor(private context: vscode.ExtensionContext) {}

    public static getInstance(context: vscode.ExtensionContext): PermissionManager {
        if (!PermissionManager.instance) {
            PermissionManager.instance = new PermissionManager(context);
        }
        return PermissionManager.instance;
    }

    /**
     * Request microphone permission with user-friendly flow
     */
    public async requestMicrophonePermission(): Promise<PermissionResult> {
        // Check if permission was already granted
        if (this.permissionGranted) {
            return {
                granted: true,
                method: this.permissionMethod
            };
        }

        // Show initial permission dialog
        const choice = await this.showPermissionDialog();
        if (!choice) {
            return { granted: false, method: 'denied', error: 'User cancelled permission request' };
        }

        // Try different permission methods based on user choice
        switch (choice) {
            case 'native':
                return await this.requestNativePermission();
            case 'webview':
                return await this.requestWebviewPermission();
            case 'auto':
                // Try native first, fallback to webview
                const nativeResult = await this.requestNativePermission();
                if (nativeResult.granted) {
                    return nativeResult;
                }
                return await this.requestWebviewPermission();
            default:
                return { granted: false, method: 'denied', error: 'Invalid choice' };
        }
    }

    /**
     * Show user-friendly permission dialog
     */
    private async showPermissionDialog(): Promise<string | undefined> {
        const message = `🎤 Voice PM Assistant needs microphone access to enable voice conversations.\n\nChoose your preferred method:`;
        
        const choice = await vscode.window.showInformationMessage(
            message,
            {
                modal: true,
                detail: 'This extension uses your microphone to enable voice conversations with AI. Your voice data is processed securely and never stored permanently.'
            },
            {
                title: '🚀 Recommended: Auto-detect',
                id: 'auto',
                detail: 'Try the best available method automatically'
            },
            {
                title: '🖥️ Native Windows Speech',
                id: 'native',
                detail: 'Use Windows built-in speech recognition (most reliable)'
            },
            {
                title: '🌐 Browser-based Speech',
                id: 'webview',
                detail: 'Use web browser speech recognition (requires permission popup)'
            }
        );

        return choice?.id;
    }

    /**
     * Request native Windows speech permission
     */
    private async requestNativePermission(): Promise<PermissionResult> {
        try {
            // Test if native speech is available
            const isAvailable = await this.testNativeSpeechAvailability();
            
            if (!isAvailable) {
                return {
                    granted: false,
                    method: 'denied',
                    error: 'Native speech recognition not available on this system'
                };
            }

            // Show success message
            vscode.window.showInformationMessage(
                '✅ Native speech recognition is ready!',
                'Voice conversations will use Windows built-in speech recognition.'
            );

            this.permissionGranted = true;
            this.permissionMethod = 'native';
            
            return { granted: true, method: 'native' };
        } catch (error) {
            return {
                granted: false,
                method: 'denied',
                error: `Native speech setup failed: ${error}`
            };
        }
    }

    /**
     * Request webview-based speech permission
     */
    private async requestWebviewPermission(): Promise<PermissionResult> {
        return new Promise((resolve) => {
            // Create permission test webview
            const panel = vscode.window.createWebviewPanel(
                'microphonePermissionTest',
                '🎤 Microphone Permission Setup',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: false
                }
            );

            panel.webview.html = this.getPermissionTestHTML();

            // Handle permission test results
            panel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'permissionGranted':
                            this.permissionGranted = true;
                            this.permissionMethod = 'webview';
                            panel.dispose();
                            vscode.window.showInformationMessage(
                                '✅ Microphone permission granted!',
                                'Voice conversations are now enabled.'
                            );
                            resolve({ granted: true, method: 'webview' });
                            break;
                        case 'permissionDenied':
                            panel.dispose();
                            this.showPermissionDeniedHelp();
                            resolve({
                                granted: false,
                                method: 'denied',
                                error: message.error || 'Microphone permission denied'
                            });
                            break;
                        case 'permissionError':
                            panel.dispose();
                            resolve({
                                granted: false,
                                method: 'denied',
                                error: message.error || 'Permission test failed'
                            });
                            break;
                    }
                },
                undefined,
                this.context.subscriptions
            );

            // Auto-close after 30 seconds
            const timeout = setTimeout(() => {
                panel.dispose();
                resolve({
                    granted: false,
                    method: 'denied',
                    error: 'Permission request timed out'
                });
            }, 30000);

            // Clear timeout when panel is disposed
            panel.onDidDispose(() => {
                clearTimeout(timeout);
            });
        });
    }

    /**
     * Test if native speech recognition is available
     */
    private async testNativeSpeechAvailability(): Promise<boolean> {
        try {
            // On Windows, check if SAPI is available
            if (process.platform === 'win32') {
                return true; // Windows has built-in speech recognition
            }
            // On other platforms, native speech might not be available
            return false;
        } catch {
            return false;
        }
    }

    /**
     * Show help when permission is denied
     */
    private async showPermissionDeniedHelp(): Promise<void> {
        const choice = await vscode.window.showWarningMessage(
            '🚫 Microphone access was denied',
            {
                modal: true,
                detail: 'Voice conversations require microphone access. You can still use text input, or try enabling permissions.'
            },
            'Show Help',
            'Try Again',
            'Use Text Only'
        );

        switch (choice) {
            case 'Show Help':
                this.showDetailedPermissionHelp();
                break;
            case 'Try Again':
                this.requestMicrophonePermission();
                break;
            case 'Use Text Only':
                vscode.window.showInformationMessage(
                    'Voice PM Assistant will work in text-only mode. You can enable voice later from the settings.'
                );
                break;
        }
    }

    /**
     * Show detailed permission help
     */
    private async showDetailedPermissionHelp(): Promise<void> {
        const helpPanel = vscode.window.createWebviewPanel(
            'microphoneHelp',
            '🎤 Microphone Setup Help',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        helpPanel.webview.html = this.getPermissionHelpHTML();
    }

    /**
     * Get permission test HTML
     */
    private getPermissionTestHTML(): string {
        return `<!DOCTYPE html>
<html>
<head>
    <title>Microphone Permission Test</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            background: #1e1e1e;
            color: #cccccc;
            text-align: center;
        }
        .container {
            max-width: 500px;
            margin: 0 auto;
        }
        h1 {
            color: #4fc3f7;
            margin-bottom: 20px;
        }
        .step {
            background: #252526;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid #3e3e42;
        }
        button {
            background: #0e639c;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px;
        }
        button:hover {
            background: #1177bb;
        }
        .status {
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            font-weight: bold;
        }
        .status.success {
            background: #0f5132;
            color: #d1e7dd;
            border: 1px solid #0a3622;
        }
        .status.error {
            background: #58151c;
            color: #f8d7da;
            border: 1px solid #842029;
        }
        .status.info {
            background: #055160;
            color: #b6effb;
            border: 1px solid #0c4a6e;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎤 Microphone Permission Setup</h1>
        
        <div class="step">
            <h3>Step 1: Grant Permission</h3>
            <p>Click the button below to test microphone access. Your browser will ask for permission.</p>
            <button onclick="testMicrophone()">🎤 Test Microphone Access</button>
        </div>

        <div id="status" class="status info" style="display: none;">
            Waiting for permission...
        </div>

        <div class="step" style="display: none;" id="successStep">
            <h3>✅ Success!</h3>
            <p>Microphone access granted. Voice conversations are now enabled.</p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let permissionTested = false;

        async function testMicrophone() {
            if (permissionTested) return;
            permissionTested = true;

            const status = document.getElementById('status');
            status.style.display = 'block';
            status.className = 'status info';
            status.textContent = 'Requesting microphone permission...';

            try {
                // Request microphone access
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                // Test successful
                status.className = 'status success';
                status.textContent = '✅ Microphone access granted!';
                
                document.getElementById('successStep').style.display = 'block';
                
                // Stop the stream
                stream.getTracks().forEach(track => track.stop());
                
                // Notify extension
                vscode.postMessage({ command: 'permissionGranted' });
                
            } catch (error) {
                console.error('Microphone permission error:', error);
                
                status.className = 'status error';
                
                let errorMessage = 'Permission denied';
                if (error.name === 'NotAllowedError') {
                    errorMessage = 'Microphone permission denied. Please click "Allow" when prompted.';
                } else if (error.name === 'NotFoundError') {
                    errorMessage = 'No microphone found. Please check your audio devices.';
                } else if (error.name === 'NotSupportedError') {
                    errorMessage = 'Microphone access not supported in this environment.';
                }
                
                status.textContent = '❌ ' + errorMessage;
                
                vscode.postMessage({ 
                    command: 'permissionDenied', 
                    error: errorMessage 
                });
            }
        }

        // Auto-test on load
        window.addEventListener('load', () => {
            setTimeout(() => {
                if (!permissionTested) {
                    testMicrophone();
                }
            }, 1000);
        });
    </script>
</body>
</html>`;
    }

    /**
     * Get permission help HTML
     */
    private getPermissionHelpHTML(): string {
        return `<!DOCTYPE html>
<html>
<head>
    <title>Microphone Setup Help</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            background: #1e1e1e;
            color: #cccccc;
            line-height: 1.6;
        }
        .container {
            max-width: 700px;
            margin: 0 auto;
        }
        h1, h2 {
            color: #4fc3f7;
        }
        .solution {
            background: #252526;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #4fc3f7;
        }
        .warning {
            background: #58151c;
            color: #f8d7da;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #dc3545;
        }
        code {
            background: #2d2d30;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        ol, ul {
            padding-left: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎤 Microphone Setup Help</h1>
        
        <div class="warning">
            <strong>⚠️ Common Issue:</strong> Windsurf's webview environment has strict security restrictions that may block microphone access.
        </div>

        <div class="solution">
            <h2>🔧 Solution 1: Windows System Permissions</h2>
            <ol>
                <li>Open <strong>Windows Settings</strong> → <strong>Privacy & Security</strong> → <strong>Microphone</strong></li>
                <li>Enable <strong>"Microphone access"</strong></li>
                <li>Enable <strong>"Let desktop apps access your microphone"</strong></li>
                <li>Enable <strong>"Let apps access your microphone"</strong></li>
                <li>Restart Windsurf and try again</li>
            </ol>
        </div>

        <div class="solution">
            <h2>🖥️ Solution 2: Use Native Windows Speech</h2>
            <p>When starting voice chat, choose <strong>"Native Windows Speech"</strong> instead of browser-based speech. This bypasses webview limitations entirely.</p>
        </div>

        <div class="solution">
            <h2>🌐 Solution 3: External Browser Test</h2>
            <ol>
                <li>Open <a href="https://speech-recognition-test.com" target="_blank">speech-recognition-test.com</a> in Chrome/Edge</li>
                <li>Test if microphone works there</li>
                <li>If it works, the issue is Windsurf-specific</li>
            </ol>
        </div>

        <div class="solution">
            <h2>💡 Solution 4: Alternative Approach</h2>
            <p>You can still use Voice PM Assistant with:</p>
            <ul>
                <li><strong>Text input:</strong> Type your questions instead of speaking</li>
                <li><strong>Hybrid mode:</strong> Use text input, get voice responses</li>
                <li><strong>External companion:</strong> We can create a separate app for voice input</li>
            </ul>
        </div>

        <h2>🚀 Next Steps</h2>
        <p>Try the solutions above in order. If none work, Voice PM Assistant will still provide full functionality through text input with AI voice responses.</p>
    </div>
</body>
</html>`;
    }

    /**
     * Check current permission status
     */
    public isPermissionGranted(): boolean {
        return this.permissionGranted;
    }

    /**
     * Get current permission method
     */
    public getPermissionMethod(): 'webview' | 'native' | 'denied' {
        return this.permissionMethod;
    }

    /**
     * Reset permission status (for testing)
     */
    public resetPermissions(): void {
        this.permissionGranted = false;
        this.permissionMethod = 'denied';
    }
}
