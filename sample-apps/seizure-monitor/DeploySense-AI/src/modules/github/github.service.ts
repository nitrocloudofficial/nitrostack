import { Injectable } from '@nitrostack/core';
import { ConfigService } from '../config/config.service.js';

@Injectable({ deps: [ConfigService] })
export class GithubService {
  constructor(private readonly configService: ConfigService) {}

  private getData() {
    return this.configService.getMockData('github');
  }

  getRecentCommits() {
    return this.getData().commits;
  }

  getCommitDetails(hash: string) {
    const commits = this.getData().commits;
    return commits.find((c: any) => c.hash === hash) || null;
  }

  getChangedFiles() {
    return this.getData().changedFiles;
  }
}

