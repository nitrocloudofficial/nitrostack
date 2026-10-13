import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { NotificationService } from './notification.service.js';
import { SentinelService } from '../sentinel/sentinel.service.js';
import { ImpactService } from '../impact/impact.service.js';
import { BrokerageService } from '../brokerage/brokerage.service.js';
import { ERPService } from '../../shared/services/erp.service.js';

/**
 * Notification Tools
 * Stakeholder communication and ERP synchronization.
 * Uses ERPService for live shipment lookups (replaces MOCK_SHIPMENTS).
 */

const ComposeStakeholderUpdateSchema = z.object({
  threatId: z.string().describe('Threat ID'),
  shipmentId: z.string().describe('Affected shipment ID'),
  recipientEmail: z.string().email().describe('Recipient email address'),
  includeReroute: z.boolean().optional().describe('Include reroute options in notification'),
});

const ApproveAndDispatchSchema = z.object({
  planId: z.string().describe('Contingency plan ID'),
  optionId: z.string().describe('Reroute option ID'),
  approvedBy: z.string().describe('User approving'),
  shipmentId: z.string().optional().describe('Shipment ID for ERP update'),
  notifyRecipients: z.array(z.string().email()).optional().describe('Emails to notify'),
});

function notificationWidget(route: string) {
  return { route, prefersBorder: true, csp: { resourceDomains: ['https://images.unsplash.com'] } };
}

