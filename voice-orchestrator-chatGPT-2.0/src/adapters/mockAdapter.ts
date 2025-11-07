import { IdeAiAdapter } from './ideAdapter';
import { PlannedStep } from '../planner';

export class MockAdapter implements IdeAiAdapter {
  async sendPrompt(step: PlannedStep) {
    console.log(`[MOCK] ${step.title}: ${step.prompt}`);
  }
}
