import { Module } from '@nitrostack/core';
import { ClinicalPromptsService } from './clinical.prompts.js';

@Module({
  name: 'clinical-prompts',
  description: 'Module providing 6 reusable MCP prompt templates for clinical reasoning, medication safety, differential diagnosis, and EMR report generation.',
  controllers: [ClinicalPromptsService],
  providers: [ClinicalPromptsService],
  exports: [ClinicalPromptsService]
})
export class PromptsModule {}
