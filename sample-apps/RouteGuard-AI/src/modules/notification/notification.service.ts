import { Injectable } from '@nitrostack/core';
import { Notification, NotificationType, NotificationChannel, ErpPayload } from '../../shared/domain/notification.js';
import { Shipment } from '../../shared/domain/shipment.js';
import { Threat } from '../../shared/domain/threat.js';
import { Impact } from '../../shared/domain/impact.js';
import { ContingencyPlan } from '../../shared/domain/reroute.js';

/**
 * Notification Service
 * Manages stakeholder communications and ERP synchronization
 */

@Injectable()
export class NotificationService {
  /**
   * Compose threat alert notification
   */
  composeThreatAlert(threat: Threat, recipientEmail: string): Notification {
    const subject = `🚨 SUPPLY CHAIN ALERT: ${threat.title}`;
    const body = `
A ${threat.severity.toUpperCase()} threat has been detected:

${threat.title}
${threat.description}

Location: ${threat.location.region || threat.location.port}
Affected Routes: ${threat.affectedRoutes.join(', ')}
Impact Window: ${new Date(threat.estimatedImpactStart).toLocaleString()} - ${threat.estimatedImpactEnd ? new Date(threat.estimatedImpactEnd).toLocaleString() : 'TBD'}
Confidence: ${(threat.confidence * 100).toFixed(0)}%

Source: ${threat.source}
Detected: ${new Date(threat.detectedAt).toLocaleString()}
    `.trim();

    return {
      id: `notif-threat-${threat.id}-${Date.now()}`,
      type: NotificationType.THREAT_ALERT,
      channel: NotificationChannel.EMAIL,
      recipientId: recipientEmail,
      recipientEmail,
      subject,
      body,
      metadata: { threatId: threat.id, severity: threat.severity },
      sent: false,
      deliveryStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Compose impact forecast notification
   */
  composeImpactForecast(impact: Impact, threat: Threat, recipientEmail: string): Notification {
    const subject = `📊 IMPACT FORECAST: ${impact.affectedShipments.length} shipments at risk`;
    const body = `
Impact Analysis for: ${threat.title}

Affected Shipments: ${impact.affectedShipments.length}
Total Financial Exposure: $${impact.totalFinancialExposure.toFixed(2)}
Total Delay: ${(impact.totalDelayHours / 24).toFixed(1)} days
Customers Impacted: ${impact.customerCount}
SLA Breach Risk: ${(impact.slaBreachRisk * 100).toFixed(0)}%

Top Affected Shipments:
${impact.affectedShipments
  .slice(0, 3)
  .map(
    s =>
      `- ${s.shipmentId}: ${s.delayDays} day delay, $${s.financialExposure.toFixed(2)} exposure`
  )
  .join('\n')}

Calculated: ${new Date(impact.calculatedAt).toLocaleString()}
    `.trim();

    return {
      id: `notif-impact-${impact.id}-${Date.now()}`,
      type: NotificationType.IMPACT_FORECAST,
      channel: NotificationChannel.EMAIL,
      recipientId: recipientEmail,
      recipientEmail,
      subject,
      body,
      metadata: { impactId: impact.id, threatId: impact.threatId },
      sent: false,
      deliveryStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Compose reroute proposal notification
   */
  composeRerouteProposal(plan: ContingencyPlan, recipientEmail: string): Notification {
    const recommendation = plan.recommendation;
    const subject = `✈️ CONTINGENCY PLAN: ${plan.options.length} reroute options available`;
    const body = `
Contingency Plan for Shipment: ${plan.shipmentId}

Available Reroute Options: ${plan.options.length}

Recommended Option:
${recommendation.rationale}
Expected Outcome: ${recommendation.expectedOutcome}

${plan.options
  .slice(0, 3)
  .map(
    (opt, i) =>
      `
Option ${i + 1}: ${opt.carrier} via ${opt.transportMode}
- Delay Reduction: ${(opt.delayReduction / 24).toFixed(1)} days
- Additional Cost: $${opt.additionalCost.toFixed(2)}
- Carrier Reliability: ${(opt.carrierReliability * 100).toFixed(0)}%
- Valid Until: ${new Date(opt.validUntil).toLocaleString()}
    `
  )
  .join('\n')}

Approval Required: ${plan.approvalRequired ? 'YES' : 'NO'}
Plan Expires: ${new Date(plan.expiresAt).toLocaleString()}
    `.trim();

    return {
      id: `notif-reroute-${plan.id}-${Date.now()}`,
      type: NotificationType.REROUTE_PROPOSAL,
      channel: NotificationChannel.EMAIL,
      recipientId: recipientEmail,
      recipientEmail,
      subject,
      body,
      metadata: { planId: plan.id, shipmentId: plan.shipmentId },
      sent: false,
      deliveryStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Compose ERP inventory adjustment payload
   */
  composeInventoryAdjustment(shipment: Shipment, delayDays: number): ErpPayload {
    return {
      id: `erp-inv-${shipment.id}-${Date.now()}`,
      type: 'inventory_adjustment',
      shipmentId: shipment.id,
      skuUpdates: shipment.skus.map(item => ({
        sku: item.sku,
        reason: `Shipment ${shipment.id} delayed by ${delayDays} days due to supply chain disruption`,
      })),
      createdAt: new Date().toISOString(),
      sentToErp: false,
    };
  }

  /**
   * Compose ERP shipment status update
   */
  composeShipmentStatusUpdate(shipment: Shipment, newStatus: string, delayReason?: string): ErpPayload {
    return {
      id: `erp-status-${shipment.id}-${Date.now()}`,
      type: 'shipment_status',
      shipmentStatusUpdate: {
        shipmentId: shipment.id,
        newStatus,
        estimatedArrival: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        delayReason,
      },
      createdAt: new Date().toISOString(),
      sentToErp: false,
    };
  }

  /**
   * Compose SLA breach warning
   */
  composeSlaAlert(shipment: Shipment, customerId: string, riskLevel: 'low' | 'medium' | 'high' | 'critical'): ErpPayload {
    return {
      id: `erp-sla-${shipment.id}-${Date.now()}`,
      type: 'sla_alert',
      slaAlert: {
        shipmentId: shipment.id,
        customerId,
        riskLevel,
        message: `SLA breach risk for shipment ${shipment.id}: ${riskLevel} risk level`,
      },
      createdAt: new Date().toISOString(),
      sentToErp: false,
    };
  }

  /**
   * Mark notification as sent
   */
  markNotificationSent(notification: Notification): Notification {
    return {
      ...notification,
      sent: true,
      sentAt: new Date().toISOString(),
      deliveryStatus: 'sent',
    };
  }

  /**
   * Mark ERP payload as sent
   */
  markErpPayloadSent(payload: ErpPayload, erpReference: string): ErpPayload {
    return {
      ...payload,
      sentToErp: true,
      sentAt: new Date().toISOString(),
      erpReference,
    };
  }
}
