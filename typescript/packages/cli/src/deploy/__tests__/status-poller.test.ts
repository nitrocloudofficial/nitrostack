import { describe, it, expect, jest } from '@jest/globals';
import {
  isTerminalStatus,
  isSuccessfulStatus,
  pollDeploymentStatus,
  fetchDeploymentStatus,
  DeploymentStatusResponse,
} from '../status-poller.js';
import { StudioApiClient, StudioApiError } from '../../api/client.js';

describe('Deployment Status Poller', () => {
  describe('Status Classification', () => {
    it('correctly classifies terminal states', () => {
      expect(isTerminalStatus({ status: 'READY' })).toBe(true);
      expect(isTerminalStatus({ status: 'COMPLETED' })).toBe(true);
      expect(isTerminalStatus({ status: 'LIVE' })).toBe(true);
      expect(isTerminalStatus({ status: 'FAILED' })).toBe(true);
      expect(isTerminalStatus({ status: 'REJECTED' })).toBe(true);
      expect(isTerminalStatus({ status: 'EXPIRED' })).toBe(true);
      expect(isTerminalStatus({ status: 'ERROR' })).toBe(true);
      expect(isTerminalStatus({ status: 'BUILDING', isTerminal: true })).toBe(true);

      // Non-terminal
      expect(isTerminalStatus({ status: 'QUEUED' })).toBe(false);
      expect(isTerminalStatus({ status: 'BUILDING' })).toBe(false);
      expect(isTerminalStatus({ status: 'DEPLOYING' })).toBe(false);
    });

    it('correctly classifies successful terminal states', () => {
      expect(isSuccessfulStatus({ status: 'READY' })).toBe(true);
      expect(isSuccessfulStatus({ status: 'COMPLETED' })).toBe(true);
      expect(isSuccessfulStatus({ status: 'LIVE' })).toBe(true);

      expect(isSuccessfulStatus({ status: 'FAILED' })).toBe(false);
      expect(isSuccessfulStatus({ status: 'REJECTED' })).toBe(false);
      expect(isSuccessfulStatus({ status: 'BUILDING' })).toBe(false);
    });
  });

  describe('fetchDeploymentStatus', () => {
    it('fetches from studio deployments status endpoint', async () => {
      const mockClient = {
        request: jest.fn<any>().mockResolvedValue({
          studioDeploymentId: 'sd_123',
          status: 'BUILDING',
        }),
      } as unknown as StudioApiClient;

      const result = await fetchDeploymentStatus(mockClient, 'sd_123');
      expect(result.status).toBe('BUILDING');
      expect(mockClient.request).toHaveBeenCalledWith('/studio/deployments/sd_123/status');
    });

    it('falls back to /deployments/:id/status if studio route returns 404', async () => {
      const mockClient = {
        request: jest.fn<any>().mockImplementation(async (endpoint: string) => {
          if (endpoint.startsWith('/studio/')) {
            throw new StudioApiError('Not found', 404);
          }
          return { id: 'dpl_fallback', status: 'LIVE' };
        }),
      } as unknown as StudioApiClient;

      const result = await fetchDeploymentStatus(mockClient, 'dpl_fallback');
      expect(result.status).toBe('LIVE');
      expect(mockClient.request).toHaveBeenCalledWith('/deployments/dpl_fallback/status');
    });
  });

  describe('pollDeploymentStatus', () => {
    it('polls until reaching a terminal success state and triggers onStatusChange', async () => {
      const statuses: DeploymentStatusResponse[] = [
        { status: 'QUEUED', isTerminal: false },
        { status: 'BUILDING', isTerminal: false },
        { status: 'DEPLOYING', isTerminal: false },
        { status: 'READY', isTerminal: true, serviceUrl: 'https://mcp.nitrocloud.ai' },
      ];

      let callIndex = 0;
      const mockClient = {
        request: jest.fn<any>().mockImplementation(async () => {
          const resp = statuses[Math.min(callIndex, statuses.length - 1)];
          callIndex++;
          return resp;
        }),
      } as unknown as StudioApiClient;

      const observedChanges: string[] = [];
      const result = await pollDeploymentStatus({
        client: mockClient,
        deploymentId: 'dpl_poll_test',
        intervalMs: 10,
        sleepFn: async () => {},
        onStatusChange: (s) => observedChanges.push(s.status),
      });

      expect(result.status).toBe('READY');
      expect(result.serviceUrl).toBe('https://mcp.nitrocloud.ai');
      expect(observedChanges).toEqual(['QUEUED', 'BUILDING', 'DEPLOYING', 'READY']);
    });

    it('recovers from transient network errors via exponential backoff', async () => {
      let callCount = 0;
      const sleepTimes: number[] = [];

      const mockClient = {
        request: jest.fn<any>().mockImplementation(async () => {
          callCount++;
          if (callCount <= 2) {
            throw new StudioApiError('Internal Server Error', 500);
          }
          return { status: 'READY', isTerminal: true };
        }),
      } as unknown as StudioApiClient;

      const result = await pollDeploymentStatus({
        client: mockClient,
        deploymentId: 'dpl_transient',
        intervalMs: 100,
        sleepFn: async (ms) => {
          sleepTimes.push(ms);
        },
      });

      expect(result.status).toBe('READY');
      expect(callCount).toBe(3);
      expect(sleepTimes.length).toBeGreaterThanOrEqual(2);
      expect(sleepTimes[1]).toBeGreaterThanOrEqual(sleepTimes[0]);
    });

    it('throws error when transient failures exceed max consecutive errors', async () => {
      const mockClient = {
        request: jest.fn<any>().mockRejectedValue(new Error('Persistent network down')),
      } as unknown as StudioApiClient;

      await expect(
        pollDeploymentStatus({
          client: mockClient,
          deploymentId: 'dpl_dead',
          intervalMs: 10,
          sleepFn: async () => {},
        }),
      ).rejects.toThrow('Failed to poll deployment status after 5 consecutive attempts');
    });

    it('enforces timeout guard when deployment hangs', async () => {
      const mockClient = {
        request: jest.fn<any>().mockResolvedValue({ status: 'BUILDING', isTerminal: false }),
      } as unknown as StudioApiClient;

      await expect(
        pollDeploymentStatus({
          client: mockClient,
          deploymentId: 'dpl_hang',
          timeoutMs: 20, // 20ms timeout
          intervalMs: 5,
          sleepFn: async (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        }),
      ).rejects.toThrow('Deployment polling timed out');
    });
  });
});
