import { describe, it, expect } from '@jest/globals';
import { startLoopbackAuth } from '../loopback.js';

describe('Loopback Auth Server', () => {
  it('should start loopback server and handle successful callback', async () => {
    let capturedUrl = '';

    const authPromise = startLoopbackAuth('https://test.nitrocloud.ai', {
      timeoutMs: 10000,
      state: 'fixed_test_state_123',
      onServerReady: (url) => {
        capturedUrl = url;
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(capturedUrl).toContain('https://test.nitrocloud.ai/studio/auth/login');
    expect(capturedUrl).toContain('state=fixed_test_state_123');
    expect(capturedUrl).toContain('source=cli');

    const parsedUrl = new URL(capturedUrl);
    const redirectUri = parsedUrl.searchParams.get('redirect_uri');
    expect(redirectUri).toBeDefined();

    // Perform the GET request that NitroCloud /studio/auth/complete would issue
    const callbackUrl = new URL(redirectUri!);
    callbackUrl.searchParams.set('token', 'mock_jwt_token_abc');
    callbackUrl.searchParams.set('state', 'fixed_test_state_123');
    callbackUrl.searchParams.set('apiUrl', 'https://api.test.nitrocloud.ai/api/v1');

    const res = await fetch(callbackUrl.toString());
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Authentication Successful!');
    expect(html).toContain('NitroStack CLI');

    const result = await authPromise;
    expect(result.token).toBe('mock_jwt_token_abc');
    expect(result.apiUrl).toBe('https://api.test.nitrocloud.ai/api/v1');
  });

  it('should reject when state does not match', async () => {
    let capturedUrl = '';

    const authPromise = startLoopbackAuth('https://test.nitrocloud.ai', {
      timeoutMs: 10000,
      state: 'expected_state',
      onServerReady: (url) => {
        capturedUrl = url;
      },
    });

    // Prevent unhandled rejection while awaiting fetch
    authPromise.catch(() => {});

    await new Promise((resolve) => setTimeout(resolve, 50));

    const parsedUrl = new URL(capturedUrl);
    const redirectUri = parsedUrl.searchParams.get('redirect_uri')!;
    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set('token', 'any_token');
    callbackUrl.searchParams.set('state', 'wrong_tampered_state');

    const res = await fetch(callbackUrl.toString());
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain('Security Verification Failed');

    await expect(authPromise).rejects.toThrow('State parameter mismatch');
  });

  it('should reject when an error is returned in callback', async () => {
    let capturedUrl = '';

    const authPromise = startLoopbackAuth('https://test.nitrocloud.ai', {
      timeoutMs: 10000,
      state: 'my_state',
      onServerReady: (url) => {
        capturedUrl = url;
      },
    });

    // Prevent unhandled rejection while awaiting fetch
    authPromise.catch(() => {});

    await new Promise((resolve) => setTimeout(resolve, 50));

    const parsedUrl = new URL(capturedUrl);
    const redirectUri = parsedUrl.searchParams.get('redirect_uri')!;
    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set('error', 'access_denied');
    callbackUrl.searchParams.set('error_description', 'User cancelled Google sign in');

    const res = await fetch(callbackUrl.toString());
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain('Authentication Failed');
    expect(html).toContain('User cancelled Google sign in');

    await expect(authPromise).rejects.toThrow('Browser login failed: User cancelled Google sign in');
  });

  it('should return 404 for unknown endpoints', async () => {
    let capturedUrl = '';

    const authPromise = startLoopbackAuth('https://test.nitrocloud.ai', {
      timeoutMs: 10000,
      state: 'my_state',
      onServerReady: (url) => {
        capturedUrl = url;
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const parsedUrl = new URL(capturedUrl);
    const redirectUri = parsedUrl.searchParams.get('redirect_uri')!;
    const wrongUrl = new URL('/other/path', redirectUri);

    const res = await fetch(wrongUrl.toString());
    expect(res.status).toBe(404);

    // Now complete the valid flow so the server cleanly finishes
    const validUrl = new URL(redirectUri);
    validUrl.searchParams.set('token', 'tok_123');
    validUrl.searchParams.set('state', 'my_state');
    await fetch(validUrl.toString());

    await authPromise;
  });

  it('should handle timeout when no response arrives', async () => {
    const authPromise = startLoopbackAuth('https://test.nitrocloud.ai', {
      timeoutMs: 150,
      state: 'state_timeout',
    });

    await expect(authPromise).rejects.toThrow('Authentication timed out.');
  });
});
