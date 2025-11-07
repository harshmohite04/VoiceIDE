export type PlannedStep = {
  title: string;
  prompt: string;
  status?: 'queued' | 'running' | 'done';
};

export function planFromText(text: string): PlannedStep[] {
  return [
    { title: "Analyze Request", prompt: `Understand: "${text}"`, status: 'queued' },
    { title: "Modify Code", prompt: `Apply necessary code changes for: "${text}".`, status: 'queued' },
    { title: "Verify & Summarize", prompt: `Verify results and explain changes.`, status: 'queued' }
  ];
}
