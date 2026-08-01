import { Module } from '@nitrostack/core';
import { GitHubService } from './github.service.js';
import { GitHubTools } from './github.tools.js';

@Module({
    name: 'github',
    description: 'GitHub API integration — repo tree, file content, PR diffs, commits',
    controllers: [GitHubTools],
    providers: [GitHubService],
})
export class GitHubModule { }
