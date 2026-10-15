import { StudioApiClient } from '../api/client.js';

export interface PresignUploadResult {
  studioDeploymentId: string;
  presignedUrl: string;
  presignedUrlExpiresAt?: string;
  deploymentId?: string;
}

export interface ConfirmDeploymentResult {
  deploymentId: string;
  appId?: string;
  projectId?: string;
  status?: string;
  serviceUrl?: string;
  mcpUrl?: string;
}

export interface RequestPresignParams {
  appId: string;
  organizationId?: string;
  environmentVariables?: Record<string, string>;
}

export interface ConfirmDeploymentOptions {
  autoDeployChat?: boolean;
}

/**
 * Requests an S3 presigned PUT URL and allocated studio deployment record from NitroCloud.
 */
export async function requestAppPresignedUpload(
  client: StudioApiClient,
  params: RequestPresignParams,
): Promise<PresignUploadResult> {
  return await client.request<PresignUploadResult>('/studio/apps/deployments/presign', {
    method: 'POST',
    body: JSON.stringify({
      appId: params.appId,
      organizationId: params.organizationId,
      environmentVariables: params.environmentVariables,
    }),
  });
}

/**
 * Signals to NitroCloud that package bits have been completely transferred into S3.
 */
export async function markUploadComplete(
  client: StudioApiClient,
  studioDeploymentId: string,
): Promise<any> {
  return await client.request(`/studio/deployments/${studioDeploymentId}/upload-complete`, {
    method: 'POST',
  });
}

/**
 * Triggers backend CodeBuild image build and Knative pod orchestration.
 */
export async function confirmDeployment(
  client: StudioApiClient,
  studioDeploymentId: string,
  options: ConfirmDeploymentOptions = {},
): Promise<ConfirmDeploymentResult> {
  return await client.request<ConfirmDeploymentResult>(
    `/studio/deployments/${studioDeploymentId}/confirm`,
    {
      method: 'POST',
      body: JSON.stringify({
        autoDeployChat: options.autoDeployChat ?? false,
      }),
    },
  );
}
