import { Module } from '@nitrostack/core';
import { AgileTools } from './agile.tools.js';
import { AgileService } from './agile.service.js';
import { JiraClient } from './jira.client.js';
import { SlackClient } from './chat.client.js';

@Module({
  name: 'agile',
  description:
    'Product Synchronizer & Scrum Analyst — live Jira sprint state and live Slack consensus, ' +
    'with the bundled fixtures as a fallback',
  controllers: [AgileTools],
  providers: [AgileService, JiraClient, SlackClient],
  exports: [AgileService, JiraClient, SlackClient],
})
export class AgileModule {}
