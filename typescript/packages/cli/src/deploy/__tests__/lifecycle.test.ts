import { describe, it, expect, jest } from '@jest/globals';
import {
  requestAppPresignedUpload,
  markUploadComplete,
  confirmDeployment,
} from '../lifecycle.js';
import { StudioApiClient } from '../../api/client.js';

describe('Deploy Lifecycle API', () => {
  it('requestAppPresignedUpload calls /studio/apps/deployments/presign', async () => {
    const mockRequest = jest.fn<any>().mockResolvedValue({
      studioDeploymentId: 'sd_123',
      presignedUrl: 'https://s3.amazonaws.com/upload-slot',
    });

    const mockClient = { request: mockRequest } as unknown as StudioApiClient;

    const result = await requestAppPresignedUpload(mockClient, {
      appId: 'app_abc',
      organizationId: 'org_xyz',
      environmentVariables: { FOO: 'BAR' },
    });

    expect(result.studioDeploymentId).toBe('sd_123');
    expect(result.presignedUrl).toBe('https://s3.amazonaws.com/upload-slot');
    expect(mockRequest).toHaveBeenCalledWith(
      '/studio/apps/deployments/presign',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          appId: 'app_abc',
          organizationId: 'org_xyz',
          environmentVariables: { FOO: 'BAR' },
        }),
      }),
    );
  });

  it('markUploadComplete calls /studio/deployments/:id/upload-complete', async () => {
    const mockRequest = jest.fn<any>().mockResolvedValue({ success: true });
    const mockClient = { request: mockRequest } as unknown as StudioApiClient;

    await markUploadComplete(mockClient, 'sd_123');

    expect(mockRequest).toHaveBeenCalledWith(
      '/studio/deployments/sd_123/upload-complete',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('confirmDeployment calls /studio/deployments/:id/confirm', async () => {
    const mockRequest = jest.fn<any>().mockResolvedValue({
      deploymentId: 'dpl_live_999',
      appId: 'app_abc',
    });
    const mockClient = { request: mockRequest } as unknown as StudioApiClient;

    const result = await confirmDeployment(mockClient, 'sd_123', { autoDeployChat: false });

    expect(result.deploymentId).toBe('dpl_live_999');
    expect(mockRequest).toHaveBeenCalledWith(
      '/studio/deployments/sd_123/confirm',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ autoDeployChat: false }),
      }),
    );
  });
});
