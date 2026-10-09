import { Injectable, McpError } from '@nitrostack/core';
import {
  DeploymentProvider,
  DeploymentRequest,
  DeploymentResult,
} from '../deployment.provider.js';

export interface RenderService {
  id: string;
  name: string;
  type: string;
  repo: string;
  autoDeploy: string;
  updatedAt: string;
}

export interface RenderDeploy {
  id: string;
  status: string;
  commit?: {
    id: string;
    message: string;
  };
  createdAt: string;
  finishedAt?: string;
}

/**
 * Render deployment provider implementing Render REST API integration.
 */
@Injectable()
export class RenderProvider extends DeploymentProvider {
  readonly providerName = 'render';

  private getApiKey(apiKeyOverride?: string): string {
    const key = apiKeyOverride || process.env.RENDER_API_KEY;
    if (!key) {
      throw new McpError(
        'Render API key is missing. Please provide renderApiKey or set the RENDER_API_KEY environment variable.',
        'RENDER_API_KEY_MISSING',
        400,
      );
    }
    return key;
  }

  validateConfiguration(): void {
    if (!process.env.RENDER_API_KEY) {
      console.warn('[RenderProvider] RENDER_API_KEY environment variable is not set.');
    }
  }

  /**
   * List services registered in Render account
   */
  async listServices(apiKeyOverride?: string): Promise<RenderService[]> {
    const apiKey = this.getApiKey(apiKeyOverride);
    const res = await fetch('https://api.render.com/v1/services?limit=50', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new McpError(`Failed to fetch Render services: ${errText}`, 'RENDER_API_ERROR', res.status);
    }

    const data = (await res.json()) as Array<{ service: { id: string; name: string; type: string; repo: string; autoDeploy: string; updatedAt: string } }>;
    return data.map((item) => item.service);
  }

  /**
   * Trigger a deploy for a given Render service ID
   */
  async triggerDeploy(serviceId: string, clearCache: boolean = false, apiKeyOverride?: string): Promise<RenderDeploy> {
    const apiKey = this.getApiKey(apiKeyOverride);
    const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        clearCache: clearCache ? 'clear' : 'do_not_clear',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new McpError(`Failed to trigger Render deploy: ${errText}`, 'RENDER_API_ERROR', res.status);
    }

    const data = (await res.json()) as RenderDeploy;
    return data;
  }

  /**
   * Get status of a deploy
   */
  async getDeployStatus(serviceId: string, deployId: string, apiKeyOverride?: string): Promise<RenderDeploy> {
    const apiKey = this.getApiKey(apiKeyOverride);
    const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys/${deployId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new McpError(`Failed to fetch deploy status: ${errText}`, 'RENDER_API_ERROR', res.status);
    }

    const data = (await res.json()) as RenderDeploy;
    return data;
  }

  /**
   * Create a new Web Service or other service types on Render.
   */
  async createService(
    name: string,
    repoUrl: string,
    branch: string = 'main',
    config: {
      type?: 'web_service' | 'static_site' | 'private_service' | 'background_worker';
      env?: 'node' | 'python' | 'go' | 'docker' | 'static';
      buildCommand?: string;
      startCommand?: string;
      envVars?: Record<string, string>;
      ownerId?: string;
    } = {},
    apiKeyOverride?: string
  ): Promise<any> {
    const apiKey = this.getApiKey(apiKeyOverride);
    
    const envVarsArray = config.envVars
      ? Object.entries(config.envVars).map(([key, value]) => ({ key, value }))
      : [];

    const body = {
      name,
      type: config.type || 'web_service',
      repo: repoUrl,
      branch: branch,
      env: config.env || 'node',
      ownerId: config.ownerId || undefined,
      serviceDetails: {
        env: config.env || 'node',
        buildCommand: config.buildCommand || 'npm run build',
        startCommand: config.startCommand || 'npm start',
      },
      envVars: envVarsArray,
    };

    const res = await fetch('https://api.render.com/v1/services', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new McpError(`Failed to create Render service: ${errText}`, 'RENDER_API_ERROR', res.status);
    }

    const data = await res.json() as any;
    return data.service;
  }

  async createDeployment(request: DeploymentRequest): Promise<DeploymentResult> {
    // If request contains serviceId in environment field, trigger deploy directly
    const serviceId = request.environment;
    if (!serviceId) {
      throw new McpError(
        'Render service ID is required in the environment parameter to trigger a deploy.',
        'SERVICE_ID_REQUIRED',
        400,
      );
    }

    const deploy = await this.triggerDeploy(serviceId);
    return {
      provider: this.providerName,
      status: deploy.status === 'live' ? 'ready' : 'queued',
      message: `Deploy triggered for service ${serviceId}`,
      deploymentId: deploy.id,
    };
  }
}

