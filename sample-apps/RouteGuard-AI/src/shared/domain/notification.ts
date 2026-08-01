import { z } from 'zod';

/**
 * Notification & Stakeholder Sync Domain Types
 * Tracks communications and ERP updates
 */

export enum NotificationType {
  THREAT_ALERT = 'threat_alert',
  IMPACT_FORECAST = 'impact_forecast',
  REROUTE_PROPOSAL = 'reroute_proposal',
  REROUTE_APPROVED = 'reroute_approved',
  SHIPMENT_DELAYED = 'shipment_delayed',
  SHIPMENT_RECOVERED = 'shipment_recovered',
  SLA_BREACH_WARNING = 'sla_breach_warning',
  INVENTORY_ADJUSTMENT = 'inventory_adjustment',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  SMS = 'sms',
  DASHBOARD = 'dashboard',
  ERP_API = 'erp_api',
}

export const NotificationSchema = z.object({
  id: z.string().describe('Notification ID'),
  type: z.nativeEnum(NotificationType).describe('Notification category'),
  channel: z.nativeEnum(NotificationChannel).describe('Delivery method'),
  recipientId: z.string().describe('User/system receiving notification'),
  recipientEmail: z.string().email().optional(),
  recipientSlackId: z.string().optional(),
  subject: z.string().describe('Email subject or title'),
  body: z.string().describe('Message body'),
  htmlBody: z.string().optional().describe('HTML-formatted message'),
  metadata: z.record(z.any()).optional().describe('Context data (shipmentId, threatId, etc.)'),
  sent: z.boolean().describe('Was notification sent?'),
  sentAt: z.string().datetime().optional(),
  deliveryStatus: z.enum(['pending', 'sent', 'failed', 'bounced']).describe('Delivery status'),
  createdAt: z.string().datetime(),
});

export type Notification = z.infer<typeof NotificationSchema>;

/**
 * ERP Payload
 * Structured update to send to ERP system
 */
export const ErpPayloadSchema = z.object({
  id: z.string().describe('Payload ID'),
  type: z.enum(['inventory_adjustment', 'shipment_status', 'forecast_update', 'sla_alert']).describe('Update type'),
  shipmentId: z.string().optional(),
  skuUpdates: z.array(z.object({
    sku: z.string(),
    quantityAdjustment: z.number().optional(),
    warehouseId: z.string().optional(),
    reason: z.string().optional(),
  })).optional().describe('Inventory changes'),
  shipmentStatusUpdate: z.object({
    shipmentId: z.string(),
    newStatus: z.string(),
    estimatedArrival: z.string().datetime().optional(),
    delayReason: z.string().optional(),
  }).optional().describe('Shipment status change'),
  forecastAdjustment: z.object({
    sku: z.string(),
    originalDate: z.string().datetime(),
    revisedDate: z.string().datetime(),
    reason: z.string(),
  }).optional().describe('Delivery forecast change'),
  slaAlert: z.object({
    shipmentId: z.string(),
    customerId: z.string(),
    riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
    message: z.string(),
  }).optional().describe('SLA breach warning'),
  createdAt: z.string().datetime(),
  sentToErp: z.boolean().describe('Was payload sent?'),
  sentAt: z.string().datetime().optional(),
  erpReference: z.string().optional().describe('ERP transaction ID'),
});

export type ErpPayload = z.infer<typeof ErpPayloadSchema>;

/**
 * Stakeholder Comms Resource
 * Aggregated view of all notifications and ERP syncs
 */
export const StakeholderCommsSchema = z.object({
  id: z.string(),
  notifications: z.array(NotificationSchema),
  erpPayloads: z.array(ErpPayloadSchema),
  totalNotificationsSent: z.number(),
  totalErpUpdates: z.number(),
  lastUpdated: z.string().datetime(),
});

export type StakeholderComms = z.infer<typeof StakeholderCommsSchema>;
