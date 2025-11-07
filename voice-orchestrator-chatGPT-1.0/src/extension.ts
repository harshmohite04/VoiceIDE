import * as vscode from "vscode";
import { Planner } from "./planner";
import { IDERelay } from "./relay";
import * as path from "path";
import { STT } from "./stt";

export async function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("Voice Orchestrator");
  const cfg = vscode.workspace.getConfiguration("voiceOrch");
  const wakeWord = (cfg.get<string>("wakeWord") || "hey code").toLowerCase();

  // Initialize Speech-to-Text
  const stt = new STT();
  await stt.init();
  let sttActive = false;

  // Task Planner
  async function llmPlan(input: string) {
    if (/what.*going on|status|progress/i.test(input)) {
      vscode.commands.executeCommand("voiceOrch.askStatus");
      return { title: "Status Query", steps: [], createdAt: Date.now() };
    }

    return {
      title: `Orchestrate: ${input.slice(0, 60)}`,
      createdAt: Date.now(),
      steps: [
        { kind: "prompt", text: `Analyze the codebase for: ${input}. Identify files impacted and propose a step-by-step plan.` },
        { kind: "wait", ms: 2000 },
        { kind: "prompt", text: `Proceed with the first concrete change for: ${input}. Show a concise diff and ask for confirmation if destructive.` },
        { kind: "wait", ms: 1500 },
        { kind: "prompt", text: `Apply remaining changes for: ${input}. Ensure build/tests pass. Summarize decisions.` }
      ]
    };
  }

  const planner = new Planner(llmPlan);

  // Status Bar Indicator
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.text = "🎙️ Voice Idle";
  status.show();
  const d1 = planner.onStatus(text => { status.text = `🎙️ ${text}`; output.appendLine(text); });

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("voiceOrch.askStatus", () => {
      vscode.window.showInformationMessage(planner.getStatus());
    }),
    vscode.commands.registerCommand("voiceOrch.enqueue", async (prompt?: string) => {
      if (!prompt) return;
      webviewPanel?.webview.postMessage({ type: "pause" });
      await IDERelay.tryVendorCommands(prompt);
      webviewPanel?.webview.postMessage({ type: "resume" });
    }),
    status, d1, output
  );

  // Sidebar Webview Panel
  let webviewPanel: vscode.WebviewView | null = null;

  const provider: vscode.WebviewViewProvider = {
    resolveWebviewView(webviewView) {
      webviewPanel = webviewView;
      webviewView.webview.options = { enableScripts: true };
      webviewView.webview.html = getSidebarHtml(webviewView.webview, context);

      webviewView.webview.onDidReceiveMessage(async (msg) => {
        if (msg.type === "toggle") {
          if (!sttActive) {
            sttActive = true;
            stt.start(async (raw: string) => {
              let text = raw.toLowerCase().trim();
              if (text.startsWith(wakeWord)) text = text.replace(wakeWord, "").trim();
              if (!text) return;
              await planner.enqueue(text);
            });
          } else {
            sttActive = false;
            stt.stop();
          }
        }
      });
    }
  };

  vscode.window.registerWebviewViewProvider("voiceOrch.sidebar", provider);
}

export function deactivate() {}

function getSidebarHtml(webview: vscode.Webview, ctx: vscode.ExtensionContext) {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.file(path.join(ctx.extensionPath, "media", "sidebar.js"))
  );
  const nonce = String(Date.now());

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; img-src ${webview.cspSource} https:;
  style-src ${webview.cspSource} 'unsafe-inline';
  script-src 'nonce-${nonce}'; media-src blob:;
  connect-src ${webview.cspSource} https: blob:;">
<style>
body { font-family: ui-sans-serif, system-ui; padding: 8px; }
.card { border: 1px solid #3333; border-radius: 12px; padding: 12px; }
.row { display: flex; gap: 8px; align-items: center; }
.pill { padding: 2px 8px; border-radius: 999px; background: #eee1; }
button { padding: 6px 10px; border-radius: 8px; }
</style>
</head>
<body>
  <div class="card">
    <div class="row">
      <div class="pill">Wake Word: <b>${cfg.get("wakeWord")}</b></div>
      <button id="toggle">Start</button>
    </div>
    <div id="log" style="margin-top:8px;font-size:12px;opacity:.8;">Press Start and speak.</div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
