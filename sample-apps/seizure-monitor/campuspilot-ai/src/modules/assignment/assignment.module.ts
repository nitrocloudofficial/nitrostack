import { Module } from '@nitrostack/core';
import { AssignmentTools } from './assignment.tools.js';
import { AssignmentResources } from './assignment.resources.js';
import { AssignmentPrompts } from './assignment.prompts.js';

@Module({
  name: 'assignment',
  description: 'Assignment tracking and deadline management agent',
  controllers: [AssignmentTools, AssignmentResources, AssignmentPrompts],
})
export class AssignmentModule {}
