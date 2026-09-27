import { PromptDecorator as Prompt, ExecutionContext, Injectable } from '@nitrostack/core';
import { RepoScannerService } from '../../services/repoScanner.service.js';
import { User } from '../../db/models/User.model.js';

@Injectable()
export class ScanPrompts {
  private async getUserId(): Promise<number> {
    try {
      const firstUser = await User.findOne({});
      return firstUser ? firstUser.githubId : 99999;
    } catch {
      return 99999;
    }
  }

  private async getGithubToken(userId: number): Promise<string> {
    try {
      const user = await User.findOne({ githubId: userId }).select('+githubAccessToken');
      return user?.githubAccessToken || 'mock-access-token';
    } catch {
      return 'mock-access-token';
    }
  }

  @Prompt({
    name: 'analyze-repository-security',
    description: 'Load repository code files into the chatbot to perform security analysis using your built-in LLM',
    arguments: [
      {
        name: 'repoFullName',
        description: 'The full repository name on GitHub, e.g. "owner/repo"',
        required: true,
      },
      {
        name: 'branch',
        description: 'The branch to read files from (default: main)',
        required: false,
      },
    ],
  })
  async analyzeRepositorySecurity(
    args: { repoFullName: string; branch?: string },
    ctx: ExecutionContext
  ) {
    if (ctx && ctx.logger && typeof ctx.logger.info === 'function') {
      ctx.logger.info(`Generating prompt analyze-repository-security for ${args.repoFullName}`);
    }

    const branch = args.branch || 'main';
    const userId = await this.getUserId();
    const token = await this.getGithubToken(userId);

    // Get repo files using RepoScannerService
    const repoFiles = await RepoScannerService.fetchAllRepositoryFiles(
      args.repoFullName,
      branch,
      token
    );

    let filesContext = '';
    let count = 0;
    const MAX_FILES_TO_INCLUDE = 20;

    for (const file of repoFiles) {
      if (count >= MAX_FILES_TO_INCLUDE) {
        filesContext += `\n... (other files truncated to prevent prompt length limits)\n`;
        break;
      }
      filesContext += `\n=== FILE: ${file.path} ===\n${file.content.slice(0, 1000)}\n`;
      count++;
    }

    return [
      {
        role: 'system' as const,
        content: `You are a security expert. Analyze the code provided by the user for vulnerabilities.
Identify real security threats such as SQL injection, CSRF, XSS, insecure cryptography, or hardcoded secrets.

For each vulnerability you discover, produce a patch in the exact format shown below. Keep the output as JSON:
{
  "vulnerabilities": [
    {
      "title": "Description of threat",
      "severity": "critical|high|medium|low",
      "file": "exact/path/to/file",
      "line": 42,
      "description": "Short explanation",
      "cweId": "CWE-XXX",
      "originalCode": "exact code line verbatim from the file",
      "patchedCode": "correct fixed line"
    }
  ]
}`,
      },
      {
        role: 'user' as const,
        content: `Please analyze the following files from repository "${args.repoFullName}":\n\n${filesContext}`,
      },
    ];
  }
}
