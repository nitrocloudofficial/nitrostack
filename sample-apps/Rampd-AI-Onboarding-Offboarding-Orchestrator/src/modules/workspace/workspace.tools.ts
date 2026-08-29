import { ToolDecorator as Tool, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { WorkspaceStore, WorkspaceRecord } from './workspace.store.js';

export class WorkspaceTools {
  constructor(private store: WorkspaceStore) {}

  @Tool({
    name: 'provisionWorkspace',
    description: 'Provision workspace access for an employee, including email, Slack channels, and drive access. Role-based channel defaults apply.',
    inputSchema: z.object({
      employeeName: z.string().describe('Full name of the employee'),
      role: z.string().describe('Job role to determine workspace defaults'),
    }),
  })
  async provisionWorkspace(
    input: { employeeName: string; role: string },
    ctx: ExecutionContext,
  ): Promise<WorkspaceRecord> {
    ctx.logger.info(`Provisioning workspace for ${input.employeeName} (${input.role})`);
    const record = this.store.provision(input.employeeName, input.role);
    ctx.logger.info(`Workspace provisioned: email=${record.email}, channels=${record.slackChannels.join(', ')}`);
    return record;
  }

  @Tool({
    name: 'deprovisionWorkspace',
    description: 'Deprovision workspace access for an employee, removing email, Slack channels, and drive access.',
    inputSchema: z.object({
      employeeName: z.string().describe('Full name of the employee'),
    }),
  })
  async deprovisionWorkspace(
    input: { employeeName: string },
    ctx: ExecutionContext,
  ): Promise<WorkspaceRecord | null> {
    ctx.logger.info(`Deprovisioning workspace for ${input.employeeName}`);
    const record = this.store.deprovision(input.employeeName);
    if (record) {
      ctx.logger.info(`Workspace deprovisioned; status set to deprovisioned`);
    } else {
      ctx.logger.warn(`No workspace record found for ${input.employeeName}`);
    }
    return record;
  }

  @Tool({
    name: 'getWorkspaceStatus',
    description: 'Retrieve the current workspace provisioning status for an employee.',
    inputSchema: z.object({
      employeeName: z.string().describe('Full name of the employee'),
    }),
  })
  async getWorkspaceStatus(
    input: { employeeName: string },
    ctx: ExecutionContext,
  ): Promise<WorkspaceRecord | null> {
    ctx.logger.info(`Fetching workspace status for ${input.employeeName}`);
    return this.store.getStatus(input.employeeName);
  }
}
