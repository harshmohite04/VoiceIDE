import whisper from "whisper-node"; 
import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export class STT {
  private model: any;
  private recording = false;
  private recorder: any;

  async init() {
    this.model = await whisper.loadModel(path.join(__dirname, "../models/ggml-base.en.bin"));
  }

  async start(callback: (text: string) => void) {
    if (this.recording) return;
    this.recording = true;

    const temp = path.join(os.tmpdir(), "voice-orch.wav");
    const { spawn } = require("child_process");

    this.recorder = spawn("sox", ["-d", "-q", "-r", "16000", "-c", "1", "-b", "16", temp]);

    vscode.window.showInformationMessage("🎙️ Listening...");

    this.recorder.on("close", async () => {
      if (!fs.existsSync(temp)) return;
      const result = await this.model.transcribe(temp);
      callback(result.text.toLowerCase().trim());
      fs.unlinkSync(temp);
    });
  }

  stop() {
    if (!this.recording) return;
    this.recording = false;
    if (this.recorder) this.recorder.kill("SIGINT");
    vscode.window.showInformationMessage("⏹️ Listening stopped.");
  }
}
