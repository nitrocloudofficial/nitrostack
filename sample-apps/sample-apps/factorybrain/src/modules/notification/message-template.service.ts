import { Injectable } from '@nitrostack/core';
import { ApprovedPlanInput, NotificationAudience } from './notification.types.js';

@Injectable()
export class MessageTemplateService {
  render(audience: NotificationAudience, input: ApprovedPlanInput): { subject: string; message: string } {
    switch (audience) {
      case NotificationAudience.Maintenance:
        return { subject: `Maintenance ticket ${input.ticketId} approved`, message: `${input.maintenance.assignedTeam}: repair ${input.machineId} for ${input.maintenance.likelyCause}. Required part: ${input.maintenance.requiredPart}; estimated repair: ${input.maintenance.estimatedRepairHours} hour(s).` };
      case NotificationAudience.Procurement:
        return { subject: `Purchase ${input.purchase!.purchaseRequestId} approved`, message: `Place the approved order with ${input.purchase!.supplierName} for GBP ${input.purchase!.totalCost.toFixed(2)}. Expected delivery: ${input.purchase!.expectedDeliveryDate}.` };
      case NotificationAudience.Requester:
        return { subject: `Approval outcome for ${input.ticketId}`, message: `Your request was approved by ${input.approvedBy} at ${input.approvedAt}. Workflow ${input.workflowId} is continuing.` };
      case NotificationAudience.FloorSupervisor:
        return { subject: `Revised production plan ${input.production.planId}`, message: `${input.production.affectedOrderCount} order(s) are affected with ${input.production.totalDelayHours} total delay hour(s). ${input.production.plan.summary}` };
      default:
        return { subject: `FactoryBrain workflow ${input.workflowId} approved`, message: `${input.report.incident} ${input.report.recommendation}` };
    }
  }
}
