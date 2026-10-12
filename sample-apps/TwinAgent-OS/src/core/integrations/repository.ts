import { prisma } from '../../config/database.js';
import { ConnectorType, SyncStatus } from '@prisma/client';

export class IntegrationsRepository {
  async findAccountsByOrg(organizationId: string) {
    return prisma.connectorAccount.findMany({
      where: { organizationId },
      include: { syncJobs: { orderBy: { startedAt: 'desc' }, take: 3 } },
    });
  }

  async findAccountById(id: string) {
    return prisma.connectorAccount.findUnique({ where: { id } });
  }

  async createAccount(organizationId: string, type: ConnectorType, name: string, config: object) {
    return prisma.connectorAccount.create({
      data: {
        organizationId,
        type,
        name,
        config: config as any,
        status: 'CONNECTED',
      },
    });
  }

  async updateAccountLastSynced(id: string) {
    return prisma.connectorAccount.update({
      where: { id },
      data: { lastSyncedAt: new Date() },
    });
  }

  async createSyncJob(accountId: string, syncType: string) {
    return prisma.syncJob.create({
      data: {
        accountId,
        syncType,
        status: SyncStatus.RUNNING,
      },
    });
  }

  async updateSyncJob(id: string, status: SyncStatus, recordsSynced: number, error?: string) {
    return prisma.syncJob.update({
      where: { id },
      data: {
        status,
        recordsSynced,
        error,
        completedAt: new Date(),
      },
    });
  }
}

export const integrationsRepository = new IntegrationsRepository();
