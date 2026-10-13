import { Module } from '@nitrostack/core';
import { WorkspaceStore } from './workspace.store.js';
import { WorkspaceTools } from './workspace.tools.js';

@Module({
  name: 'workspace',
  description: 'Workspace provisioning system for email, Slack, and drive access',
  providers: [WorkspaceStore],
  controllers: [WorkspaceTools],
})
export class WorkspaceModule {}
