import { Module } from '@nitrostack/core';
import { IssueTools } from './issue.tools.js';
import { IssueService } from './issue.service.js';

@Module({
  name: 'issue',
  description: 'Issue tracker MCP server',
  controllers: [IssueTools],
  providers: [IssueService]
})
export class IssueModule {}
