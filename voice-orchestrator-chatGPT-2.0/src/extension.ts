import * as vscode from 'vscode';
import { Orchestrator } from './orchestrator';
import { StatusViewProvider } from './statusPanel';

let orchestrator: Orchestrator;

export function activate(context: vscode.ExtensionContext) {
  orchestrator = new Orchestrator(context);

  const provider = new StatusViewProvider(context.extensionUri, orchestrator);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('voiceOrchestrator.sidebar', provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('voiceOrchestrator.start', () => {
      provider.reveal();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('voiceOrchestrator.status', () => {
      vscode.window.showInformationMessage(orchestrator.getStatusSummary());
    })
  );
}

export function deactivate() {}
