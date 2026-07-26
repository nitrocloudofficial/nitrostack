import { Module } from '@nitrostack/core';
import { SharedModule } from '../shared/shared.module.js';
import { CareMediatorPrompts } from './care-mediator.prompts.js';

/**
 * PromptsModule — reusable, data-grounded prompt templates for the
 * hospital/insurer/patient workflows this server models. All prompts read
 * live case data through CaseStoreService (SharedModule), so they stay
 * accurate as cases change instead of shipping static example text.
 */
@Module({
  name: 'prompts',
  description: 'Care Mediator prompt templates for claim auditing, patient communication, and triage',
  imports: [SharedModule],
  controllers: [CareMediatorPrompts],
})
export class PromptsModule {}
