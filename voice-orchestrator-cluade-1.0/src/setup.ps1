# Voice Task Planner - Automatic Setup Script
# Run this in PowerShell from your project root

Write-Host "🚀 Setting up Voice Task Planner Extension..." -ForegroundColor Cyan

# Create src folder if it doesn't exist
if (-not (Test-Path "src")) {
    New-Item -ItemType Directory -Path "src" -Force | Out-Null
    Write-Host "✅ Created src folder" -ForegroundColor Green
} else {
    Write-Host "✅ src folder exists" -ForegroundColor Green
}

# Create extension.ts
Write-Host "📝 Creating extension.ts..." -ForegroundColor Cyan
$extensionContent = @'
// extension.ts - Main entry point for VSCode extension
import * as vscode from 'vscode';

// Task representation
interface Task {
    id: string;
    step: number;
    action: string;
    prompt: string;
    status: 'pending' | 'executing' | 'completed' | 'failed';
    result?: string;
}

interface TaskPlan {
    taskId: string;
    originalIntent: string;
    steps: Task[];
    currentStep: number;
    status: 'idle' | 'planning' | 'executing' | 'completed';
}

class VoiceTaskOrchestrator {
    private currentPlan: TaskPlan | null = null;
    private statusBarItem: vscode.StatusBarItem;
    private outputChannel: vscode.OutputChannel;

    constructor(private context: vscode.ExtensionContext) {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right, 
            100
        );
        this.outputChannel = vscode.window.createOutputChannel('Voice Task Planner');
        this.statusBarItem.text = "$(mic) Voice Task Planner";
        this.statusBarItem.command = 'voiceTaskPlanner.startListening';
        this.statusBarItem.show();
    }

    async startVoiceInput(): Promise<string> {
        const input = await vscode.window.showInputBox({
            prompt: 'What would you like me to do? (Voice input coming soon)',
            placeHolder: 'e.g., Fix the login bug and add tests'
        });
        
        return input || '';
    }

    async planTask(userIntent: string): Promise<TaskPlan> {
        this.outputChannel.appendLine(`🎯 Planning task: ${userIntent}`);
        this.statusBarItem.text = "$(loading~spin) Planning...";

        const steps = await this.decomposeTask(userIntent);

        const plan: TaskPlan = {
            taskId: `task_${Date.now()}`,
            originalIntent: userIntent,
            steps: steps,
            currentStep: 0,
            status: 'planning'
        };

        this.currentPlan = plan;
        return plan;
    }

    private async decomposeTask(intent: string): Promise<Task[]> {
        const keywords = intent.toLowerCase();
        const steps: Task[] = [];
        let stepNumber = 1;

        if (keywords.includes('fix') || keywords.includes('bug')) {
            steps.push({
                id: `step_${stepNumber}`,
                step: stepNumber++,
                action: 'analyze',
                prompt: `Analyze the codebase to identify the issue related to: ${intent}`,
                status: 'pending'
            });

            steps.push({
                id: `step_${stepNumber}`,
                step: stepNumber++,
                action: 'fix',
                prompt: `Fix the identified issue`,
                status: 'pending'
            });
        }

        if (keywords.includes('test')) {
            steps.push({
                id: `step_${stepNumber}`,
                step: stepNumber++,
                action: 'test',
                prompt: `Write comprehensive tests for the changes`,
                status: 'pending'
            });
        }

        if (keywords.includes('document') || keywords.includes('docs')) {
            steps.push({
                id: `step_${stepNumber}`,
                step: stepNumber++,
                action: 'document',
                prompt: `Update documentation to reflect the changes`,
                status: 'pending'
            });
        }

        steps.push({
            id: `step_${stepNumber}`,
            step: stepNumber++,
            action: 'verify',
            prompt: `Verify all changes work correctly and run tests`,
            status: 'pending'
        });

        return steps;
    }

    async executeTask() {
        if (!this.currentPlan) return;

        this.currentPlan.status = 'executing';
        this.outputChannel.appendLine(`\n🚀 Starting execution of ${this.currentPlan.steps.length} steps`);

        for (let i = 0; i < this.currentPlan.steps.length; i++) {
            const step = this.currentPlan.steps[i];
            this.currentPlan.currentStep = i;

            this.outputChannel.appendLine(`\n📍 Step ${step.step}/${this.currentPlan.steps.length}: ${step.action}`);
            this.statusBarItem.text = `$(loading~spin) Step ${step.step}/${this.currentPlan.steps.length}`;

            step.status = 'executing';

            await this.sendToCursorAI(step.prompt);

            const result = await vscode.window.showInformationMessage(
                `Step ${step.step}: ${step.action} - Is this step complete?`,
                'Yes, Continue',
                'No, Retry',
                'Cancel'
            );

            if (result === 'Yes, Continue') {
                step.status = 'completed';
                this.outputChannel.appendLine(`✅ Step ${step.step} completed`);
            } else if (result === 'No, Retry') {
                i--;
                step.status = 'pending';
            } else {
                step.status = 'failed';
                this.outputChannel.appendLine(`❌ Task cancelled at step ${step.step}`);
                break;
            }
        }

        this.currentPlan.status = 'completed';
        this.statusBarItem.text = "$(check) Task Complete";
        this.outputChannel.appendLine(`\n✨ All steps completed!`);
    }

    private async sendToCursorAI(prompt: string) {
        try {
            await vscode.commands.executeCommand('composer.startComposerChat');
            await vscode.env.clipboard.writeText(prompt);
            this.outputChannel.appendLine(`📤 Sent to Cursor AI: ${prompt}`);
            
            vscode.window.showInformationMessage(
                `Prompt ready in clipboard. Paste into Cursor AI chat.`
            );
        } catch (error) {
            this.outputChannel.appendLine(`⚠️ Could not auto-send. Copy this prompt: ${prompt}`);
        }
    }

    getCurrentStatus(): string {
        if (!this.currentPlan) {
            return "No active task";
        }

        const completed = this.currentPlan.steps.filter(s => s.status === 'completed').length;
        const total = this.currentPlan.steps.length;
        const current = this.currentPlan.steps[this.currentPlan.currentStep];

        return `
Task: ${this.currentPlan.originalIntent}
Progress: ${completed}/${total} steps completed
Current: ${current?.action} - ${current?.prompt}
Status: ${this.currentPlan.status}
        `.trim();
    }

    async showStatus() {
        const status = this.getCurrentStatus();
        this.outputChannel.show();
        this.outputChannel.appendLine(`\n📊 Current Status:\n${status}`);
        vscode.window.showInformationMessage(status);
    }

    dispose() {
        this.statusBarItem.dispose();
        this.outputChannel.dispose();
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Voice Task Planner is now active!');

    const orchestrator = new VoiceTaskOrchestrator(context);

    let startListening = vscode.commands.registerCommand(
        'voiceTaskPlanner.startListening',
        async () => {
            const userIntent = await orchestrator.startVoiceInput();
            if (userIntent) {
                await orchestrator.planTask(userIntent);
                await orchestrator.executeTask();
            }
        }
    );

    let showStatus = vscode.commands.registerCommand(
        'voiceTaskPlanner.showStatus',
        () => {
            orchestrator.showStatus();
        }
    );

    context.subscriptions.push(startListening);
    context.subscriptions.push(showStatus);
    context.subscriptions.push(orchestrator);
}

