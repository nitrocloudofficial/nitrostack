import { Injectable, McpError } from '@nitrostack/core';
import { GitHubService } from '../../github/github.service.js';
import { DeploymentProvider } from '../deployment.provider.js';

@Injectable({ deps: [GitHubService] })
export class NetlifyProvider extends DeploymentProvider {
  readonly providerName = 'netlify';

  constructor(private readonly githubService: GitHubService) {
    super();
  }

  validateConfiguration(): void {
    // Dynamic / environment based configuration
  }

  /**
   * Deploys a GitHub repository to Netlify.
   */
  async createDeployment(request: {
    owner: string;
    repo: string;
    branch: string;
    siteName?: string;
    netlifyToken?: string;
    envVars?: Record<string, string>;
    baseDirectory?: string;
    publishDirectory?: string;
  }): Promise<{
    provider: string;
    status: 'queued' | 'running' | 'ready' | 'failed';
    message: string;
    deploymentId?: string;
    url?: string;
  }> {
    const token = request.netlifyToken || process.env.NETLIFY_TOKEN;
    if (!token) {
      throw new McpError(
        'Netlify API token is missing. Please provide netlifyToken in the request or set the NETLIFY_TOKEN environment variable.',
        'NETLIFY_TOKEN_MISSING',
        400
      );
    }

    // 1. Fetch repository info from GitHub to obtain the repo ID
    let repoId: number;
    let repoUrl: string;
    try {
      const repoSummary = await this.githubService.getRepository(request.owner, request.repo);
      repoId = repoSummary.id;
      repoUrl = repoSummary.html_url;
    } catch (err: any) {
      throw new McpError(
        `Failed to retrieve GitHub repository info: ${err.message}`,
        'GITHUB_REPO_FETCH_FAILED',
        400
      );
    }

    const siteName = request.siteName || `${request.owner}-${request.repo}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // 2. Check if the Netlify site already exists, or create it
    let siteId: string | null = null;
    let siteUrl: string | undefined;
    
    try {
      const listSitesRes = await fetch(`https://api.netlify.com/api/v1/sites?filter=all`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (listSitesRes.status === 200) {
        const sites = await listSitesRes.json() as any[];
        const matchingSite = sites.find(s => s.name === siteName || s.custom_domain === siteName);
        if (matchingSite) {
          siteId = matchingSite.id;
          siteUrl = matchingSite.ssl_url || matchingSite.url;
        }
      } else if (listSitesRes.status === 401 || listSitesRes.status === 403) {
        throw new McpError(
          'Unauthorized Netlify API access. Please double check that your Netlify API token is valid and active.',
          'NETLIFY_AUTH_ERROR',
          listSitesRes.status
        );
      }
    } catch (err) {
      if (err instanceof McpError) {
        throw err;
      }
      // Ignore checking errors and attempt creation for other network errors
    }

    if (!siteId) {
      // Create new Netlify site linked to the GitHub repository
      const createRes = await fetch(`https://api.netlify.com/api/v1/sites`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: siteName,
          repo: {
            provider: 'github',
            id: repoId,
            repo: `${request.owner}/${request.repo}`,
            private: true,
            branch: request.branch,
            allowed_branches: [request.branch],
            base: request.baseDirectory || undefined,
            dir: request.publishDirectory || undefined,
          },
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new McpError(
          `Failed to create Netlify site: ${errText}`,
          'NETLIFY_SITE_CREATION_FAILED',
          createRes.status
        );
      }

      const siteData = await createRes.json() as any;
      siteId = siteData.id;
      siteUrl = siteData.ssl_url || siteData.url;
    }

    // 3. Update Environment Variables / Build Settings if provided
    if ((request.envVars && Object.keys(request.envVars).length > 0) || request.baseDirectory || request.publishDirectory) {
      try {
        const buildSettings: any = {};
        if (request.envVars) {
          buildSettings.env = request.envVars;
        }
        if (request.baseDirectory) {
          buildSettings.base = request.baseDirectory;
        }
        if (request.publishDirectory) {
          buildSettings.dir = request.publishDirectory;
        }
        await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            build_settings: buildSettings,
          }),
        });
      } catch (err) {
        // Continue deployment even if env var update fails
      }
    }

    // 4. Trigger the Deployment (redeploy / build site)
    const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clear_cache: true,
      }),
    });

    if (!deployRes.ok) {
      const errText = await deployRes.text();
      throw new McpError(
        `Failed to trigger Netlify deploy: ${errText}`,
        'NETLIFY_DEPLOY_FAILED',
        deployRes.status
      );
    }

    const deployData = await deployRes.json() as any;

    return {
      provider: 'netlify',
      status: 'queued',
      message: 'Netlify site deployment successfully triggered.',
      deploymentId: deployData.id,
      url: siteUrl,
    };
  }
}
