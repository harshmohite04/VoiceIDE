import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Native Windows Speech Recognition Manager
 * Uses Windows Speech API directly, bypassing webview limitations
 */
export class NativeVoiceManager {
    private speechProcess: ChildProcess | null = null;
    private isListening = false;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Start native voice recognition using Windows Speech API
     */
    async startVoiceRecognition(): Promise<void> {
        if (this.isListening) {
            return;
        }

        try {
            // Create PowerShell script for Windows Speech Recognition
            const scriptPath = await this.createSpeechScript();
            
            // Start PowerShell process
            this.speechProcess = spawn('powershell.exe', [
                '-ExecutionPolicy', 'Bypass',
                '-File', scriptPath
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.isListening = true;

            // Handle speech recognition output
            this.speechProcess.stdout?.on('data', (data) => {
                const text = data.toString().trim();
                if (text && text !== '') {
                    this.onSpeechRecognized(text);
                }
            });

            // Handle errors
            this.speechProcess.stderr?.on('data', (data) => {
                console.error('Speech recognition error:', data.toString());
            });

            // Handle process exit
            this.speechProcess.on('close', (code) => {
                this.isListening = false;
                this.speechProcess = null;
                console.log(`Speech recognition process exited with code ${code}`);
            });

            vscode.window.showInformationMessage('🎤 Native voice recognition started! Speak now...');

        } catch (error) {
            this.isListening = false;
            throw new Error(`Failed to start native voice recognition: ${error}`);
        }
    }

    /**
     * Stop voice recognition
     */
    stopVoiceRecognition(): void {
        if (this.speechProcess) {
            this.speechProcess.kill();
            this.speechProcess = null;
        }
        this.isListening = false;
        vscode.window.showInformationMessage('🔇 Voice recognition stopped.');
    }

    /**
     * Check if currently listening
     */
    isCurrentlyListening(): boolean {
        return this.isListening;
    }

    /**
     * Create PowerShell script for Windows Speech Recognition
     */
    private async createSpeechScript(): Promise<string> {
        const scriptContent = `
# Windows Speech Recognition Script
Add-Type -AssemblyName System.Speech

# Create speech recognition engine
$recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine

# Set up grammar for general speech recognition
$grammar = New-Object System.Speech.Recognition.DictationGrammar
$recognizer.LoadGrammar($grammar)

# Set input to default microphone
$recognizer.SetInputToDefaultAudioDevice()

# Event handler for speech recognized
Register-ObjectEvent -InputObject $recognizer -EventName "SpeechRecognized" -Action {
    $text = $Event.SourceEventArgs.Result.Text
    if ($text -and $text.Length -gt 0) {
        Write-Output $text
        [Console]::Out.Flush()
    }
}

# Event handler for speech rejected
Register-ObjectEvent -InputObject $recognizer -EventName "SpeechRejected" -Action {
    # Optionally handle rejected speech
}

try {
    # Start recognition
    $recognizer.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)
    
    Write-Output "READY"
    [Console]::Out.Flush()
    
    # Keep the script running
    while ($true) {
        Start-Sleep -Milliseconds 100
    }
} catch {
    Write-Error "Speech recognition failed: $_"
} finally {
    if ($recognizer) {
        $recognizer.RecognizeAsyncStop()
        $recognizer.Dispose()
    }
}
`;

        const scriptPath = path.join(this.context.extensionPath, 'temp', 'speech-recognition.ps1');
        const tempDir = path.dirname(scriptPath);

        // Ensure temp directory exists
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Write script to file
        fs.writeFileSync(scriptPath, scriptContent, 'utf8');

        return scriptPath;
    }

    /**
     * Handle recognized speech text
     */
    private onSpeechRecognized(text: string): void {
        console.log('Speech recognized:', text);
        
        // Send to webview or handle the speech text
        vscode.commands.executeCommand('voicePM.updateUI', {
            type: 'speech_recognized',
            message: text,
            timestamp: new Date().toISOString()
        });

        // You can add more processing here:
        // - Send to AI for response
        // - Execute voice commands
        // - Update conversation history
    }

    /**
     * Test if Windows Speech Recognition is available
     */
    static async testAvailability(): Promise<boolean> {
        return new Promise((resolve) => {
            const testProcess = spawn('powershell.exe', [
                '-Command',
                'Add-Type -AssemblyName System.Speech; [System.Speech.Recognition.SpeechRecognitionEngine]::new() | Out-Null; Write-Output "AVAILABLE"'
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            testProcess.stdout?.on('data', (data) => {
                output += data.toString();
            });

            testProcess.on('close', (code) => {
                resolve(output.includes('AVAILABLE') && code === 0);
            });

            // Timeout after 5 seconds
            setTimeout(() => {
                testProcess.kill();
                resolve(false);
            }, 5000);
        });
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.stopVoiceRecognition();
        
        // Clean up temp files
        const tempDir = path.join(this.context.extensionPath, 'temp');
        if (fs.existsSync(tempDir)) {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (error) {
                console.error('Failed to clean up temp files:', error);
            }
        }
    }
}