export function deactivate() {}
'@

$extensionContent | Out-File -FilePath "src\extension.ts" -Encoding UTF8
Write-Host "✅ Created src/extension.ts" -ForegroundColor Green

# Create tsconfig.json if it doesn't exist
if (-not (Test-Path "tsconfig.json")) {
    Write-Host "📝 Creating tsconfig.json..." -ForegroundColor Cyan
    $tsconfigContent = @'
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", ".vscode-test", "out"]
}
'@
    $tsconfigContent | Out-File -FilePath "tsconfig.json" -Encoding UTF8
    Write-Host "✅ Created tsconfig.json" -ForegroundColor Green
}

# Create .vscode folder and launch.json
if (-not (Test-Path ".vscode")) {
    New-Item -ItemType Directory -Path ".vscode" -Force | Out-Null
}

$launchContent = @'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/out/**/*.js"
      ],
      "preLaunchTask": "${defaultBuildTask}"
    }
  ]
}
'@

$launchContent | Out-File -FilePath ".vscode\launch.json" -Encoding UTF8
Write-Host "✅ Created .vscode/launch.json" -ForegroundColor Green

# Check if package.json exists
if (-not (Test-Path "package.json")) {
    Write-Host "⚠️  package.json not found. Creating it..." -ForegroundColor Yellow
    $packageContent = @'
{
  "name": "voice-task-planner",
  "displayName": "Voice AI Task Planner",
  "description": "Voice-controlled AI orchestrator for Cursor and Windsurf",
  "version": "0.1.0",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": [
    "Other",
    "Machine Learning"
  ],
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "voiceTaskPlanner.startListening",
        "title": "Start Voice Task",
        "category": "Voice Task Planner",
        "icon": "$(mic)"
      },
      {
        "command": "voiceTaskPlanner.showStatus",
        "title": "Show Current Task Status",
        "category": "Voice Task Planner",
        "icon": "$(info)"
      }
    ],
    "keybindings": [
      {
        "command": "voiceTaskPlanner.startListening",
        "key": "ctrl+shift+v",
        "mac": "cmd+shift+v"
      },
      {
        "command": "voiceTaskPlanner.showStatus",
        "key": "ctrl+shift+s",
        "mac": "cmd+shift+s"
      }
    ],
    "menus": {
      "commandPalette": [
        {
          "command": "voiceTaskPlanner.startListening"
        },
        {
          "command": "voiceTaskPlanner.showStatus"
        }
      ]
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile && npm run lint",
    "lint": "eslint src --ext ts",
    "test": "node ./out/test/runTest.js"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "18.x",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0",
    "eslint": "^8.54.0",
    "typescript": "^5.3.2"
  },
  "dependencies": {
    "openai": "^4.20.0"
  }
}
'@
    $packageContent | Out-File -FilePath "package.json" -Encoding UTF8
    Write-Host "✅ Created package.json" -ForegroundColor Green
}

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Cyan
npm install

# Compile
Write-Host "`n🔨 Compiling TypeScript..." -ForegroundColor Cyan
npm run compile

Write-Host "`n✨ Setup complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Open this folder in VSCode/Cursor" -ForegroundColor White
Write-Host "2. Press F5 to run the extension" -ForegroundColor White
Write-Host "3. Press Ctrl+Shift+V to test it!" -ForegroundColor White