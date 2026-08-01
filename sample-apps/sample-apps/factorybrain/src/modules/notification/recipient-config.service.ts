import { Injectable } from '@nitrostack/core';
import { ApprovedPlanInput, NotificationAudience, NotificationChannel, NotificationRecipient } from './notification.types.js';

@Injectable()
export class RecipientConfigService {
  resolve(input: ApprovedPlanInput): NotificationRecipient[] {
    const maintenanceTeam = input.maintenance.assignedTeam;
    const recipients: NotificationRecipient[] = [
      recipient('maintenance', maintenanceTeam, process.env.FACTORYBRAIN_MAINTENANCE_EMAIL ?? `${slug(maintenanceTeam)}@factorybrain.local`, NotificationAudience.Maintenance),
      recipient('requester', input.originalRequester, process.env.FACTORYBRAIN_REQUESTER_EMAIL ?? `${slug(input.originalRequester)}@factorybrain.local`, NotificationAudience.Requester),
      recipient('floor', process.env.FACTORYBRAIN_FLOOR_SUPERVISOR_NAME ?? 'Floor Supervisor', process.env.FACTORYBRAIN_FLOOR_SUPERVISOR_EMAIL ?? 'floor-supervisor@factorybrain.local', NotificationAudience.FloorSupervisor),
      { recipientId: 'manager-dashboard', displayName: 'Manager Dashboard', address: 'manager-dashboard', audience: NotificationAudience.ManagerDashboard, channel: NotificationChannel.Dashboard },
    ];
    if (input.purchase) {
      recipients.splice(1, 0, recipient('procurement', 'Procurement Team', process.env.FACTORYBRAIN_PROCUREMENT_EMAIL ?? 'procurement@factorybrain.local', NotificationAudience.Procurement));
    }
    return recipients;
  }
}

function recipient(id: string, name: string, address: string, audience: NotificationAudience): NotificationRecipient {
  return { recipientId: id, displayName: name, address, audience, channel: NotificationChannel.Email };
}
function slug(value: string): string { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'team'; }
