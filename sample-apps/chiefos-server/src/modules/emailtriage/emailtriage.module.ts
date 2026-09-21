import { Module } from '@nitrostack/core';
import { EmailTriageTools } from './emailtriage.tools.js';
import { EmailTriageResources } from './emailtriage.resources.js';
import { EmailTriagePrompts } from './emailtriage.prompts.js';

@Module({
  name: 'emailtriage',
  description: 'TODO: Add description',
  controllers: [EmailTriageTools, EmailTriageResources, EmailTriagePrompts],
})
export class EmailTriageModule {}
