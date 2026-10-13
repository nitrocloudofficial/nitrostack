import { Module } from '@nitrostack/core';
import { JiraService } from './jira.service.js';
import { JiraTools } from './jira.tools.js';
import { ConfigModule } from '../config/config.module.js';

@Module({
  name: 'jiramodule',
  imports: [ConfigModule],
  controllers: [JiraTools],
  providers: [JiraService],
  exports: [JiraService],
})
export class JiraModule {}

