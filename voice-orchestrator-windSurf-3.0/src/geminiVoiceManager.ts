import * as vscode from 'vscode';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { OpenAI } from 'openai';
import { ConversationContext } from './conversationContext';
import * as fs from 'fs';
import * as path from 'path';

export class GeminiVoiceManager {
    private ttsClient: TextToSpeechClient | null = null;
    private openai: OpenAI | null = null;
    private conversationContext: ConversationContext;
    private isListening = false;
    private isMuted = false;
    private isSessionActive = false;
    private recognition: any = null;
    private audioContext: AudioContext | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.conversationContext = new ConversationContext();
        this.initializeServices();
    }

    private async initializeServices() {
        const config = vscode.workspace.getConfiguration('voicePM');
        
        // Initialize Google Cloud Text-to-Speech
        const keyFilePath = config.get<string>('googleCloudKeyFile');
        const projectId = config.get<string>('googleProjectId');
        
        if (keyFilePath && projectId && fs.existsSync(keyFilePath)) {
            try {
                this.ttsClient = new TextToSpeechClient({
                    keyFilename: keyFilePath,
                    projectId: projectId
                });
            } catch (error) {
                console.error('Failed to initialize Google Cloud TTS:', error);
                vscode.window.showErrorMessage('Failed to initialize Google Cloud TTS. Please check your credentials.');
            }
        }

        // Initialize OpenAI
        const openaiKey = config.get<string>('openaiApiKey');
        if (openaiKey) {
            this.openai = new OpenAI({
                apiKey: openaiKey
            });
        }

        // Set conversation mode
        const mode = config.get<string>('conversationMode') || 'product_manager';
        this.conversationContext.setMode(mode);
    }

    async startVoiceSession(): Promise<void> {
        if (!this.ttsClient || !this.openai) {
            throw new Error('Please configure Google Cloud TTS and OpenAI API keys in settings');
        }

        if (this.isSessionActive) {
            vscode.window.showWarningMessage('Voice session is already active');
            return;
        }

        this.isSessionActive = true;
        await this.setupWebSpeechRecognition();
        
        // Welcome message
        await this.speakResponse("Hello! I'm your voice-powered product manager and discussion partner. How can I help you today?");
    }

    private async setupWebSpeechRecognition(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Create a webview to handle speech recognition using Web Speech API
            const panel = vscode.window.createWebviewPanel(
                'voicePMRecognition',
                'Voice PM Assistant - Voice Input',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    enableCommandUris: true,
                    enableFindWidget: true,
                    localResourceRoots: []
                }
            );

            panel.webview.html = this.getSpeechRecognitionHTML();

            // Handle messages from webview
            panel.webview.onDidReceiveMessage(
                async message => {
                    switch (message.command) {
                        case 'speechResult':
                            if (!this.isMuted && message.text.trim()) {
                                this.updateUI('recognized', message.text);
                                await this.processUserInput(message.text);
                            }
                            break;
                        case 'textInput':
                            if (!this.isMuted && message.text.trim()) {
                                this.updateUI('recognized', message.text);
                                await this.processUserInput(message.text);
                            }
                            break;
                        case 'speechError':
                            console.error('Speech recognition error:', message.error);
                            // Don't show error popup for permission issues, handle gracefully
                            if (message.error.includes('not-allowed') || message.error.includes('Permission denied')) {
                                this.updateUI('error', 'Microphone access denied. Please use text input or check permissions.');
                            } else {
                                vscode.window.showErrorMessage(`Speech recognition error: ${message.error}`);
                            }
                            break;
                        case 'speechStart':
                            this.isListening = true;
                            this.updateUI('listening', 'Listening...');
                            break;
                        case 'speechEnd':
                            this.isListening = false;
                            break;
                        case 'openExternal':
                            vscode.env.openExternal(vscode.Uri.parse(message.url));
                            break;
                    }
                },
                undefined,
                this.context.subscriptions
            );

            // Initialize the panel
            panel.webview.postMessage({ command: 'initialize' });
            resolve();
        });
    }

    private getSpeechRecognitionHTML(): string {
        const config = vscode.workspace.getConfiguration('voicePM');
        const language = config.get<string>('voiceLanguage') || 'en-US';

        return `<!DOCTYPE html>
<html>
<head>
    <title>Voice PM Assistant - Voice Input</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            background: #1e1e1e;
            color: #cccccc;
            margin: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
        }
        h1 {
            color: #4fc3f7;
            text-align: center;
            margin-bottom: 20px;
        }
        #status {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            background: #2d2d30;
            border: 1px solid #3e3e42;
            text-align: center;
        }
        .input-section {
            background: #252526;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 15px;
            border: 1px solid #3e3e42;
        }
        .input-section h3 {
            margin-top: 0;
            color: #4fc3f7;
        }
        #textInput {
            width: 100%;
            padding: 12px;
            border: 1px solid #3e3e42;
            border-radius: 6px;
            background: #1e1e1e;
            color: #cccccc;
            font-size: 16px;
            margin-bottom: 10px;
            box-sizing: border-box;
        }
        #textInput:focus {
            outline: none;
            border-color: #4fc3f7;
        }
        button {
            padding: 12px 24px;
            margin: 5px;
            border: none;
            border-radius: 6px;
            background: #0e639c;
            color: white;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }
        button:hover {
            background: #1177bb;
        }
        button:disabled {
            background: #3e3e42;
            cursor: not-allowed;
        }
        .voice-section {
            background: #252526;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #3e3e42;
        }
        #permissionHelp {
            padding: 15px;
            border-radius: 8px;
            background: #2d2d30;
            border: 1px solid #d19a66;
            display: none;
            margin-bottom: 15px;
        }
        .warning {
            background: #2d2d30;
            border: 1px solid #d19a66;
            color: #d19a66;
        }
        .success {
            background: #2d2d30;
            border: 1px solid #98c379;
            color: #98c379;
        }
        .error {
            background: #2d2d30;
            border: 1px solid #e06c75;
            color: #e06c75;
        }
        .conversation {
            background: #252526;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
            border: 1px solid #3e3e42;
            max-height: 200px;
            overflow-y: auto;
        }
        .message {
            margin-bottom: 10px;
            padding: 8px;
            border-radius: 4px;
        }
        .user-message {
            background: #0e639c;
            color: white;
        }
        .assistant-message {
            background: #2d2d30;
            border: 1px solid #3e3e42;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎤 Voice PM Assistant</h1>
        
        <div id="status">Ready to help! Use text input or voice recognition below.</div>
        
        <div class="input-section">
            <h3>💬 Text Input (Always Available)</h3>
            <input type="text" id="textInput" placeholder="Type your message here and press Enter..." />
            <button onclick="sendTextInput()" id="sendBtn">Send Message</button>
        </div>
        
        <div class="voice-section">
            <h3>🎙️ Voice Recognition (Optional)</h3>
            <div id="permissionHelp">
                <h4>⚠️ Microphone Permission Required</h4>
                <p>Voice recognition needs microphone access. If you prefer, you can use text input above instead.</p>
                <button onclick="requestPermission()">Try Voice Recognition</button>
            </div>
            <button onclick="startRecognition()" id="startBtn">Start Voice Recognition</button>
            <button onclick="stopRecognition()" id="stopBtn" style="display: none;">Stop Voice Recognition</button>
        </div>
        
        <div class="conversation" id="conversation" style="display: none;">
            <h4>Recent Messages:</h4>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        let recognition = null;
        let isListening = false;
        let permissionGranted = false;

        async function requestPermission() {
            document.getElementById('status').textContent = 'Requesting microphone permission...';
            
            try {
                // First check if mediaDevices is available
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('MediaDevices API not available in this environment');
                }

                // Request permission with specific constraints
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    } 
                });
                
                // Test that we actually got audio
                const audioTracks = stream.getAudioTracks();
                if (audioTracks.length === 0) {
                    throw new Error('No audio tracks available');
                }
                
                console.log('Microphone access granted:', audioTracks[0].label);
                
                // Clean up the test stream
                stream.getTracks().forEach(track => track.stop());
                
                permissionGranted = true;
                document.getElementById('permissionHelp').style.display = 'none';
                document.getElementById('status').textContent = 'Microphone access granted! Click "Start Voice Recognition" to begin.';
                document.getElementById('status').className = 'success';
                
                return true;
            } catch (error) {
                console.error('Permission request failed:', error);
                
                let errorMessage = 'Microphone access failed: ' + error.message;
                let helpText = '';
                
                if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
                    errorMessage = 'Microphone permission denied by browser';
                    helpText = 'Please click the microphone icon in the address bar and select "Allow"';
                } else if (error.name === 'NotFoundError') {
                    errorMessage = 'No microphone found on this device';
                    helpText = 'Please connect a microphone and try again';
                } else if (error.name === 'NotSupportedError') {
                    errorMessage = 'Microphone not supported in this browser environment';
                    helpText = 'This may be a limitation of the Windsurf webview environment';
                }
                
                document.getElementById('permissionHelp').style.display = 'block';
                document.getElementById('status').textContent = errorMessage;
                document.getElementById('status').className = 'error';
                
                if (helpText) {
                    document.getElementById('permissionHelp').innerHTML = 
                        '<h4>⚠️ Microphone Access Issue</h4><p>' + helpText + '</p>' +
                        '<button onclick="requestPermission()">Try Again</button>' +
                        '<button onclick="openExternalBrowser()">Open in External Browser</button>';
                }
                
                vscode.postMessage({ 
                    command: 'speechError', 
                    error: errorMessage + (helpText ? ' - ' + helpText : '')
                });
                
                return false;
            }
        }

        function openExternalBrowser() {
            vscode.postMessage({ 
                command: 'openExternal',
                url: 'https://speech-recognition-test.com'
            });
        }

        function initSpeechRecognition() {
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                recognition = new SpeechRecognition();
                
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = '${language}';
                
                recognition.onstart = () => {
                    isListening = true;
                    document.getElementById('status').textContent = 'Listening... Speak now!';
                    document.getElementById('startBtn').style.display = 'none';
                    document.getElementById('stopBtn').style.display = 'inline-block';
                    vscode.postMessage({ command: 'speechStart' });
                };
                
                recognition.onresult = (event) => {
                    let finalTranscript = '';
                    let interimTranscript = '';
                    
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            finalTranscript += transcript;
                        } else {
                            interimTranscript += transcript;
                        }
                    }
                    
                    if (finalTranscript) {
                        vscode.postMessage({ 
                            command: 'speechResult', 
                            text: finalTranscript 
                        });
                        document.getElementById('status').textContent = 'Heard: "' + finalTranscript + '"';
                    } else if (interimTranscript) {
                        document.getElementById('status').textContent = 'Listening: ' + interimTranscript;
                    }
                };
                
                recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    let errorMessage = event.error;
                    
                    if (event.error === 'not-allowed') {
                        errorMessage = 'Microphone permission denied. Please allow microphone access.';
                        document.getElementById('permissionHelp').style.display = 'block';
                    } else if (event.error === 'no-speech') {
                        errorMessage = 'No speech detected. Please try speaking again.';
                    } else if (event.error === 'network') {
                        errorMessage = 'Network error. Please check your internet connection.';
                    }
                    
                    document.getElementById('status').textContent = 'Error: ' + errorMessage;
                    document.getElementById('startBtn').style.display = 'inline-block';
                    document.getElementById('stopBtn').style.display = 'none';
                    
                    vscode.postMessage({ 
                        command: 'speechError', 
                        error: errorMessage 
                    });
                };
                
                recognition.onend = () => {
                    isListening = false;
                    document.getElementById('startBtn').style.display = 'inline-block';
                    document.getElementById('stopBtn').style.display = 'none';
                    vscode.postMessage({ command: 'speechEnd' });
                    
                    if (!recognition.stopped) {
                        document.getElementById('status').textContent = 'Recognition ended. Click "Start" to continue.';
                    }
                };
                
                return true;
            } else {
                document.getElementById('status').textContent = 'Speech recognition not supported in this browser.';
                return false;
            }
        }

        function startRecognition() {
            if (!permissionGranted) {
                requestPermission().then(granted => {
                    if (granted && recognition) {
                        try {
                            recognition.stopped = false;
                            recognition.start();
                        } catch (e) {
                            console.error('Failed to start recognition:', e);
                            document.getElementById('status').textContent = 'Failed to start: ' + e.message;
                        }
                    }
                });
            } else if (recognition) {
                try {
                    recognition.stopped = false;
                    recognition.start();
                } catch (e) {
                    console.error('Failed to start recognition:', e);
                    document.getElementById('status').textContent = 'Failed to start: ' + e.message;
                }
            }
        }

        function stopRecognition() {
            if (recognition && isListening) {
                recognition.stopped = true;
                recognition.stop();
                document.getElementById('status').textContent = 'Recognition stopped.';
            }
        }

        // Text input functionality
        function sendTextInput() {
            const textInput = document.getElementById('textInput');
            const text = textInput.value.trim();
            if (text) {
                addMessage('You: ' + text, 'user-message');
                vscode.postMessage({ 
                    command: 'textInput', 
                    text: text 
                });
                textInput.value = '';
                document.getElementById('status').textContent = 'Processing your message...';
            }
        }

        function addMessage(message, className) {
            const conversation = document.getElementById('conversation');
            conversation.style.display = 'block';
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + className;
            messageDiv.textContent = message;
            conversation.appendChild(messageDiv);
            conversation.scrollTop = conversation.scrollHeight;
        }

        // Enter key support for text input
        document.addEventListener('DOMContentLoaded', () => {
            const textInput = document.getElementById('textInput');
            textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendTextInput();
                }
            });
            
            // Initialize speech recognition
            initSpeechRecognition();
            
            // Show text input as primary option
            document.getElementById('status').textContent = 'Ready to help! Use text input or try voice recognition.';
        });

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'initialize':
                    // Extension is ready
                    break;
                case 'assistantResponse':
                    addMessage('Assistant: ' + message.text, 'assistant-message');
                    document.getElementById('status').textContent = 'Response received. Ready for next message.';
                    break;
            }
        });
    </script>
</body>
</html>`;
    }

    private async processUserInput(userInput: string): Promise<void> {
        try {
            this.updateUI('thinking', 'Processing...');
            
            // Add user input to conversation context
            this.conversationContext.addUserMessage(userInput);
            
            // Get AI response
            const response = await this.getAIResponse();
            
            // Add AI response to context
            this.conversationContext.addAssistantMessage(response);
            
            // Speak the response
            await this.speakResponse(response);
            
            this.updateUI('response', response);
            
        } catch (error) {
            console.error('Error processing user input:', error);
            const errorMessage = "I'm sorry, I encountered an error processing your request. Please try again.";
            await this.speakResponse(errorMessage);
            this.updateUI('error', errorMessage);
        }
    }

    private async getAIResponse(): Promise<string> {
        if (!this.openai) {
            throw new Error('OpenAI not initialized');
        }

        const messages = this.conversationContext.getMessages();
        
        const completion = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: messages,
            max_tokens: 500,
            temperature: 0.7
        });

        return completion.choices[0]?.message?.content || "I'm not sure how to respond to that.";
    }

    private async speakResponse(text: string): Promise<void> {
        if (!this.ttsClient) {
            console.log('TTS not available, skipping speech synthesis');
            return;
        }

        try {
            const config = vscode.workspace.getConfiguration('voicePM');
            const voiceName = config.get<string>('geminiVoice') || 'en-US-Standard-J';
            const languageCode = config.get<string>('voiceLanguage') || 'en-US';

            const request = {
                input: { text: text },
                voice: { 
                    languageCode: languageCode,
                    name: voiceName 
                },
                audioConfig: { 
                    audioEncoding: 'MP3' as const,
                    speakingRate: 1.0,
                    pitch: 0.0,
                    volumeGainDb: 0.0
                },
            };

            const [response] = await this.ttsClient.synthesizeSpeech(request);
            
            if (response.audioContent) {
                // Save audio to temp file and play it
                const tempDir = this.context.globalStorageUri.fsPath;
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }
                
                const audioPath = path.join(tempDir, 'tts_output.mp3');
                fs.writeFileSync(audioPath, response.audioContent, 'binary');
                
                // Play the audio file
                await this.playAudioFile(audioPath);
            }
        } catch (error) {
            console.error('Error in text-to-speech:', error);
            vscode.window.showErrorMessage(`TTS Error: ${error}`);
        }
    }

    private async playAudioFile(filePath: string): Promise<void> {
        return new Promise((resolve) => {
            // Create a webview to play audio
            const panel = vscode.window.createWebviewPanel(
                'audioPlayer',
                'Audio Player',
                { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
                {
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.file(path.dirname(filePath))]
                }
            );

            const audioUri = panel.webview.asWebviewUri(vscode.Uri.file(filePath));
            
            panel.webview.html = `
                <!DOCTYPE html>
                <html>
                <body>
                    <audio id="audioPlayer" autoplay style="display: none;">
                        <source src="${audioUri}" type="audio/mpeg">
                    </audio>
                    <script>
                        const audio = document.getElementById('audioPlayer');
                        audio.onended = () => {
                            // Close the panel when audio finishes
                            setTimeout(() => {
                                window.close();
                            }, 100);
                        };
                        audio.onerror = () => {
                            console.error('Audio playback error');
                            setTimeout(() => {
                                window.close();
                            }, 100);
                        };
                    </script>
                </body>
                </html>
            `;

            // Close panel after a reasonable timeout
            setTimeout(() => {
                panel.dispose();
                resolve();
            }, 10000);

            panel.onDidDispose(() => {
                resolve();
            });
        });
    }

    stopVoiceSession(): void {
        this.isSessionActive = false;
        this.isListening = false;
        this.updateUI('stopped', 'Voice session stopped');
    }

    toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        this.updateUI('mute', this.isMuted ? 'Muted' : 'Unmuted');
        return this.isMuted;
    }

    private updateUI(type: string, message: string) {
        // This will be used to update the webview UI
        vscode.commands.executeCommand('voicePM.updateUI', { type, message, timestamp: new Date() });
    }

    getConversationHistory(): any[] {
        return this.conversationContext.getMessages();
    }

    clearConversation(): void {
        this.conversationContext.clear();
    }

    dispose(): void {
        this.stopVoiceSession();
    }
}
