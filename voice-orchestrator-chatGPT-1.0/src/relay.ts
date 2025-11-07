import * as vscode from "vscode";

export class IDERelay {
  // Try generic VS Code Inline Chat first
  static async sendToInlineChat(prompt: string) {
    // Start inline chat on selection/active editor if possible
    try {
      await vscode.commands.executeCommand("workbench.action.chat.open");
    } catch {}
    try {
      await vscode.commands.executeCommand("inlineChat.start");
    } catch {}

    // Paste prompt and submit (fallback: show input box)
    const pasted = await vscode.env.clipboard.readText();
    await vscode.env.clipboard.writeText(prompt);

    // Try generic 'type' into chat input
    try { await vscode.commands.executeCommand("editor.action.clipboardPasteAction"); } catch {}

    // Many chat UIs submit on Enter; emulate enter
    try { await vscode.commands.executeCommand("type", { text: "\n" }); } catch {}

    // restore clipboard
    await vscode.env.clipboard.writeText(pasted);
  }

  // If Cursor/Windsurf expose commands, discover & use them
  static async tryVendorCommands(prompt: string) {
    const all = await vscode.commands.getCommands(true);
    const vendor = all.filter(c =>
      /cursor|windsurf|aider|ai.*chat/i.test(c) && /open|start|focus|chat|submit/i.test(c)
    );

    // best-effort: call an open/focus command then try a 'submit' style command
    for (const cmd of vendor) {
      try { await vscode.commands.executeCommand(cmd); } catch {}
    }
    await IDERelay.sendToInlineChat(prompt);
  }
}
