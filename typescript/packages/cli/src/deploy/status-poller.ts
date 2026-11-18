import { StudioApiClient, StudioApiError } from '../api/client.js';

export interface DeploymentStatusResponse {
  id?: string;
  studioDeploymentId?: string;
  deploymentId?: string;
  appId?: string;
  status: string;
  deploymentStatus?: string;
  subdomain?: string;
  appUrl?: string;
  serviceUrl?: string;
  mcpUrl?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  isTerminal?: boolean;
  createdAt?: string;
  updatedAt?: string;
  retryAfterMs?: number;
}

export interface PollDeploymentOptions {
  client: StudioApiClient;
  deploymentId: string;
  intervalMs?: number;
  timeoutMs?: number;
  onStatusChange?: (status: DeploymentStatusResponse) => void | Promise<void>;
  sleepFn?: (ms: number) => Promise<void>;
}

export const TERMINAL_SUCCESS_STATUSES = [
  'READY',
  'COMPLETED',
  'LIVE',
  'ACTIVE',
  'SUCCESS',
];

export const TERMINAL_FAILURE_STATUSES = [
  'FAILED',
  'REJECTED',
  'EXPIRED',
  'ERROR',
  'CANCELLED',
];

/**
 * Evaluates whether the given deployment status response represents a terminal state.
 */
export function isTerminalStatus(response: DeploymentStatusResponse): boolean {
  if (response.isTerminal === true) {
    return true;
  }

  const status = (response.status || '').toUpperCase();
  const depStatus = (response.deploymentStatus || '').toUpperCase();

  if (
    TERMINAL_SUCCESS_STATUSES.includes(status) ||
    TERMINAL_SUCCESS_STATUSES.includes(depStatus)
  ) {
    return true;
  }

  if (
    TERMINAL_FAILURE_STATUSES.includes(status) ||
    TERMINAL_FAILURE_STATUSES.includes(depStatus)
  ) {
    return true;
  }

  return false;
}

/**
 * Evaluates whether the given deployment status response represents a successful completion.
 */
export function isSuccessfulStatus(response: DeploymentStatusResponse): boolean {
  const status = (response.status || '').toUpperCase();
  const depStatus = (response.deploymentStatus || '').toUpperCase();

  return (
    TERMINAL_SUCCESS_STATUSES.includes(status) ||
    TERMINAL_SUCCESS_STATUSES.includes(depStatus)
  );
}

/**
 * Fetches the current deployment status from the Studio status endpoint only.
 * (There is no GET /deployments/:id/status — that route is PATCH-only.)
 */
export async function fetchDeploymentStatus(
  client: StudioApiClient,
  deploymentId: string,
): Promise<DeploymentStatusResponse> {
  try {
    return await client.request<DeploymentStatusResponse>(
      `/studio/deployments/${deploymentId}/status`,
    );
  } catch (err) {
    if (err instanceof StudioApiError) {
      throw err;
    }
    throw err;
  }
}

/**
 * Polls the NitroCloud deployment status with exponential backoff on transient faults,
 * status change notifications, and a hard timeout guard.
 */
export async function pollDeploymentStatus(
  options: PollDeploymentOptions,
): Promise<DeploymentStatusResponse> {
  const {
    client,
    deploymentId,
    intervalMs = 1500,
    timeoutMs = 10 * 60 * 1000, // 10 minutes default
    onStatusChange,
    sleepFn = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = options;

  const startTime = Date.now();
  let lastStatusSignature = '';
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 5;

  while (Date.now() - startTime < timeoutMs) {
    let currentStatus: DeploymentStatusResponse;

    try {
      currentStatus = await fetchDeploymentStatus(client, deploymentId);
      consecutiveErrors = 0;
    } catch (err) {
      consecutiveErrors++;
      if (consecutiveErrors >= maxConsecutiveErrors) {
        throw new Error(
          `Failed to poll deployment status after ${maxConsecutiveErrors} consecutive attempts: ${(err as Error).message}`,
        );
      }
      const backoffMs = Math.min(intervalMs * Math.pow(1.5, consecutiveErrors), 10000);
      await sleepFn(backoffMs);
      continue;
    }

    const currentSignature = `${currentStatus.status}::${currentStatus.deploymentStatus || ''}`;
    if (currentSignature !== lastStatusSignature) {
      lastStatusSignature = currentSignature;
      if (onStatusChange) {
        await onStatusChange(currentStatus);
      }
    }

    if (isTerminalStatus(currentStatus)) {
      return currentStatus;
    }

    const waitDuration = currentStatus.retryAfterMs ?? intervalMs;
    await sleepFn(waitDuration);
  }

  throw new Error(`Deployment polling timed out after ${Math.round(timeoutMs / 1000)}s`);
}