@Injectable({ deps: [NotificationService, SentinelService, ImpactService, BrokerageService, ERPService] })
export class NotificationTools {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly sentinelService: SentinelService,
    private readonly impactService: ImpactService,
    private readonly brokerageService: BrokerageService,
    private readonly erpService: ERPService,
  ) {}

  @Tool({
    name: 'compose_stakeholder_update',
    description:
      'Dynamically compose and send transparent status updates to enterprise clients or internal management. ' +
      'Includes threat details, impact forecast, and optional reroute recommendations.',
    inputSchema: ComposeStakeholderUpdateSchema,
    examples: {
      request: {
        threatId: 'threat-001', shipmentId: 'ship-001',
        recipientEmail: 'supply-chain@company.com', includeReroute: true,
      },
      response: {
        notifications: [{
          id: 'notif-threat-threat-001-1234567890', type: 'threat_alert', channel: 'email',
          recipientEmail: 'supply-chain@company.com',
          subject: '🚨 SUPPLY CHAIN ALERT: Typhoon Approaching Port of Shanghai',
          body: 'A HIGH threat has been detected...', sent: true,
          sentAt: '2024-01-30T12:00:00Z', deliveryStatus: 'sent',
        }],
        erpPayloads: [{
          id: 'erp-status-ship-001-1234567890', type: 'shipment_status', shipmentId: 'ship-001',
          shipmentStatusUpdate: {
            shipmentId: 'ship-001', newStatus: 'delayed',
            estimatedArrival: '2024-02-20T00:00:00Z',
            delayReason: 'Typhoon Approaching Port of Shanghai',
          },
          sentToErp: true, sentAt: '2024-01-30T12:00:00Z', erpReference: 'ERP-REF-12345',
        }],
        summary: { notificationsSent: 2, erpUpdatesSent: 1, timestamp: '2024-01-30T12:00:00Z' },
      },
    },
  })
  @Widget(notificationWidget('stakeholder-comms'))
  async composeStakeholderUpdate(
    args: z.infer<typeof ComposeStakeholderUpdateSchema>,
    ctx: ExecutionContext,
  ) {
    // Fetch threat and shipment concurrently via live services
    const [threat, shipment] = await Promise.all([
      this.sentinelService.getThreatById(args.threatId),
      this.erpService.getShipmentById(args.shipmentId),
    ]);

    if (!threat)    throw new Error(`Threat not found: ${args.threatId}`);
    if (!shipment)  throw new Error(`Shipment not found: ${args.shipmentId}`);

    const impact = await this.impactService.analyzeSupplyChainImpact(threat);
    const notifications = [];
    const erpPayloads   = [];

    // Threat alert email
    const threatAlert = this.notificationService.composeThreatAlert(threat, args.recipientEmail);
    notifications.push(this.notificationService.markNotificationSent(threatAlert));

    // Impact forecast email
    const impactForecast = this.notificationService.composeImpactForecast(impact, threat, args.recipientEmail);
    notifications.push(this.notificationService.markNotificationSent(impactForecast));

    // Optional reroute proposal
    if (args.includeReroute) {
      const plan = await this.brokerageService.generateContingencyPlan(shipment, threat, impact);
      const rerouteNotif = this.notificationService.composeRerouteProposal(plan, args.recipientEmail);
      notifications.push(this.notificationService.markNotificationSent(rerouteNotif));
    }

    // ERP status update
    const statusUpdate = this.notificationService.composeShipmentStatusUpdate(
      shipment, 'delayed', threat.title,
    );
    erpPayloads.push(this.notificationService.markErpPayloadSent(statusUpdate, `ERP-${Date.now()}`));

    // ERP SLA alert
    const slaAlert = this.notificationService.composeSlaAlert(shipment, 'customer-001', 'high');
    erpPayloads.push(this.notificationService.markErpPayloadSent(slaAlert, `ERP-${Date.now()}`));

    ctx.logger.info('Composed stakeholder update', {
      threatId: args.threatId,
      shipmentId: args.shipmentId,
      notificationsSent: notifications.length,
      erpUpdatesSent: erpPayloads.length,
    });

    return {
      notifications,
      erpPayloads,
      summary: {
        notificationsSent: notifications.length,
        erpUpdatesSent: erpPayloads.length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Tool({
    name: 'approve_and_dispatch',
    description:
      'Approve a contingency reroute plan and dispatch notifications to all stakeholders. ' +
      'Updates ERP systems and sends confirmation emails.',
    inputSchema: ApproveAndDispatchSchema,
    examples: {
      request: {
        planId: 'plan-ship-001-threat-001', optionId: 'reroute-air-ship-001',
        approvedBy: 'manager@company.com', shipmentId: 'ship-001',
        notifyRecipients: ['supply-chain@company.com', 'customer@client.com'],
      },
      response: {
        approval: {
          planId: 'plan-ship-001-threat-001', optionId: 'reroute-air-ship-001',
          status: 'approved', approvedBy: 'manager@company.com',
          approvedAt: '2024-01-30T12:30:00Z',
        },
        notifications: [{
          id: 'notif-reroute-approved-1234567890', type: 'reroute_approved', channel: 'email',
          recipientEmail: 'supply-chain@company.com',
          subject: '✅ REROUTE APPROVED: Shipment ship-001 rerouted via air',
          body: 'Your contingency reroute has been approved and is being executed...',
          sent: true, sentAt: '2024-01-30T12:30:00Z', deliveryStatus: 'sent',
        }],
        erpPayloads: [{
          id: 'erp-reroute-ship-001-1234567890', type: 'shipment_status', shipmentId: 'ship-001',
          shipmentStatusUpdate: {
            shipmentId: 'ship-001', newStatus: 'rerouted',
            estimatedArrival: '2024-02-02T12:00:00Z', delayReason: 'Rerouted via air freight',
          },
          sentToErp: true, sentAt: '2024-01-30T12:30:00Z', erpReference: 'ERP-REROUTE-12345',
        }],
      },
    },
  })
  async approveAndDispatch(args: z.infer<typeof ApproveAndDispatchSchema>, ctx: ExecutionContext) {
    const approval = {
      planId: args.planId, optionId: args.optionId,
      status: 'approved', approvedBy: args.approvedBy,
      approvedAt: new Date().toISOString(),
    };

    const notifications = [];
    const erpPayloads   = [];

    // Resolve shipment for ERP update (use provided ID or fall back to ship-001)
    const shipmentId = args.shipmentId ?? 'ship-001';
    const shipment = await this.erpService.getShipmentById(shipmentId);

    // Dispatch approval emails
    if (args.notifyRecipients) {
      for (const email of args.notifyRecipients) {
        notifications.push({
          id: `notif-reroute-approved-${Date.now()}`,
          type: 'reroute_approved' as const,
          channel: 'email' as const,
          recipientEmail: email,
          subject: `✅ REROUTE APPROVED: Shipment ${shipmentId} rerouted`,
          body: `Your contingency reroute (Plan: ${args.planId}, Option: ${args.optionId}) has been approved by ${args.approvedBy} and is being executed.`,
          sent: true,
          sentAt: new Date().toISOString(),
          deliveryStatus: 'sent' as const,
        });
      }
    }

    // ERP reroute status update
    const erpRef = `ERP-REROUTE-${Date.now()}`;
    erpPayloads.push({
      id: `erp-reroute-${shipmentId}-${Date.now()}`,
      type: 'shipment_status' as const,
      shipmentId,
      shipmentStatusUpdate: {
        shipmentId,
        newStatus: 'rerouted',
        estimatedArrival: new Date(Date.now() + 3 * 86400_000).toISOString(),
        delayReason: 'Approved reroute via contingency plan',
      },
      sentToErp: true,
      sentAt: new Date().toISOString(),
      erpReference: erpRef,
    });

    // Update ERP shipment status to rerouted
    if (shipment) {
      await this.erpService.updateShipmentStatus(shipmentId, 'rerouted' as never);
    }

    ctx.logger.info('Approved and dispatched reroute', {
      planId: args.planId, optionId: args.optionId,
      approvedBy: args.approvedBy, notificationsSent: notifications.length,
    });

    return { approval, notifications, erpPayloads };
  }
}
