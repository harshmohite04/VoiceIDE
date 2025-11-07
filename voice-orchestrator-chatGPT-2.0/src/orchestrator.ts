import { IdeAiAdapter, getAdapter } from './adapters/ideAdapter';
import { planFromText, PlannedStep } from './planner';
import * as vscode from 'vscode';
import { VoiceTranscriber } from "./voiceTranscriber";
import { MicInput } from "./mic";

type Listener = () => void;

export class Orchestrator {
  private steps: PlannedStep[] = [];
  private jobTitle = '';
  private listeners: Listener[] = [];
  private adapter: IdeAiAdapter;
  private transcriber = new VoiceTranscriber();
  private mic = new MicInput();

  constructor(ctx: vscode.ExtensionContext) {
    const ide = vscode.workspace.getConfiguration('voiceOrchestrator').get<string>('ide', 'vscode');
    this.adapter = getAdapter(ide);
  }

  onDidChangeState(l: Listener) { this.listeners.push(l); }
  private emit() { this.listeners.forEach(l => l()); }

  get currentSteps() { return this.steps; }
  get currentJobTitle() { return this.jobTitle; }

  async handleUserInstruction(text: string) {
    this.jobTitle = text;
    this.steps = planFromText(text);
    this.emit();

    for (const step of this.steps) {
      step.status = 'running';
      this.emit();
      await this.adapter.sendPrompt(step);
      step.status = 'done';
      this.emit();
    }
  }

  async handleAudioChunk(base64Audio: string) {
  const text = await this.transcriber.transcribeWebmBase64(base64Audio);
  if (text && text.trim().length > 0) {
    this.handleUserInstruction(text.trim());
  }
}

  startVoiceListening() {
    this.mic.start();
    this.mic.on("audio", async (chunk: Buffer) => {
      const text = await this.transcriber.transcribePcm(chunk);
      if (text && text.trim().length > 0) {
        this.handleUserInstruction(text.trim());
      }
    });
  }

  getStatusSummary() {
    if (!this.jobTitle) return "No task running.";
    const done = this.steps.filter(s => s.status === 'done').length;
    return `Working on "${this.jobTitle}" — ${done}/${this.steps.length} steps completed.`;
  }
}
