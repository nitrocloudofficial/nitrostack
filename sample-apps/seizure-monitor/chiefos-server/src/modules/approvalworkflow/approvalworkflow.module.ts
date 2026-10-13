import { Module } from '@nitrostack/core';
import { ApprovalWorkflowTools } from './approvalworkflow.tools.js';
import { ApprovalWorkflowResources } from './approvalworkflow.resources.js';
import { ApprovalWorkflowPrompts } from './approvalworkflow.prompts.js';

@Module({
  name: 'approvalworkflow',
  description: 'TODO: Add description',
  controllers: [ApprovalWorkflowTools, ApprovalWorkflowResources, ApprovalWorkflowPrompts],
})
export class ApprovalWorkflowModule {}
