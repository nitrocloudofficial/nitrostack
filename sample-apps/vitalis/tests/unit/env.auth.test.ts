import { describe, expect, it } from 'vitest';
import { getAuthConfigurationErrors, getDeploymentConfigurationErrors } from '../../src/config/env.js';

const productionWithoutCredentials = {
  NODE_ENV: 'production' as const,
  API_KEY_CLINICIAN: undefined,
  API_KEY_READONLY: undefined,
  API_KEY_ADMIN: undefined,
  JWT_SECRET: undefined,
};

describe('production authentication configuration', () => {
  it('fails closed when production has no configured credential', () => {
    expect(getAuthConfigurationErrors(productionWithoutCredentials)).toEqual([
      expect.stringContaining('at least one configured API key or JWT_SECRET'),
    ]);
  });

  it('accepts production with an API key', () => {
    expect(
      getAuthConfigurationErrors({
        ...productionWithoutCredentials,
        API_KEY_CLINICIAN: 'configured-clinician-key',
      }),
    ).toEqual([]);
  });

  it('accepts production with JWT authentication configured', () => {
    expect(
      getAuthConfigurationErrors({
        ...productionWithoutCredentials,
        JWT_SECRET: 'configured-jwt-secret-long-enough',
      }),
    ).toEqual([]);
  });

  it('does not impose the production credential requirement on development/test', () => {
    expect(
      getAuthConfigurationErrors({
        ...productionWithoutCredentials,
        NODE_ENV: 'development',
      }),
    ).toEqual([]);
  });

  it('requires contact and NCBI etiquette email in production', () => {
    const config = {
      ...productionWithoutCredentials,
      API_KEY_CLINICIAN: 'configured-clinician-key',
      CONTACT_EMAIL: undefined,
      NCBI_EMAIL: undefined,
    } as const;
    expect(getDeploymentConfigurationErrors(config)).toEqual([
      expect.stringContaining('CONTACT_EMAIL'),
      expect.stringContaining('NCBI_EMAIL'),
    ]);
    expect(
      getDeploymentConfigurationErrors({
        ...config,
        CONTACT_EMAIL: 'ops@example.com',
        NCBI_EMAIL: 'ncbi@example.com',
      }),
    ).toEqual([]);
  });
});
