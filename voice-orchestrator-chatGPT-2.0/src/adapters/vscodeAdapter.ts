import * as vscode from 'vscode';
import { PlannedStep } from '../planner';
import { IdeAiAdapter } from './ideAdapter';

export class VsCodeAdapter implements IdeAiAdapter {
  async sendPrompt(step: PlannedStep) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    editor.insertSnippet(new vscode.SnippetString(`// ${step.title}\n// ${step.prompt}\n`));
  }
}
