import { z } from '@nitrostack/core';

export const vercelDeployInputSchema = z.object({
  owner: z.string().describe('The GitHub repository owner (username or organization)'),
  repo: z.string().describe('The GitHub repository name'),
  branch: z.string().default('main').describe('The branch to deploy (e.g. main)'),
  projectName: z.string().optional().describe('Vercel project name. If omitted, will be inferred from repository name'),
  vercelToken: z.string().optional().describe('Vercel API Access Token. Falls back to VERCEL_TOKEN env variable'),
  teamId: z.string().optional().describe('Vercel Team ID if deploying to a team workspace'),
  framework: z.string().optional().describe('Framework preset (e.g., nextjs, create-react-app, vite, vue, angular, etc.). If omitted, will be auto-detected or default to static'),
  envVars: z.record(z.string(), z.string()).optional().describe('Optional environment variables to set on the Vercel project'),
  rootDirectory: z.string().optional().describe('The directory where the app is located within the repository (e.g. client, frontend). If omitted, root is used.'),
});

export const netlifyDeployInputSchema = z.object({
  owner: z.string().describe('The GitHub repository owner (username or organization)'),
  repo: z.string().describe('The GitHub repository name'),
  branch: z.string().default('main').describe('The branch to deploy (e.g. main)'),
  siteName: z.string().optional().describe('Netlify site name. If omitted, will be auto-generated or inferred'),
  netlifyToken: z.string().optional().describe('Netlify Personal Access Token. Falls back to NETLIFY_TOKEN env variable'),
  envVars: z.record(z.string(), z.string()).optional().describe('Optional environment variables to set on the Netlify site'),
  baseDirectory: z.string().optional().describe('Directory where builds are run (e.g. client, frontend). If omitted, root is used.'),
  publishDirectory: z.string().optional().describe('Directory containing build assets to deploy (e.g. dist, build, out). If omitted, Netlify auto-detects.'),
});

export const cloudflareDeployInputSchema = z.object({
  owner: z.string().describe('The GitHub repository owner (username or organization)'),
  repo: z.string().describe('The GitHub repository name'),
  branch: z.string().default('main').describe('The branch to deploy (e.g. main)'),
  projectName: z.string().optional().describe('Cloudflare Pages project name. If omitted, will be inferred from repository name'),
  cloudflareToken: z.string().optional().describe('Cloudflare API Token. Falls back to CLOUDFLARE_API_TOKEN env variable'),
  accountId: z.string().describe('Cloudflare Account ID (Required to execute Cloudflare deployments)'),
  envVars: z.record(z.string(), z.string()).optional().describe('Optional environment variables to set on the Cloudflare Pages project'),
  rootDirectory: z.string().optional().describe('Root directory of the project in the repository (e.g. client, frontend). If omitted, root is used.'),
});

export const deploymentToolMetadata = {
  deploy_to_vercel: {
    category: 'deployment',
    tags: ['vercel', 'deploy', 'frontend'],
  },
  deploy_to_netlify: {
    category: 'deployment',
    tags: ['netlify', 'deploy', 'frontend'],
  },
  deploy_to_cloudflare_pages: {
    category: 'deployment',
    tags: ['cloudflare', 'deploy', 'frontend'],
  },
  render_create_service: {
    category: 'deployment',
    tags: ['render', 'deploy', 'backend', 'service'],
  },
};

export const renderCreateServiceInputSchema = z.object({
  name: z.string().describe('The name of the service on Render'),
  repoUrl: z.string().describe('The HTTPS URL of the GitHub repository (e.g. https://github.com/owner/repo)'),
  branch: z.string().default('main').describe('The branch to deploy'),
  type: z.enum(['web_service', 'static_site', 'private_service', 'background_worker']).default('web_service'),
  env: z.enum(['node', 'python', 'go', 'docker', 'static']).default('node'),
  buildCommand: z.string().optional().describe('Build command (defaults to npm run build)'),
  startCommand: z.string().optional().describe('Start command (defaults to npm start)'),
  envVars: z.record(z.string(), z.string()).optional().describe('Optional environment variables for the service'),
  ownerId: z.string().optional().describe('Render Owner ID / Team ID'),
  renderApiKey: z.string().optional().describe('Render API Key. Falls back to RENDER_API_KEY env variable.'),
});
