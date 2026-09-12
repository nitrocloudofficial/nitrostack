import { ConnectorType } from '@prisma/client';

export interface ConnectorInterface {
  type: ConnectorType;
  connect(organizationId: string, config: Record<string, unknown>): Promise<{ connected: boolean; name: string }>;
  disconnect(accountId: string): Promise<boolean>;
  sync(accountId: string, mode: 'FULL' | 'INCREMENTAL'): Promise<{ recordsSynced: number }>;
  webhook(payload: unknown): Promise<{ processed: boolean }>;
  health(accountId: string): Promise<{ status: 'HEALTHY' | 'DEGRADED' | 'DOWN'; latencyMs: number }>;
  events(): string[];
}

export class BaseMockConnector implements ConnectorInterface {
  constructor(public type: ConnectorType) {}

  async connect(organizationId: string, config: Record<string, unknown>) {
    return { connected: true, name: `${this.type} Connection (${organizationId.slice(0, 8)})` };
  }

  async disconnect(accountId: string) {
    return true;
  }

  async sync(accountId: string, mode: 'FULL' | 'INCREMENTAL') {
    return { recordsSynced: Math.floor(Math.random() * 50) + 10 };
  }

  async webhook(payload: unknown) {
    return { processed: true };
  }

  async health(accountId: string) {
    return { status: 'HEALTHY' as const, latencyMs: Math.floor(Math.random() * 40) + 10 };
  }

  events() {
    return ['sync_completed', 'webhook_received', 'account_linked'];
  }
}

export const GitHubConnector = new BaseMockConnector(ConnectorType.GITHUB);
export const SlackConnector = new BaseMockConnector(ConnectorType.SLACK);
export const JiraConnector = new BaseMockConnector(ConnectorType.JIRA);
export const GoogleWorkspaceConnector = new BaseMockConnector(ConnectorType.GOOGLE_WORKSPACE);
