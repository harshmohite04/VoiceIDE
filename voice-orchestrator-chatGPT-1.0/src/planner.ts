import * as vscode from "vscode";

type Step = { kind: "prompt"; text: string } | { kind: "wait"; ms: number };

type Plan = {
  title: string;
  steps: Step[];
  createdAt: number;
};

export class Planner {
  private queue: Plan[] = [];
  private active: Plan | null = null;
  private statusEmitter = new vscode.EventEmitter<string>();
  onStatus = this.statusEmitter.event;

  constructor(private llm: (input: string) => Promise<Plan>) {}

  enqueue(natural: string) {
    return this.llm(natural).then((plan) => {
      this.queue.push(plan);
      this.statusEmitter.fire(`Queued: ${plan.title}`);
      this.tick();
      return plan;
    });
  }

  getStatus(): string {
    const active = this.active ? `Active: ${this.active.title}` : "Idle";
    const q = this.queue.map(p => p.title).join(" → ");
    return q ? `${active} | Queue: ${q}` : active;
  }

  private async tick() {
    if (this.active || this.queue.length === 0) return;
    this.active = this.queue.shift()!;
    this.statusEmitter.fire(`Starting: ${this.active.title}`);

    for (const step of this.active.steps) {
      if (step.kind === "prompt") {
        // defer to IDE relay from extension.ts
        await vscode.commands.executeCommand("voiceOrch.enqueue", step.text);
      } else if (step.kind === "wait") {
        await new Promise(r => setTimeout(r, step.ms));
      }
    }

    this.statusEmitter.fire(`Completed: ${this.active.title}`);
    this.active = null;
    this.tick();
  }
}
