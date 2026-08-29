import {
  ExecutionContext,
  Injectable,
  RateLimit,
  ToolDecorator as Tool,
  Widget,
  z,
} from '@nitrostack/core';
import {
  cloudflareDeployInputSchema,
  deploymentToolMetadata,
  netlifyDeployInputSchema,
  vercelDeployInputSchema,
  renderCreateServiceInputSchema,
} from './deployment.types.js';
import { VercelProvider } from './providers/vercel.provider.js';
import { NetlifyProvider } from './providers/netlify.provider.js';
import { CloudflarePagesProvider } from './providers/cloudflare-pages.provider.js';
import { RenderProvider } from './providers/render.provider.js';

@Injectable({
  deps: [VercelProvider, NetlifyProvider, CloudflarePagesProvider, RenderProvider],
})
export class DeploymentTools {
  constructor(
    private readonly vercelProvider: VercelProvider,
    private readonly netlifyProvider: NetlifyProvider,
    private readonly cloudflarePagesProvider: CloudflarePagesProvider,
    private readonly renderProvider: RenderProvider
  ) {}

  @Tool({
    name: 'deploy_to_vercel',
    description: 'Deploy a GitHub repository to Vercel via Git integration. Automatically detects/creates the project and links the repository.',
    inputSchema: vercelDeployInputSchema,
    metadata: deploymentToolMetadata.deploy_to_vercel,
  })
  @Widget('deployment-status')
  @RateLimit({ requests: 5, window: '5m' })
  async deployToVercel(
    input: z.infer<typeof vercelDeployInputSchema>,
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Starting Vercel deployment for ${input.owner}/${input.repo} on branch ${input.branch}`);
    const result = await this.vercelProvider.createDeployment({
      owner: input.owner,
      repo: input.repo,
      branch: input.branch,
      projectName: input.projectName,
      vercelToken: input.vercelToken,
      teamId: input.teamId,
      framework: input.framework,
      envVars: input.envVars,
      rootDirectory: input.rootDirectory,
    });
    return result;
  }

  @Tool({
    name: 'deploy_to_netlify',
    description: 'Deploy a GitHub repository to Netlify via Git integration. Automatically detects/creates the site and triggers a build.',
    inputSchema: netlifyDeployInputSchema,
    metadata: deploymentToolMetadata.deploy_to_netlify,
  })
  @Widget('deployment-status')
  @RateLimit({ requests: 5, window: '5m' })
  async deployToNetlify(
    input: z.infer<typeof netlifyDeployInputSchema>,
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Starting Netlify deployment for ${input.owner}/${input.repo} on branch ${input.branch}`);
    const result = await this.netlifyProvider.createDeployment({
      owner: input.owner,
      repo: input.repo,
      branch: input.branch,
      siteName: input.siteName,
      netlifyToken: input.netlifyToken,
      envVars: input.envVars,
      baseDirectory: input.baseDirectory,
      publishDirectory: input.publishDirectory,
    });
    return result;
  }

  @Tool({
    name: 'deploy_to_cloudflare_pages',
    description: 'Deploy a GitHub repository to Cloudflare Pages via Git integration. Requires Cloudflare Account ID.',
    inputSchema: cloudflareDeployInputSchema,
    metadata: deploymentToolMetadata.deploy_to_cloudflare_pages,
  })
  @Widget('deployment-status')
  @RateLimit({ requests: 5, window: '5m' })
  async deployToCloudflare(
    input: z.infer<typeof cloudflareDeployInputSchema>,
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Starting Cloudflare Pages deployment for ${input.owner}/${input.repo} on branch ${input.branch}`);
    const result = await this.cloudflarePagesProvider.createDeployment({
      owner: input.owner,
      repo: input.repo,
      branch: input.branch,
      projectName: input.projectName,
      cloudflareToken: input.cloudflareToken,
      accountId: input.accountId,
      envVars: input.envVars,
      rootDirectory: input.rootDirectory,
    });
    return result;
  }

  @Tool({
    name: 'render_list_services',
    description: 'List all services on Render associated with the Render API key.',
    inputSchema: z.object({
      renderApiKey: z
        .string()
        .optional()
        .describe('Render API key. If omitted, RENDER_API_KEY environment variable will be used.'),
    }),
  })
  async listServices(input: { renderApiKey?: string }) {
    const services = await this.renderProvider.listServices(input.renderApiKey);
    return {
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        repo: s.repo,
        updatedAt: s.updatedAt,
      })),
    };
  }

  @Tool({
    name: 'render_trigger_deploy',
    description: 'Trigger a deployment for a specific Render service.',
    inputSchema: z.object({
      serviceId: z.string().describe('The Render Service ID (e.g. srv-cxxxxxx)'),
      clearCache: z.boolean().optional().describe('Whether to clear build cache before deploying.'),
      renderApiKey: z
        .string()
        .optional()
        .describe('Render API key. If omitted, RENDER_API_KEY environment variable will be used.'),
    }),
  })
  async triggerDeploy(input: { serviceId: string; clearCache?: boolean; renderApiKey?: string }) {
    const deploy = await this.renderProvider.triggerDeploy(
      input.serviceId,
      input.clearCache,
      input.renderApiKey
    );
    return {
      message: `Deploy triggered successfully for service ${input.serviceId}`,
      deployId: deploy.id,
      status: deploy.status,
      createdAt: deploy.createdAt,
    };
  }

  @Tool({
    name: 'render_get_deploy_status',
    description: 'Check the status of a specific deployment on Render.',
    inputSchema: z.object({
      serviceId: z.string().describe('The Render Service ID'),
      deployId: z.string().describe('The Render Deploy ID'),
      renderApiKey: z
        .string()
        .optional()
        .describe('Render API key. If omitted, RENDER_API_KEY environment variable will be used.'),
    }),
  })
  async getDeployStatus(input: { serviceId: string; deployId: string; renderApiKey?: string }) {
    const status = await this.renderProvider.getDeployStatus(
      input.serviceId,
      input.deployId,
      input.renderApiKey
    );
    return status;
  }

  @Tool({
    name: 'render_create_service',
    description: 'Create a new Web Service or static site on Render automatically.',
    inputSchema: renderCreateServiceInputSchema,
    metadata: deploymentToolMetadata.render_create_service,
  })
  @Widget('deployment-status')
  @RateLimit({ requests: 5, window: '5m' })
  async createRenderService(
    input: z.infer<typeof renderCreateServiceInputSchema>,
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Creating Render service: ${input.name} for repo ${input.repoUrl}`);
    const service = await this.renderProvider.createService(
      input.name,
      input.repoUrl,
      input.branch,
      {
        type: input.type,
        env: input.env,
        buildCommand: input.buildCommand,
        startCommand: input.startCommand,
        envVars: input.envVars,
        ownerId: input.ownerId,
      },
      input.renderApiKey
    );
    return {
      message: `Render service ${input.name} created successfully.`,
      serviceId: service.id,
      url: service.url,
      updatedAt: service.updatedAt,
    };
  }

  @Tool({
    name: 'check_deployment_health',
    description: '❤️ Post-Deploy Health Check: ping a URL to verify it is active and responding successfully, measuring status and response time.',
    inputSchema: z.object({
      url: z.string().describe('The URL to check (e.g., https://my-app.onrender.com/health)'),
      expectedStatus: z.number().default(200).describe('Expected HTTP status code (defaults to 200)'),
    }),
  })
  async checkDeploymentHealth(input: { url: string; expectedStatus?: number }) {
    const start = Date.now();
    try {
      const res = await fetch(input.url, {
        method: 'GET',
        headers: {
          'User-Agent': 'github-deploy-agent-health-check',
        },
      });

      const responseTimeMs = Date.now() - start;
      return {
        url: input.url,
        status: res.status === (input.expectedStatus ?? 200) ? 'healthy' : 'unhealthy',
        statusCode: res.status,
        expectedStatus: input.expectedStatus ?? 200,
        responseTimeMs,
        headers: {
          contentType: res.headers.get('content-type'),
          server: res.headers.get('server'),
        },
      };
    } catch (err: any) {
      const responseTimeMs = Date.now() - start;
      return {
        url: input.url,
        status: 'unhealthy',
        error: err.message,
        responseTimeMs,
      };
    }
  }

  @Tool({
    name: 'explain_build_error',
    description: '🤖 Plain-English Error Explainer: converts complex compiler/build/deployment logs into simple explanations and suggested fixes.',
    inputSchema: z.object({
      logs: z.string().describe('The build logs or error trace output'),
    }),
  })
  async explainBuildError(input: { logs: string }) {
    const findings: string[] = [];
    const fixes: string[] = [];

    const lowerLogs = input.logs.toLowerCase();

    if (lowerLogs.includes('ts2307') || lowerLogs.includes('cannot find module')) {
      findings.push('Missing Module or Import: The compiler cannot locate an imported file or dependency.');
      fixes.push('Check the file path spelling, capitalization, and verify if it is in package.json. Ensure it is committed to GitHub.');
    }
    if (lowerLogs.includes('ts2322') || lowerLogs.includes('is not assignable to type')) {
      findings.push('TypeScript Type Mismatch: A variable or parameter is receiving an incompatible type.');
      fixes.push('Inspect the type definition and align the input/output models.');
    }
    if (lowerLogs.includes('mongodb connection error') || lowerLogs.includes('mongooseerror')) {
      findings.push('Database Connection Failure: The backend is unable to connect to the MongoDB instance.');
      fixes.push('Verify that MONGO_URI environment variable is correctly set on Render and that IP Access List allows connections on MongoDB Atlas.');
    }
    if (lowerLogs.includes('cors') || lowerLogs.includes('access-control-allow-origin')) {
      findings.push('CORS Policy Block: The backend rejected the cross-origin request from the frontend.');
      fixes.push("Ensure the backend CORS options include the frontend Vercel URL and that credentials are set to true/include.");
    }
    if (lowerLogs.includes('npm err!') || lowerLogs.includes('yarn error') || lowerLogs.includes('pnpm-lock.yaml is out of date')) {
      findings.push('Package Manager Dependency Resolution Error: Build failed during npm/yarn/pnpm install phase.');
      fixes.push('Run a local clean install and commit the lockfile updates to Git.');
    }

    if (findings.length === 0) {
      findings.push('General Build Failure: The build environment crashed.');
      fixes.push('Verify the node/npm runtime version compatibility, or run a local compilation build check (`npm run build`).');
    }

    return {
      explanations: findings,
      suggestedFixes: fixes,
      originalLogsSnippet: input.logs.slice(-300),
    };
  }
}
