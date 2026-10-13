import { ToolDecorator as Tool, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { IdentityStore, IdentityRecord } from './identity.store.js';

export class IdentityTools {
  constructor(private store: IdentityStore) {}

  @Tool({
    name: 'grantIdentity',
    description: 'Grant identity and access to an employee in the SSO/HR system. Assigns role-based default systems (engineers get SSO+VPN+CodeHost, others get SSO+Email).',
    inputSchema: z.object({
      employeeName: z.string().describe('Full name of the employee'),
      role: z.string().describe('Job role (e.g., "Engineer", "Manager", "Designer")'),
    }),
  })
  async grantIdentity(
    input: { employeeName: string; role: string },
    ctx: ExecutionContext,
  ): Promise<IdentityRecord> {
    ctx.logger.info(`Granting identity to ${input.employeeName} as ${input.role}`);
    const record = this.store.grant(input.employeeName, input.role);
    ctx.logger.info(`Identity granted with systems: ${record.systems.join(', ')}`);
    return record;
  }

  @Tool({
    name: 'revokeIdentity',
    description: 'Revoke identity and access for an employee, removing all system access.',
    inputSchema: z.object({
      employeeName: z.string().describe('Full name of the employee'),
    }),
  })
  async revokeIdentity(
    input: { employeeName: string },
    ctx: ExecutionContext,
  ): Promise<IdentityRecord | null> {
    ctx.logger.info(`Revoking identity for ${input.employeeName}`);
    const record = this.store.revoke(input.employeeName);
    if (record) {
      ctx.logger.info(`Identity revoked; access removed`);
    } else {
      ctx.logger.warn(`No identity record found for ${input.employeeName}`);
    }
    return record;
  }

  @Tool({
    name: 'getIdentityStatus',
    description: 'Retrieve the current identity and access status for an employee.',
    inputSchema: z.object({
      employeeName: z.string().describe('Full name of the employee'),
    }),
  })
  async getIdentityStatus(
    input: { employeeName: string },
    ctx: ExecutionContext,
  ): Promise<IdentityRecord | null> {
    ctx.logger.info(`Fetching identity status for ${input.employeeName}`);
    return this.store.getStatus(input.employeeName);
  }
}
