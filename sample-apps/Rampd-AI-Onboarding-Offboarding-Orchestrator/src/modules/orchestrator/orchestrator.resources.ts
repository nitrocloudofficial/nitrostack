import { ResourceDecorator as Resource, ExecutionContext, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { IdentityStore } from '../identity/identity.store.js';
import { EquipmentStore } from '../equipment/equipment.store.js';
import { WorkspaceStore } from '../workspace/workspace.store.js';

export interface EmployeeStatus {
  employeeName: string;
  identity: {
    role: string | null;
    accessGranted: boolean;
    systems: string[];
  };
  equipment: {
    items: string[];
    status: 'assigned' | 'returned' | 'none';
  };
  workspace: {
    email: string | null;
    slackChannels: string[];
    driveAccess: boolean;
    status: 'active' | 'deprovisioned' | 'none';
  };
}

@Injectable({ deps: [IdentityStore, EquipmentStore, WorkspaceStore] })
export class OrchestratorResources {
  constructor(
    private identityStore: IdentityStore,
    private equipmentStore: EquipmentStore,
    private workspaceStore: WorkspaceStore,
  ) {}

  @Resource({
    uri: 'rampd://employee-status',
    name: 'Employee Status',
    description: 'Retrieve aggregated employee status across all systems (identity, equipment, workspace). Read-only view of current provisioning state.',
    mimeType: 'application/json',
  })
  async getEmployeeStatus(uri: string, ctx: ExecutionContext): Promise<any> {
    // Extract employeeName from query parameter if present
    const url = new URL(uri, 'http://localhost');
    const employeeName = url.searchParams.get('employeeName');

    if (!employeeName) {
      ctx.logger.warn('getEmployeeStatus called without employeeName parameter');
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ error: 'employeeName parameter required' }, null, 2),
        }],
      };
    }

    ctx.logger.info(`Fetching aggregated status for ${employeeName}`);

    const identityRecord = this.identityStore.getStatus(employeeName);
    const equipmentRecord = this.equipmentStore.getStatus(employeeName);
    const workspaceRecord = this.workspaceStore.getStatus(employeeName);

    const status: EmployeeStatus = {
      employeeName,
      identity: {
        role: identityRecord?.role ?? null,
        accessGranted: identityRecord?.accessGranted ?? false,
        systems: identityRecord?.systems ?? [],
      },
      equipment: {
        items: equipmentRecord?.items ?? [],
        status: equipmentRecord?.status ?? 'none',
      },
      workspace: {
        email: workspaceRecord?.email ?? null,
        slackChannels: workspaceRecord?.slackChannels ?? [],
        driveAccess: workspaceRecord?.driveAccess ?? false,
        status: workspaceRecord?.status ?? 'none',
      },
    };

    ctx.logger.info(`Aggregated status retrieved for ${employeeName}`);

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(status, null, 2),
      }],
    };
  }
}
