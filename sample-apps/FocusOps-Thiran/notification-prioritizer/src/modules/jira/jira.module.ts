import { Module } from '@nitrostack/core';
import { JiraTools } from './jira.tools.js';

@Module({
  name: 'jira',
  description: 'Jira integration module',
  controllers: [JiraTools]
})
export class JiraModule {}
