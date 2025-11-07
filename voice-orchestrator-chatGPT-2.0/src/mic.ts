import recorder from "node-record-lpcm16";
import { EventEmitter } from "events";

export class MicInput extends EventEmitter {
  start() {
    recorder
      .record({
        sampleRateHertz: 16000,
        threshold: 0,
        verbose: false,
        recordProgram: "rec", // auto-installed on Mac/Linux, on Windows we switch below
      })
      .stream()
      .on("data", (chunk:any) => {
        this.emit("audio", chunk);
      });
  }
}
