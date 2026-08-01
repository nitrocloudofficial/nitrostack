import { Injectable } from '@nitrostack/core';
import { WorkflowStage } from './monitoring.types.js';
@Injectable()
export class DurationRulesService {
  durationMs(stage: WorkflowStage): number {
    const defaults: Record<WorkflowStage, number> = {
      [WorkflowStage.Approved]: 5, [WorkflowStage.Notified]: 15, [WorkflowStage.SupplierAccepted]: 4 * 60,
      [WorkflowStage.PartShipped]: 24 * 60, [WorkflowStage.PartDelivered]: 60, [WorkflowStage.Maintenance]: 4 * 60, [WorkflowStage.Validation]: 30,
      [WorkflowStage.Running]: 10, [WorkflowStage.Completed]: 0, [WorkflowStage.Failed]: 0,
    };
    const key = `FACTORYBRAIN_STAGE_${stage.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_MINUTES`;
    return Number(process.env[key] ?? defaults[stage]) * 60_000;
  }
  deadline(stage: WorkflowStage, enteredAt: string): string { return new Date(Date.parse(enteredAt) + this.durationMs(stage)).toISOString(); }
}
