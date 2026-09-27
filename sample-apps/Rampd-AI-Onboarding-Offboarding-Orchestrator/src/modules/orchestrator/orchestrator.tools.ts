import { ToolDecorator as Tool, ExecutionContext, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { IdentityStore } from '../identity/identity.store.js';
import { EquipmentStore } from '../equipment/equipment.store.js';
import { WorkspaceStore } from '../workspace/workspace.store.js';

export interface OnboardingStep {
  system: string;
  action: string;
  status: 'success' | 'failed';
  details: string;
}

export interface OnboardingSummary {
  employeeName: string;
  role: string;
  steps: OnboardingStep[];
  completedAt: string;
}

@Injectable({ deps: [IdentityStore, EquipmentStore, WorkspaceStore] })
export class OrchestratorTools {
  constructor(
    private identityStore: IdentityStore,
    private equipmentStore: EquipmentStore,
    private workspaceStore: WorkspaceStore,
  ) {}

  @Tool({
    name: 'onboardEmployee',
    description: 'Orchestrate complete employee onboarding across identity, equipment, and workspace systems. Executes in order: grant identity → assign equipment → provision workspace.',
    inputSchema: z.object({
      employeeName: z.string().describe('Full name of the employee'),
      role: z.string().describe('Job role (e.g., "Engineer", "Manager")'),
    }),
  })
  async onboardEmployee(
    input: { employeeName: string; role: string },
    ctx: ExecutionContext,
  ): Promise<OnboardingSummary> {
    const steps: OnboardingStep[] = [];
    ctx.logger.info(`Starting onboarding for ${input.employeeName} (${input.role})`);

    try {
      // Step 1: Grant Identity
      ctx.logger.info(`[1/3] Granting identity...`);
      const identityResult = this.identityStore.grant(input.employeeName, input.role);
      steps.push({
        system: 'Identity',
        action: 'grantIdentity',
        status: 'success',
        details: `Systems granted: ${identityResult.systems.join(', ')}`,
      });
    } catch (error) {
      ctx.logger.error(`Identity grant failed: ${error}`);
      steps.push({
        system: 'Identity',
        action: 'grantIdentity',
        status: 'failed',
        details: String(error),
      });
    }

    try {
      // Step 2: Assign Equipment
      ctx.logger.info(`[2/3] Assigning equipment...`);
      const equipmentResult = this.equipmentStore.assign(input.employeeName, input.role);
      steps.push({
        system: 'Equipment',
        action: 'assignEquipment',
        status: 'success',
        details: `Items assigned: ${equipmentResult.items.join(', ')}`,
      });
    } catch (error) {
      ctx.logger.error(`Equipment assignment failed: ${error}`);
      steps.push({
        system: 'Equipment',
        action: 'assignEquipment',
        status: 'failed',
        details: String(error),
      });
    }

    try {
      // Step 3: Provision Workspace
      ctx.logger.info(`[3/3] Provisioning workspace...`);
      const workspaceResult = this.workspaceStore.provision(input.employeeName, input.role);
      steps.push({
        system: 'Workspace',
        action: 'provisionWorkspace',
        status: 'success',
        details: `Email: ${workspaceResult.email}, Channels: ${workspaceResult.slackChannels.join(', ')}`,
      });
    } catch (error) {
      ctx.logger.error(`Workspace provisioning failed: ${error}`);
      steps.push({
        system: 'Workspace',
        action: 'provisionWorkspace',
        status: 'failed',
        details: String(error),
      });
    }

    const summary: OnboardingSummary = {
      employeeName: input.employeeName,
      role: input.role,
      steps,
      completedAt: new Date().toISOString(),
    };

    ctx.logger.info(`Onboarding completed for ${input.employeeName}`);
    return summary;
  }

  @Tool({
    name: 'offboardEmployee',
    description: 'Orchestrate complete employee offboarding across workspace, equipment, and identity systems (reverse order). Executes: deprovision workspace → reclaim equipment → revoke identity.',
    inputSchema: z.object({
      employeeName: z.string().describe('Full name of the employee'),
    }),
  })
  async offboardEmployee(
    input: { employeeName: string },
    ctx: ExecutionContext,
  ): Promise<OnboardingSummary> {
    const steps: OnboardingStep[] = [];
    ctx.logger.info(`Starting offboarding for ${input.employeeName}`);

    try {
      // Step 1: Deprovision Workspace (first, to cut access)
      ctx.logger.info(`[1/3] Deprovisioning workspace...`);
      this.workspaceStore.deprovision(input.employeeName);
      steps.push({
        system: 'Workspace',
        action: 'deprovisionWorkspace',
        status: 'success',
        details: 'Workspace access removed',
      });
    } catch (error) {
      ctx.logger.error(`Workspace deprovisioning failed: ${error}`);
      steps.push({
        system: 'Workspace',
        action: 'deprovisionWorkspace',
        status: 'failed',
        details: String(error),
      });
    }

    try {
      // Step 2: Reclaim Equipment
      ctx.logger.info(`[2/3] Reclaiming equipment...`);
      this.equipmentStore.reclaim(input.employeeName);
      steps.push({
        system: 'Equipment',
        action: 'reclaimEquipment',
        status: 'success',
        details: 'All equipment reclaimed',
      });
    } catch (error) {
      ctx.logger.error(`Equipment reclaim failed: ${error}`);
      steps.push({
        system: 'Equipment',
        action: 'reclaimEquipment',
        status: 'failed',
        details: String(error),
      });
    }

    try {
      // Step 3: Revoke Identity (last, to kill access)
      ctx.logger.info(`[3/3] Revoking identity...`);
      this.identityStore.revoke(input.employeeName);
      steps.push({
        system: 'Identity',
        action: 'revokeIdentity',
        status: 'success',
        details: 'Identity and all system access revoked',
      });
    } catch (error) {
      ctx.logger.error(`Identity revocation failed: ${error}`);
      steps.push({
        system: 'Identity',
        action: 'revokeIdentity',
        status: 'failed',
        details: String(error),
      });
    }

    const summary: OnboardingSummary = {
      employeeName: input.employeeName,
      role: 'N/A',
      steps,
      completedAt: new Date().toISOString(),
    };

    ctx.logger.info(`Offboarding completed for ${input.employeeName}`);
    return summary;
  }
}
