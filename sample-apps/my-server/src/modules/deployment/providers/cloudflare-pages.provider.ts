import { Injectable, McpError } from '@nitrostack/core';
import { DeploymentProvider } from '../deployment.provider.js';

@Injectable()
export class CloudflarePagesProvider extends DeploymentProvider {
  readonly providerName = 'cloudflare-pages';

  validateConfiguration(): void {
    // Dynamic config
  }

  /**
   * Deploys a GitHub repository to Cloudflare Pages.
   */
  async createDeployment(request: {
    owner: string;
    repo: string;
    branch: string;
    projectName?: string;
    cloudflareToken?: string;
    accountId: string;
    envVars?: Record<string, string>;
    rootDirectory?: string;
  }): Promise<{
    provider: string;
    status: 'queued' | 'running' | 'ready' | 'failed';
    message: string;
    deploymentId?: string;
    url?: string;
  }> {
    const token = request.cloudflareToken || process.env.CLOUDFLARE_API_TOKEN;
    if (!token) {
      throw new McpError(
        'Cloudflare API token is missing. Please provide cloudflareToken in the request or set the CLOUDFLARE_API_TOKEN environment variable.',
        'CLOUDFLARE_TOKEN_MISSING',
        400
      );
    }

    const projectName = request.projectName || `${request.owner}-${request.repo}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // 1. Check if the Cloudflare Pages project exists or create it
    let projectExists = false;
    try {
      const checkRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${request.accountId}/pages/projects/${projectName}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (checkRes.status === 200) {
        projectExists = true;
      } else if (checkRes.status === 401 || checkRes.status === 403) {
        throw new McpError(
          'Unauthorized Cloudflare API access. Please verify that your Cloudflare API Token and Account ID are valid and have Pages write permissions.',
          'CLOUDFLARE_AUTH_ERROR',
          checkRes.status
        );
      }
    } catch (err) {
      if (err instanceof McpError) {
        throw err;
      }
      // Ignore errors and attempt creation for other network errors
    }

    // Prepare build and environment config
    const buildConfig = {
      build_command: 'npm run build',
      destination_dir: 'dist',
      root_dir: request.rootDirectory || '',
    };

    // Format env vars for Cloudflare API structure
    const formattedEnvVars: Record<string, { value: string }> = {};
    if (request.envVars) {
      for (const [k, v] of Object.entries(request.envVars)) {
        formattedEnvVars[k] = { value: v };
      }
    }

    if (!projectExists) {
      const createRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${request.accountId}/pages/projects`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: projectName,
            production_branch: request.branch,
            source: {
              type: 'github',
              config: {
                owner: request.owner,
                repo_name: request.repo,
                production_branch: request.branch,
                pr_comments_enabled: true,
                deployments_enabled: true,
              },
            },
            build_config: buildConfig,
            deployment_configs: {
              production: {
                env_vars: formattedEnvVars,
              },
              preview: {
                env_vars: formattedEnvVars,
              },
            },
          }),
        }
      );

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new McpError(
          `Failed to create Cloudflare Pages project: ${errText}`,
          'CLOUDFLARE_PROJECT_CREATION_FAILED',
          createRes.status
        );
      }
    } else {
      // Update existing project environment variables and build settings
      const patchData: any = {
        deployment_configs: {
          production: {
            env_vars: formattedEnvVars,
          },
          preview: {
            env_vars: formattedEnvVars,
          },
        },
      };
      if (request.rootDirectory !== undefined) {
        patchData.build_config = buildConfig;
      }

      const updateRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${request.accountId}/pages/projects/${projectName}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(patchData),
        }
      );

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        throw new McpError(
          `Failed to update Cloudflare Pages project configuration: ${errText}`,
          'CLOUDFLARE_PROJECT_UPDATE_FAILED',
          updateRes.status
        );
      }
    }

    // 2. Trigger the deployment
    const deployRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${request.accountId}/pages/projects/${projectName}/deployments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!deployRes.ok) {
      const errText = await deployRes.text();
      throw new McpError(
        `Failed to trigger Cloudflare Pages deployment: ${errText}`,
        'CLOUDFLARE_DEPLOYMENT_FAILED',
        deployRes.status
      );
    }

    const deployData = await deployRes.json() as any;
    const deployment = deployData.result;

    return {
      provider: 'cloudflare-pages',
      status: 'queued',
      message: 'Cloudflare Pages deployment successfully triggered.',
      deploymentId: deployment?.id,
      url: deployment?.url || `https://${projectName}.pages.dev`,
    };
  }
}
