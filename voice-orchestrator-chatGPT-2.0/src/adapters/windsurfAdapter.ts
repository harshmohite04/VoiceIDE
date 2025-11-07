import * as vscode from 'vscode';
import { IdeAiAdapter } from './ideAdapter';
import { PlannedStep } from '../planner';

export class WindsurfAdapter implements IdeAiAdapter {
  async sendPrompt(step: PlannedStep) {
    const prompt = `# Step: ${step.title}\n${step.prompt}`;
    await vscode.env.clipboard.writeText(prompt);
    vscode.window.showInformationMessage("Windsurf: Prompt pasted. Press Enter to submit.");
  }
}
