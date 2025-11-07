import { PlannedStep } from '../planner';
import { CursorAdapter } from './cursorAdapter';
import { WindsurfAdapter } from './windsurfAdapter';
import { VsCodeAdapter } from './vscodeAdapter';
import { MockAdapter } from './mockAdapter';

export interface IdeAiAdapter {
  sendPrompt(step: PlannedStep): Promise<void>;
}

export function getAdapter(kind: string): IdeAiAdapter {
  switch (kind) {
    case "cursor": return new CursorAdapter();
    case "windsurf": return new WindsurfAdapter();
    case "vscode": return new VsCodeAdapter();
    default: return new MockAdapter();
  }
}
