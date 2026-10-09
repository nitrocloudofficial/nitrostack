import { Module } from '@nitrostack/core';
import { RenderProvider } from './providers/render.provider.js';
import { VercelProvider } from './providers/vercel.provider.js';
import { NetlifyProvider } from './providers/netlify.provider.js';
import { CloudflarePagesProvider } from './providers/cloudflare-pages.provider.js';
import { DeploymentTools } from './deployment.tools.js';
import { DeploymentPrompts } from './deployment.prompts.js';
import { DeploymentResources } from './deployment.resources.js';

/**
 * Deployment module providing provider abstractions and tools for Vercel, Netlify, Cloudflare Pages, and Render deployment APIs.
 */
@Module({
  name: 'deployment',
  description: 'Deployment module with automated Vercel, Netlify, Cloudflare Pages, and Render tools',
  controllers: [
    DeploymentTools,
    DeploymentPrompts,
    DeploymentResources,
  ],
  providers: [
    VercelProvider,
    RenderProvider,
    NetlifyProvider,
    CloudflarePagesProvider,
  ],
  exports: [
    VercelProvider,
    RenderProvider,
    NetlifyProvider,
    CloudflarePagesProvider,
  ],
})
export class DeploymentModule {}
