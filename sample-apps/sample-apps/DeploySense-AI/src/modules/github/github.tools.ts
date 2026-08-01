import { z } from 'zod';
import { ControllerDecorator as Controller, Injectable, ToolDecorator as Tool, Widget } from '@nitrostack/core';
import { GithubService } from './github.service.js';

@Injectable({ deps: [GithubService] })
@Controller()
export class GithubTools {
  constructor(private readonly githubService: GithubService) {}

  @Tool({
    name: 'github',
    description: 'Perform GitHub operations',
    inputSchema: z.object({
      action: z.enum(['getRecentCommits', 'getCommitDetails', 'getChangedFiles']),
      hash: z.string().optional()
    })
  })
  async execute(args: { action: string, hash?: string }) {
    switch(args.action) {
      case 'getRecentCommits': return { success: true, data: this.githubService.getRecentCommits() };
      case 'getCommitDetails': return { success: true, data: this.githubService.getCommitDetails(args.hash!) };
      case 'getChangedFiles': return { success: true, data: this.githubService.getChangedFiles() };
      default: throw new Error('Unknown action');
    }
  }
}
