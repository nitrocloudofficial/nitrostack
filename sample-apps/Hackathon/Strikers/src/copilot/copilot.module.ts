import { Module } from '@nitrostack/core';
import { CopilotTools } from './copilot.tools.js';

@Module({
  name: 'copilot',
  description: 'AI Healthcare Copilot handling symptom analysis and emergency detection',
  controllers: [CopilotTools],
})
export class CopilotModule {}
