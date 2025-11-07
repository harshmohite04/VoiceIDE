import * as vscode from "vscode";
import * as dotenv from "dotenv";

dotenv.config({ path: `${__dirname}/../.env` });


export class VoiceTranscriber {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    if (!this.apiKey) {
      vscode.window.showErrorMessage("GROQ_API_KEY not found in .env");
    }
  }

    async transcribePcm(chunk: Buffer): Promise<string> {
    if (!this.apiKey) return "";

    const form = new FormData();
    form.append("file", new Blob([chunk], { type: "audio/raw" }), "audio.raw");
    form.append("model", "whisper-large-v3");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${this.apiKey}` },
        body: form,
    });

    const json = await res.json();
    return json.text ?? "";
    }

}
