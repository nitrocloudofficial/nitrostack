import { integrationsRepository } from './repository.js';
import { ConnectorType, SyncStatus } from '@prisma/client';
import { GitHubConnector, SlackConnector, JiraConnector, GoogleWorkspaceConnector, ConnectorInterface } from './connector.js';
import { NotFoundError } from '../../shared/errors/AppError.js';

export class IntegrationsService {
  private connectors: Map<ConnectorType, ConnectorInterface> = new Map([
    [ConnectorType.GITHUB, GitHubConnector],
    [ConnectorType.SLACK, SlackConnector],
    [ConnectorType.JIRA, JiraConnector],
    [ConnectorType.GOOGLE_WORKSPACE, GoogleWorkspaceConnector],
  ]);

  async getConnectedAccounts(organizationId: string) {
    return integrationsRepository.findAccountsByOrg(organizationId);
  }

  async connectAccount(organizationId: string, type: ConnectorType, name: string, config: Record<string, unknown>) {
    const connector = this.connectors.get(type) || GitHubConnector;
    const result = await connector.connect(organizationId, config);

    return integrationsRepository.createAccount(organizationId, type, name || result.name, config);
  }

  async triggerSync(accountId: string, mode: 'FULL' | 'INCREMENTAL' = 'INCREMENTAL') {
    const account = await integrationsRepository.findAccountById(accountId);
    if (!account) throw new NotFoundError('Connector account not found');

    const connector = this.connectors.get(account.type) || GitHubConnector;
    const syncJob = await integrationsRepository.createSyncJob(accountId, mode);

    try {
      const res = await connector.sync(accountId, mode);
      await integrationsRepository.updateSyncJob(syncJob.id, SyncStatus.COMPLETED, res.recordsSynced);
      await integrationsRepository.updateAccountLastSynced(accountId);

      return { syncJobId: syncJob.id, recordsSynced: res.recordsSynced, status: 'COMPLETED' };
    } catch (err: any) {
      await integrationsRepository.updateSyncJob(syncJob.id, SyncStatus.FAILED, 0, err.message);
      throw err;
    }
  }

  async processWebhook(connectorType: ConnectorType, payload: unknown) {
    const connector = this.connectors.get(connectorType) || GitHubConnector;
    return connector.webhook(payload);
  }
}

export const integrationsService = new IntegrationsService();
