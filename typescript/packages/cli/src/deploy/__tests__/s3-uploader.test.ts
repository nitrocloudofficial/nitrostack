import { describe, it, expect, jest } from '@jest/globals';
import { uploadZipToS3 } from '../s3-uploader.js';

describe('S3 Uploader', () => {
  it('successfully uploads binary buffer via HTTP PUT with correct headers', async () => {
    const mockBuffer = Buffer.from('PK...fake-zip-binary-content...');
    let capturedMethod = '';
    let capturedHeaders: any = {};
    let capturedBody: any = null;

    const mockFetch = (jest.fn<any>().mockImplementation(async (_url: any, init: any) => {
      capturedMethod = init?.method;
      capturedHeaders = init?.headers;
      capturedBody = init?.body;
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
      };
    })) as unknown as typeof fetch;

    let progressReported = 0;
    await uploadZipToS3('https://s3.amazonaws.com/nitro-bucket/deploy.zip?presigned=true', mockBuffer, {
      fetchFn: mockFetch,
      onProgress: (p) => {
        progressReported = p;
      },
    });

    expect(capturedMethod).toBe('PUT');
    expect(capturedHeaders['Content-Type']).toBe('application/octet-stream');
    expect(capturedHeaders['Content-Length']).toBe(String(mockBuffer.length));
    expect(capturedBody).toBe(mockBuffer);
    expect(progressReported).toBe(100);
  });

  it('throws descriptive error on S3 HTTP failure', async () => {
    const mockBuffer = Buffer.from('test');

    const mockFetch = (jest.fn<any>().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'RequestTimeTooSkewed',
    })) as unknown as typeof fetch;

    await expect(
      uploadZipToS3('https://s3.amazonaws.com/fail.zip', mockBuffer, { fetchFn: mockFetch }),
    ).rejects.toThrow('S3 package upload failed with status 403: RequestTimeTooSkewed');
  });
});
