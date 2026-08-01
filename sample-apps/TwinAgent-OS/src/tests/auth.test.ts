import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from '../app.js';

describe('Authentication & User Management APIs', () => {
  const app = buildApp();

  it('should register a new organization owner', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `test-${Date.now()}@testorg.com`,
        password: 'password123',
        firstName: 'Test',
        lastName: 'Admin',
        orgName: `Test Org ${Date.now()}`,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.role).toBe('OWNER');
  });

  it('should reject invalid login credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'nonexistent@test.com',
        password: 'wrongpassword',
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
