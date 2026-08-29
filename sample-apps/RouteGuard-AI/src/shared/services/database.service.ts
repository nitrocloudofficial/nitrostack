import { Injectable, ConfigService } from '@nitrostack/core';
import { z } from 'zod';

/**
 * Database Service
 * Abstracts PostgreSQL operations (mock implementation for now)
 * In production, replace with actual pg or prisma client
 */

export interface DBThreat {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  region?: string;
  port?: string;
  affectedRoutes: string[];
  estimatedImpactStart: string;
  estimatedImpactEnd?: string;
  source: string;
  confidence: number;
  detectedAt: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DBShipment {
  id: string;
  poNumber: string;
  status: string;
  transportMode: string;
  originPort: string;
  originLat: number;
  originLng: number;
  originCountry: string;
  destinationPort: string;
  destinationLat: number;
  destinationLng: number;
  destinationCountry: string;
  carrier: string;
  vesselName?: string;
  estimatedDeparture: string;
  estimatedArrival: string;
  actualDeparture?: string;
  actualArrival?: string;
  totalValue: number;
  weight: number;
  containerCount: number;
  lastUpdate: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBImpact {
  id: string;
  threatId: string;
  shipmentId: string;
  affectedSkus: number;
  financialExposure: number;
  estimatedDelay: number;
  slaBreachRisk: number;
  vulnerabilityScore: number;
  mitigation: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBNotification {
  id: string;
  threatId: string;
  shipmentId?: string;
  recipientEmail: string;
  channel: string;
  status: string;
  subject: string;
  body: string;
  payload: Record<string, unknown>;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  changes: Record<string, unknown>;
  timestamp: string;
}

@Injectable({ deps: [ConfigService] })
export class DatabaseService {
  private dbUrl: string;
  private connected = false;

  // In-memory mock storage
  private threats: Map<string, DBThreat> = new Map();
  private shipments: Map<string, DBShipment> = new Map();
  private impacts: Map<string, DBImpact> = new Map();
  private notifications: Map<string, DBNotification> = new Map();
  private auditLogs: DBAuditLog[] = [];

  constructor(private config: ConfigService) {
    this.dbUrl = this.config.get('DATABASE_URL') || 'postgresql://localhost/supply-chain';
  }

  /**
   * Initialize database connection
   */
  async connect(): Promise<void> {
    try {
      // In production, connect to actual PostgreSQL
      // const client = new pg.Client(this.dbUrl);
      // await client.connect();
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    this.connected = false;
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  // ============ THREATS ============

  async createThreat(threat: Omit<DBThreat, 'id' | 'createdAt' | 'updatedAt'>): Promise<DBThreat> {
    const id = `threat-${Date.now()}`;
    const now = new Date().toISOString();
    const dbThreat: DBThreat = {
      ...threat,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.threats.set(id, dbThreat);
    this.logAudit('CREATE', 'threat', id, { threat: dbThreat });
    return dbThreat;
  }

  async getThreatById(id: string): Promise<DBThreat | null> {
    return this.threats.get(id) || null;
  }

  async getAllThreats(): Promise<DBThreat[]> {
    return Array.from(this.threats.values());
  }

  async getThreatsBySeverity(severity: string): Promise<DBThreat[]> {
    return Array.from(this.threats.values()).filter((t) => t.severity === severity);
  }

  async updateThreat(id: string, updates: Partial<DBThreat>): Promise<DBThreat | null> {
    const threat = this.threats.get(id);
    if (!threat) return null;

    const updated = { ...threat, ...updates, updatedAt: new Date().toISOString() };
    this.threats.set(id, updated);
    this.logAudit('UPDATE', 'threat', id, { changes: updates });
    return updated;
  }

  async deleteThreat(id: string): Promise<boolean> {
    const deleted = this.threats.delete(id);
    if (deleted) {
      this.logAudit('DELETE', 'threat', id, {});
    }
    return deleted;
  }

  // ============ SHIPMENTS ============

  async createShipment(shipment: Omit<DBShipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<DBShipment> {
    const id = `ship-${Date.now()}`;
    const now = new Date().toISOString();
    const dbShipment: DBShipment = {
      ...shipment,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.shipments.set(id, dbShipment);
    this.logAudit('CREATE', 'shipment', id, { shipment: dbShipment });
    return dbShipment;
  }

  async getShipmentById(id: string): Promise<DBShipment | null> {
    return this.shipments.get(id) || null;
  }

  async getAllShipments(): Promise<DBShipment[]> {
    return Array.from(this.shipments.values());
  }

  async getShipmentsByStatus(status: string): Promise<DBShipment[]> {
    return Array.from(this.shipments.values()).filter((s) => s.status === status);
  }

  async updateShipment(id: string, updates: Partial<DBShipment>): Promise<DBShipment | null> {
    const shipment = this.shipments.get(id);
    if (!shipment) return null;

    const updated = { ...shipment, ...updates, updatedAt: new Date().toISOString() };
    this.shipments.set(id, updated);
    this.logAudit('UPDATE', 'shipment', id, { changes: updates });
    return updated;
  }

  async deleteShipment(id: string): Promise<boolean> {
    const deleted = this.shipments.delete(id);
    if (deleted) {
      this.logAudit('DELETE', 'shipment', id, {});
    }
    return deleted;
  }

  // ============ IMPACTS ============

  async createImpact(impact: Omit<DBImpact, 'id' | 'createdAt' | 'updatedAt'>): Promise<DBImpact> {
    const id = `impact-${Date.now()}`;
    const now = new Date().toISOString();
    const dbImpact: DBImpact = {
      ...impact,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.impacts.set(id, dbImpact);
    this.logAudit('CREATE', 'impact', id, { impact: dbImpact });
    return dbImpact;
  }

  async getImpactById(id: string): Promise<DBImpact | null> {
    return this.impacts.get(id) || null;
  }

  async getImpactsByThreat(threatId: string): Promise<DBImpact[]> {
    return Array.from(this.impacts.values()).filter((i) => i.threatId === threatId);
  }

  async getImpactsByShipment(shipmentId: string): Promise<DBImpact[]> {
    return Array.from(this.impacts.values()).filter((i) => i.shipmentId === shipmentId);
  }

  async updateImpact(id: string, updates: Partial<DBImpact>): Promise<DBImpact | null> {
    const impact = this.impacts.get(id);
    if (!impact) return null;

    const updated = { ...impact, ...updates, updatedAt: new Date().toISOString() };
    this.impacts.set(id, updated);
    this.logAudit('UPDATE', 'impact', id, { changes: updates });
    return updated;
  }

  // ============ NOTIFICATIONS ============

  async createNotification(
    notification: Omit<DBNotification, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DBNotification> {
    const id = `notif-${Date.now()}`;
    const now = new Date().toISOString();
    const dbNotification: DBNotification = {
      ...notification,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.notifications.set(id, dbNotification);
    this.logAudit('CREATE', 'notification', id, { notification: dbNotification });
    return dbNotification;
  }

  async getNotificationById(id: string): Promise<DBNotification | null> {
    return this.notifications.get(id) || null;
  }

  async getNotificationsByRecipient(email: string): Promise<DBNotification[]> {
    return Array.from(this.notifications.values()).filter((n) => n.recipientEmail === email);
  }

  async getNotificationsByThreat(threatId: string): Promise<DBNotification[]> {
    return Array.from(this.notifications.values()).filter((n) => n.threatId === threatId);
  }

  async updateNotification(id: string, updates: Partial<DBNotification>): Promise<DBNotification | null> {
    const notification = this.notifications.get(id);
    if (!notification) return null;

    const updated = { ...notification, ...updates, updatedAt: new Date().toISOString() };
    this.notifications.set(id, updated);
    this.logAudit('UPDATE', 'notification', id, { changes: updates });
    return updated;
  }

  // ============ AUDIT LOGS ============

  private logAudit(action: string, entityType: string, entityId: string, changes: Record<string, unknown>): void {
    const log: DBAuditLog = {
      id: `audit-${Date.now()}`,
      action,
      entityType,
      entityId,
      changes,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.push(log);
  }

  async getAuditLogs(limit = 100): Promise<DBAuditLog[]> {
    return this.auditLogs.slice(-limit);
  }

  async getAuditLogsByEntity(entityType: string, entityId: string): Promise<DBAuditLog[]> {
    return this.auditLogs.filter((log) => log.entityType === entityType && log.entityId === entityId);
  }

  // ============ STATISTICS ============

  async getStatistics(): Promise<{
    threats: number;
    shipments: number;
    impacts: number;
    notifications: number;
    auditLogs: number;
  }> {
    return {
      threats: this.threats.size,
      shipments: this.shipments.size,
      impacts: this.impacts.size,
      notifications: this.notifications.size,
      auditLogs: this.auditLogs.length,
    };
  }
}
