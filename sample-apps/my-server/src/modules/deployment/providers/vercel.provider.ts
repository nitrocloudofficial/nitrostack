import { Injectable, McpError } from '@nitrostack/core';
import { GitHubService } from '../../github/github.service.js';
import { DeploymentProvider } from '../deployment.provider.js';

@Injectable({ deps: [GitHubService] })
export class VercelProvider extends DeploymentProvider {
  readonly providerName = 'vercel';

  constructor(private readonly githubService: GitHubService) {
    super();
  }

  validateConfiguration(): void {
    // Falls back to runtime/dynamic tokens or VERCEL_TOKEN env.
  }

  /**
   * Deploys a GitHub repository to Vercel.
   */
  async createDeployment(request: {
    owner: string;
    repo: string;
    branch: string;
    projectName?: string;
    vercelToken?: string;
    teamId?: string;
    framework?: string;
    envVars?: Record<string, string>;
    rootDirectory?: string;
  }): Promise<{
    provider: string;
    status: 'queued' | 'running' | 'ready' | 'failed';
    message: string;
    deploymentId?: string;
    url?: string;
  }> {
    const token = request.vercelToken || process.env.VERCEL_TOKEN;
    if (!token) {
      throw new McpError(
        'Vercel API token is missing. Please provide vercelToken in the request or set the VERCEL_TOKEN environment variable.',
        'VERCEL_TOKEN_MISSING',
        400
      );
    }

    // 1. Fetch Repository details from GitHub to obtain the repo ID
    let repoId: number;
    try {
      const repoSummary = await this.githubService.getRepository(request.owner, request.repo);
      repoId = repoSummary.id;
    } catch (err: any) {
      throw new McpError(
        `Failed to retrieve GitHub repository info: ${err.message}`,
        'GITHUB_REPO_FETCH_FAILED',
        400
      );
    }

    const projectName = request.projectName || `${request.owner}-${request.repo}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const teamParam = request.teamId ? `?teamId=${request.teamId}` : '';

    // 2. Check if project exists or create it
    let projectExists = false;
    try {
      const checkRes = await fetch(`https://api.vercel.com/v9/projects/${projectName}${teamParam}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (checkRes.status === 200) {
        projectExists = true;
      } else if (checkRes.status === 401 || checkRes.status === 403) {
        throw new McpError(
          'Unauthorized Vercel API access. Please double check that your VERCEL_TOKEN is valid, active, and has appropriate scopes.',
          'VERCEL_AUTH_ERROR',
          checkRes.status
        );
      }
    } catch (err) {
      if (err instanceof McpError) {
        throw err;
      }
      // Ignore and attempt creation for other network errors
    }

    if (projectExists && request.rootDirectory) {
      try {
        await fetch(`https://api.vercel.com/v9/projects/${projectName}${teamParam}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rootDirectory: request.rootDirectory,
          }),
        });
      } catch (err) {
        // Ignore patch errors
      }
    }

    if (!projectExists) {
      const createRes = await fetch(`https://api.vercel.com/v9/projects${teamParam}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          framework: request.framework || null,
          rootDirectory: request.rootDirectory || null,
          gitRepository: {
            type: 'github',
            repo: `${request.owner}/${request.repo}`,
          },
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new McpError(
          `Failed to create Vercel project: ${errText}`,
          'VERCEL_PROJECT_CREATION_FAILED',
          createRes.status
        );
      }
    }

    // 3. Update environment variables if provided
    if (request.envVars && Object.keys(request.envVars).length > 0) {
      for (const [key, value] of Object.entries(request.envVars)) {
        try {
          await fetch(`https://api.vercel.com/v9/projects/${projectName}/env${teamParam}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              key,
              value,
              type: 'plain',
              target: ['production', 'preview', 'development'],
            }),
          });
        } catch (err) {
          // Ignore variable conflict errors or other errors
        }
      }
    }

    // 4. Create the Deployment
    const deployRes = await fetch(`https://api.vercel.com/v13/deployments${teamParam}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        gitSource: {
          type: 'github',
          repoId: repoId,
          ref: request.branch,
        },
      }),
    });

    if (!deployRes.ok) {
      const errText = await deployRes.text();
      const friendlyMessage = this.parseVercelError(errText);
      throw new McpError(
        `Failed to trigger Vercel deployment: ${friendlyMessage}`,
        'VERCEL_DEPLOYMENT_FAILED',
        deployRes.status
      );
    }

    const deployData = await deployRes.json() as any;

    return {
      provider: 'vercel',
      status: 'queued',
      message: 'Vercel deployment successfully triggered.',
      deploymentId: deployData.id,
      url: deployData.url ? `https://${deployData.url}` : undefined,
    };
  }

  private parseVercelError(errText: string): string {
    try {
      const parsed = JSON.parse(errText);
      const errorObj = parsed.error;
      if (errorObj) {
        const message = (errorObj.message || '').toLowerCase();
        const code = (errorObj.code || '').toLowerCase();

        if (code === 'forbidden' || code === 'not_authorized') {
          return `Vercel API token is invalid or unauthorized. Please ensure you are using a valid Personal Access Token (starts with vcp_).`;
        }
        if (message.includes('github app') || code.includes('github_app') || message.includes('installation') || message.includes('repo_not_found') || message.includes('repository_not_found')) {
          return `The Vercel GitHub App is not installed or lacks access to this repository. Please authorize it at: https://github.com/apps/vercel`;
        }
        if (message.includes('login connection') || message.includes('link your github') || message.includes('not linked') || message.includes('connect your account')) {
          return `Your GitHub account is not connected to your Vercel account. Please link it in Account Settings > Login Connections on Vercel.`;
        }
        return `${errorObj.message} (Code: ${errorObj.code})`;
      }
    } catch (e) {
      // Fallback
    }
    return errText;
  }
}
