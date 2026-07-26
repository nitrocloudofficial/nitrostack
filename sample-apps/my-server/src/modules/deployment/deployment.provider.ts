/**
 * Deployment request contract kept for future provider implementations.
 */
export interface DeploymentRequest {
  repository: string;
  owner: string;
  branch: string;
  commitSha: string;
  environment?: string;
}

/**
 * Deployment response contract kept for future provider implementations.
 */
export interface DeploymentResult {
  provider: string;
  status: 'not_implemented' | 'queued' | 'running' | 'ready' | 'failed';
  message: string;
  deploymentId?: string;
  url?: string;
}

/**
 * Deployment provider abstraction for pluggable deployment backends.
 */
export abstract class DeploymentProvider {
  abstract readonly providerName: string;
  abstract validateConfiguration(): void;
  abstract createDeployment(request: any): Promise<DeploymentResult>;
}
