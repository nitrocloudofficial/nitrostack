import { Module } from '@nitrostack/core';
import { JiraTools } from './jira.tools.js';

@Module({
  name: 'jira',
  description: 'Jira task tracking and reporting tools',
  controllers: [JiraTools]
})
export class JiraModule {}
