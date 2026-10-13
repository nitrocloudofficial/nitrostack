import { Injectable, OnModuleInit } from '@nitrostack/core';
import { Octokit } from '@octokit/rest';
import { AppConfigService } from '../../config/app.config.js';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface RepositorySearchResult {
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  url: string;
  defaultBranch: string;
}

/**
 * GitHub Integration Service
 *
 * Wraps @octokit/rest for search, file fetching, cloning, and issue management.
 */
@Injectable()
export class GithubService implements OnModuleInit {
  private octokit!: Octokit;

  constructor(private readonly config: AppConfigService) {}

 async onModuleInit(): Promise<void> {
  const token = this.config?.githubToken;
  this.octokit = new Octokit({
    auth: token,
  });
  console.error(`✅ GitHub service initialized ${token ? '(authenticated)' : '(unauthenticated)'}`);
}

  /**
   * Search GitHub repositories.
   */
  async searchRepositories(query: string, limit = 10): Promise<RepositorySearchResult[]> {
    const res = await this.octokit.rest.search.repos({
      q: query,
      per_page: limit,
    });

    return res.data.items.map((repo) => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      stars: repo.stargazers_count,
      url: repo.html_url,
      defaultBranch: repo.default_branch,
    }));
  }

  /**
   * Get file content from a public or accessible GitHub repository.
   */
  async getFileContent(owner: string, repo: string, filePath: string): Promise<string> {
    const res = await this.octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
    });

    if ('content' in res.data && typeof res.data.content === 'string') {
      return Buffer.from(res.data.content, 'base64').toString('utf-8');
    }

    throw new Error(`Path ${filePath} in ${owner}/${repo} is not a file.`);
  }

  /**
   * Clone a GitHub repository locally into DATA_DIR/clones/
   */
  async cloneRepository(owner: string, repo: string, targetName?: string): Promise<{ localPath: string; url: string }> {
    const clonesDir = path.join(this.config.dataDir, 'clones');
    fs.mkdirSync(clonesDir, { recursive: true });

    const folderName = targetName || `${owner}_${repo}`;
    const targetPath = path.join(clonesDir, folderName);
    const repoUrl = `https://github.com/${owner}/${repo}.git`;

    if (fs.existsSync(targetPath)) {
      // Pull latest
      execSync('git pull', { cwd: targetPath, stdio: ['pipe', 'pipe', 'ignore'] });
    } else {
      execSync(`git clone --depth 1 ${repoUrl} "${targetPath}"`, { stdio: ['pipe', 'pipe', 'ignore'] });
    }

    return { localPath: targetPath, url: repoUrl };
  }

  /**
   * Create an issue on a repository (requires auth token).
   */
  async createIssue(owner: string, repo: string, title: string, body: string): Promise<{ id: number; url: string }> {
    if (!this.config.githubToken) {
      throw new Error('GITHUB_TOKEN is required to create issues.');
    }

    const res = await this.octokit.rest.issues.create({
      owner,
      repo,
      title,
      body,
    });

    return { id: res.data.number, url: res.data.html_url };
  }
}
