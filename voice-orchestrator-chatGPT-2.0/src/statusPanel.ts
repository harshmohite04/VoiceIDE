import * as vscode from "vscode";
import * as fs from "fs";
import { Orchestrator } from "./orchestrator";

export class StatusViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly orchestrator: Orchestrator
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this.view = webviewView;

    const webview = webviewView.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")],
    };

    webview.html = this.getHtmlForWebview(webview);

    // ✅ Correct message routing
    webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case "userText":
          this.orchestrator.handleUserInstruction(message.text);
          break;

        case "audioChunk":
          this.orchestrator.handleAudioChunk(message.data);
          break;

        case "status":
          this.postLog(this.orchestrator.getStatusSummary());
          break;
          
        case "startVoice":
          this.orchestrator.startVoiceListening();
          this.postLog("🎤 Mic activated.");
          break;
      }
    });

    this.orchestrator.onDidChangeState(() => this.postState());
    this.postState();
  }

  reveal() {
    this.view?.show?.(true);
  }

  postState() {
    this.view?.webview.postMessage({
      type: "state",
      job: this.orchestrator.currentJobTitle,
      steps: this.orchestrator.currentSteps,
    });
  }

  postLog(message: string) {
    this.view?.webview.postMessage({ type: "log", message });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const panelHtmlPath = vscode.Uri.joinPath(this.extensionUri, "media", "panel.html");
    const panelJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "media", "panel.js"));
    const rawHtml = fs.readFileSync(panelHtmlPath.fsPath, "utf8");

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="script-src ${webview.cspSource}; style-src 'unsafe-inline';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        ${rawHtml}
        <script src="${panelJsUri}"></script>
      </body>
      </html>
    `;
  }
}
