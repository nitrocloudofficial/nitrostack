import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';

const mockCapture = jest.fn();
const mockAlias = jest.fn();
const mockIdentify = jest.fn();
const mockGroupIdentify = jest.fn();
const mockShutdown = jest.fn();

jest.unstable_mockModule('posthog-node', () => ({
  PostHog: jest.fn().mockImplementation(() => ({
    capture: mockCapture,
    alias: mockAlias,
    identify: mockIdentify,
    groupIdentify: mockGroupIdentify,
    shutdown: mockShutdown,
  })),
}));

let analytics: typeof import('../posthog.js');

describe('analytics/posthog', () => {
  beforeAll(async () => {
    analytics = await import('../posthog.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DO_NOT_TRACK;
    delete process.env.NITROSTACK_TELEMETRY;
    delete process.env.CI;
    process.env.NITROSTACK_POSTHOG_KEY = 'test_posthog_project_key_stub';
    process.env.NODE_ENV = 'development';
    analytics.__resetAnalyticsModuleForTests();
  });

  afterEach(() => {
    analytics.__resetAnalyticsModuleForTests();
    delete process.env.NITROSTACK_POSTHOG_KEY;
  });

  it('uses built-in default project key when NITROSTACK_POSTHOG_KEY is unset', () => {
    delete process.env.NITROSTACK_POSTHOG_KEY;
    analytics.__resetAnalyticsModuleForTests();
    expect(analytics.__getResolvedPosthogProjectKeyForTests()).toBe(analytics.CLI_DEFAULT_POSTHOG_PROJECT_KEY);
  });

  it('uses trimmed NITROSTACK_POSTHOG_KEY when set', () => {
    process.env.NITROSTACK_POSTHOG_KEY = '  test_posthog_project_key_stub  ';
    analytics.__resetAnalyticsModuleForTests();
    expect(analytics.__getResolvedPosthogProjectKeyForTests()).toBe('test_posthog_project_key_stub');
  });

  it('trackEvent sends super properties and command fields', () => {
    analytics.trackEvent('cli_command_invoked', {
      command: 'init',
    });
    expect(mockCapture).toHaveBeenCalledTimes(1);
    const call = mockCapture.mock.calls[0][0] as {
      event: string;
      properties: Record<string, unknown>;
    };
    expect(call.event).toBe('cli_command_invoked');
    expect(call.properties.product).toBe('cli');
    expect(call.properties.surface).toBe('terminal');
    expect(call.properties.environment).toBe('development');
    expect(call.properties.command).toBe('init');
    expect(call.properties.cli_version).toBeDefined();
    expect(call.properties.node_version).toBeDefined();
  });

  it('honours DO_NOT_TRACK and sends nothing', () => {
    process.env.DO_NOT_TRACK = '1';
    analytics.__resetAnalyticsModuleForTests();
    analytics.trackEvent('cli_command_invoked', { command: 'init' });
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('honours NITROSTACK_TELEMETRY=0', () => {
    process.env.NITROSTACK_TELEMETRY = '0';
    analytics.__resetAnalyticsModuleForTests();
    analytics.trackEvent('cli_command_invoked', { command: 'init' });
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('onLoginSuccess aliases and identifies with email (#357 identity helpers)', () => {
    analytics.onLoginSuccess('user_stable_cloud_id', 'alex@example.com');
    expect(mockAlias).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: expect.any(String),
        alias: 'user_stable_cloud_id',
      }),
    );
    expect(mockIdentify).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: 'user_stable_cloud_id',
        properties: { email: 'alex@example.com' },
      }),
    );
    analytics.trackEvent('cli_studio_connected', {
      command: 'link',
      app_id: 'app_1',
      organization_id: 'org_1',
      target: 'nitrocloud',
    });
    type Cap = { event: string; distinctId: string; properties: Record<string, unknown> };
    const captureCall = mockCapture.mock.calls.find((c) => (c[0] as Cap).event === 'cli_studio_connected');
    expect(captureCall).toBeDefined();
    const cap0 = captureCall![0] as Cap;
    expect(cap0.distinctId).toBe('user_stable_cloud_id');
    expect(cap0.properties.cloud_user_id).toBe('user_stable_cloud_id');
    expect(cap0.properties.user_email).toBe('alex@example.com');
  });

  it('hydrateAnalyticsFromSession skips duplicate alias on next login', () => {
    analytics.hydrateAnalyticsFromSession('sess_user', 'u@example.com');
    analytics.__resetAnalyticsModuleForTests();
    process.env.NITROSTACK_POSTHOG_KEY = 'test_posthog_project_key_stub';
    analytics.hydrateAnalyticsFromSession('sess_user', 'u@example.com');
    analytics.onLoginSuccess('sess_user', 'u@example.com');
    expect(mockAlias).not.toHaveBeenCalled();
  });

  it('deploy journey event shape (#357) includes app_id, deployment_id, target, groups', () => {
    analytics.onLoginSuccess('uid_deploy', 'deployer@example.com');
    mockCapture.mockClear();
    analytics.trackEvent(
      'cli_deploy_completed',
      {
        command: 'deploy',
        app_id: 'app_z',
        deployment_id: 'dep_z',
        target: 'nitrocloud',
      },
      { groups: { organization: 'org_z' } },
    );
    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'cli_deploy_completed',
        properties: expect.objectContaining({
          app_id: 'app_z',
          deployment_id: 'dep_z',
          target: 'nitrocloud',
          cloud_user_id: 'uid_deploy',
          user_email: 'deployer@example.com',
        }),
        groups: { organization: 'org_z' },
      }),
    );

    analytics.trackEvent(
      'cli_deploy_failed',
      {
        command: 'deploy',
        app_id: 'app_z',
        deployment_id: 'dep_z',
        error_code: 'FAILED',
        target: 'nitrocloud',
      },
      { groups: { organization: 'org_z' } },
    );
    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'cli_deploy_failed',
        properties: expect.objectContaining({
          error_code: 'FAILED',
        }),
      }),
    );
  });
});
