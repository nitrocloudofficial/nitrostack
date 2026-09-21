import {
  ResourceDecorator as Resource,
  ExecutionContext,
  McpError,
} from '@nitrostack/core';
import { VercelProvider } from './providers/vercel.provider.js';

export class DeploymentResources {
  @Resource({
    uri: 'vercel://deployments/{id}/logs',
    name: 'Vercel Deployment Build Logs',
    description: 'Retrieve real-time build and deployment logs for a specific Vercel deployment ID.',
    mimeType: 'text/plain',
  })
  async getVercelLogs(uri: string, ctx: ExecutionContext) {
    ctx.logger.info(`Fetching Vercel deployment logs: ${uri}`);

    const matches = uri.match(/vercel:\/\/deployments\/([^/]+)\/logs/);
    if (!matches) {
      throw new McpError('Invalid Vercel logs URI format. Expected: vercel://deployments/{id}/logs', 'INVALID_URI', 400);
    }
    const deploymentId = matches[1];

    const token = process.env.VERCEL_TOKEN;
    if (!token) {
      throw new McpError('Vercel API token is not configured in the environment variables (VERCEL_TOKEN).', 'VERCEL_TOKEN_MISSING', 400);
    }

    try {
      // Fetch Vercel deployment build events
      const res = await fetch(`https://api.vercel.com/v2/deployments/${deploymentId}/events?direction=forward&limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Vercel API error: ${errText}`);
      }

      const events = await res.json() as Array<{ text?: string; created?: number; type?: string }>;
      
      // Filter and concatenate log text
      const logLines = events
        .filter(event => event.text)
        .map(event => event.text)
        .join('\n');

      return {
        contents: [{
          uri,
          mimeType: 'text/plain',
          text: logLines || 'No logs available for this deployment yet.',
        }]
      };
    } catch (err: any) {
      throw new McpError(`Failed to retrieve Vercel build logs: ${err.message}`, 'VERCEL_LOGS_FAILED', 500);
    }
  }

  @Resource({
    uri: 'render://services/{serviceId}/deploys/{deployId}/status',
    name: 'Render Deployment Status details',
    description: 'Retrieve status and step details of a specific Render service deployment.',
    mimeType: 'application/json',
  })
  async getRenderStatus(uri: string, ctx: ExecutionContext) {
    ctx.logger.info(`Fetching Render deployment status: ${uri}`);

    const matches = uri.match(/render:\/\/services\/([^/]+)\/deploys\/([^/]+)\/status/);
    if (!matches) {
      throw new McpError('Invalid Render status URI format. Expected: render://services/{serviceId}/deploys/{deployId}/status', 'INVALID_URI', 400);
    }
    const serviceId = matches[1];
    const deployId = matches[2];

    const apiKey = process.env.RENDER_API_KEY;
    if (!apiKey) {
      throw new McpError('Render API key is not configured in the environment variables (RENDER_API_KEY).', 'RENDER_API_KEY_MISSING', 400);
    }

    try {
      const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys/${deployId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Render API error: ${errText}`);
      }

      const deploy = await res.json();

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(deploy, null, 2),
        }]
      };
    } catch (err: any) {
      throw new McpError(`Failed to retrieve Render deploy status: ${err.message}`, 'RENDER_STATUS_FAILED', 500);
    }
  }
}
