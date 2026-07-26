export interface ConnectorConfig {
  name: string;
  type: 'github' | 'slack' | 'jira' | 'custom';
  baseUrl: string;
  token?: string;
  enabled: boolean;
}

export interface ConnectorStatus {
  name: string;
  type: string;
  connected: boolean;
  lastChecked: Date;
  message: string;
}

export class ConnectorService {
  private connectors = new Map<string, ConnectorConfig>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    if (process.env.GITHUB_TOKEN) {
      this.register({
        name: 'github',
        type: 'github',
        baseUrl: 'https://api.github.com',
        token: process.env.GITHUB_TOKEN,
        enabled: true,
      });
    }
    if (process.env.SLACK_TOKEN) {
      this.register({
        name: 'slack',
        type: 'slack',
        baseUrl: 'https://slack.com/api',
        token: process.env.SLACK_TOKEN,
        enabled: true,
      });
    }
    if (process.env.JIRA_TOKEN) {
      this.register({
        name: 'jira',
        type: 'jira',
        baseUrl: process.env.JIRA_URL || 'https://jira.atlassian.net',
        token: process.env.JIRA_TOKEN,
        enabled: true,
      });
    }
  }

  register(config: ConnectorConfig): void {
    this.connectors.set(config.name, config);
  }

  async checkConnection(name: string): Promise<ConnectorStatus> {
    const config = this.connectors.get(name);
    if (!config) {
      return { name, type: 'unknown', connected: false, lastChecked: new Date(), message: 'Connector not registered' };
    }
    if (!config.token) {
      return { name, type: config.type, connected: false, lastChecked: new Date(), message: 'No token configured' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      let url = config.baseUrl;

      if (config.type === 'github') url = 'https://api.github.com/user';
      else if (config.type === 'slack') url = 'https://slack.com/api/auth.test';

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${config.token}` },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      return {
        name,
        type: config.type,
        connected: res.ok,
        lastChecked: new Date(),
        message: res.ok ? 'Connected' : `HTTP ${res.status}`,
      };
    } catch {
      return { name, type: config.type, connected: false, lastChecked: new Date(), message: 'Connection failed' };
    }
  }

  async githubRequest(endpoint: string, method = 'GET', body?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = this.connectors.get('github');
    if (!config?.token) throw new Error('GitHub connector not configured. Set GITHUB_TOKEN env var.');

    const res = await fetch(`${config.baseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    return await res.json() as Record<string, unknown>;
  }

  async slackRequest(method: string, params: Record<string, string> = {}): Promise<Record<string, unknown>> {
    const config = this.connectors.get('slack');
    if (!config?.token) throw new Error('Slack connector not configured. Set SLACK_TOKEN env var.');

    const url = new URL(`${config.baseUrl}/${method}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${config.token}` },
    });

    if (!res.ok) throw new Error(`Slack API error: ${res.status}`);
    return await res.json() as Record<string, unknown>;
  }

  async jiraRequest(endpoint: string, method = 'GET', body?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const config = this.connectors.get('jira');
    if (!config?.token) throw new Error('Jira connector not configured. Set JIRA_TOKEN and JIRA_URL env vars.');

    const res = await fetch(`${config.baseUrl}/rest/api/3${endpoint}`, {
      method,
      headers: {
        Authorization: `Basic ${config.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) throw new Error(`Jira API error: ${res.status}`);
    return await res.json() as Record<string, unknown>;
  }

  listConnectors(): { name: string; type: string; enabled: boolean; configured: boolean }[] {
    const allTypes = [
      { name: 'github', type: 'github' as const },
      { name: 'slack', type: 'slack' as const },
      { name: 'jira', type: 'jira' as const },
    ];

    return allTypes.map(t => {
      const config = this.connectors.get(t.name);
      return {
        name: t.name,
        type: t.type,
        enabled: config?.enabled ?? false,
        configured: !!config?.token,
      };
    });
  }
}
