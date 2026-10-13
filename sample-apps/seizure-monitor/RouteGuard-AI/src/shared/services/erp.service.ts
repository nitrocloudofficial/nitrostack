import { Injectable } from '@nitrostack/core';
import { Shipment, ShipmentStatus } from '../domain/shipment.js';
import { MOCK_SHIPMENTS } from '../fixtures/shipments.fixture.js';

/**
 * ERP Shipment Service
 * Abstracts shipment data access (mock now, real DB later)
 */
@Injectable()
export class ERPService {
  private shipments: Shipment[] = MOCK_SHIPMENTS;

  /**
   * Get all shipments
   */
  async getAllShipments(): Promise<Shipment[]> {
    return this.shipments;
  }

  /**
   * Get shipment by ID
   */
  async getShipmentById(id: string): Promise<Shipment | null> {
    return this.shipments.find((s) => s.id === id) || null;
  }

  /**
   * Get shipments by status
   */
  async getShipmentsByStatus(status: ShipmentStatus): Promise<Shipment[]> {
    return this.shipments.filter((s) => s.status === status);
  }

  /**
   * Get shipments by origin port
   */
  async getShipmentsByOrigin(origin: string): Promise<Shipment[]> {
    return this.shipments.filter((s) => s.origin.port.toLowerCase().includes(origin.toLowerCase()));
  }

  /**
   * Get shipments by destination port
   */
  async getShipmentsByDestination(destination: string): Promise<Shipment[]> {
    return this.shipments.filter((s) =>
      s.destination.port.toLowerCase().includes(destination.toLowerCase())
    );
  }

  /**
   * Get shipments by carrier
   */
  async getShipmentsByCarrier(carrier: string): Promise<Shipment[]> {
    return this.shipments.filter((s) => s.carrier.toLowerCase().includes(carrier.toLowerCase()));
  }

  /**
   * Get high-value shipments (>$50k)
   */
  async getHighValueShipments(): Promise<Shipment[]> {
    return this.shipments.filter((s) => s.totalValue > 50000);
  }

  /**
   * Get shipments in a geographic region
   */
  async getShipmentsInRegion(region: 'asia' | 'europe' | 'americas' | 'africa'): Promise<Shipment[]> {
    const regionMap: Record<string, string[]> = {
      asia: ['shanghai', 'singapore', 'hong kong', 'busan', 'bangkok'],
      europe: ['rotterdam', 'hamburg', 'antwerp', 'bremerhaven', 'felixstowe'],
      americas: ['los angeles', 'long beach', 'new york', 'houston', 'savannah'],
      africa: ['port said', 'durban', 'casablanca', 'alexandria'],
    };

    const ports = regionMap[region] || [];
    return this.shipments.filter(
      (s) =>
        ports.some((p) => s.origin.port.toLowerCase().includes(p)) ||
        ports.some((p) => s.destination.port.toLowerCase().includes(p))
    );
  }

  /**
   * Update shipment status
   */
  async updateShipmentStatus(id: string, status: ShipmentStatus): Promise<Shipment | null> {
    const shipment = this.shipments.find((s) => s.id === id);
    if (!shipment) return null;

    shipment.status = status;
    return shipment;
  }

  /**
   * Add a new shipment
   */
  async createShipment(shipment: Omit<Shipment, 'id' | 'lastUpdate'>): Promise<Shipment> {
    const newShipment: Shipment = {
      ...shipment,
      id: `ship-${Date.now()}`,
      lastUpdate: new Date().toISOString(),
    };
    this.shipments.push(newShipment);
    return newShipment;
  }

  /**
   * Get shipments affected by a threat (by geographic proximity)
   */
  async getShipmentsAffectedByThreat(threatOrigin: string): Promise<Shipment[]> {
    // Simple geographic matching - in production, use actual geo-distance calculation
    return this.shipments.filter(
      (s) =>
        s.origin.port.toLowerCase().includes(threatOrigin.toLowerCase()) ||
        s.destination.port.toLowerCase().includes(threatOrigin.toLowerCase())
    );
  }

  /**
   * Get shipments by estimated delivery window
   */
  async getShipmentsByDeliveryWindow(startDate: Date, endDate: Date): Promise<Shipment[]> {
    return this.shipments.filter((s) => {
      const eta = new Date(s.estimatedArrival);
      return eta >= startDate && eta <= endDate;
    });
  }

  /**
   * Calculate total value of shipments
   */
  async getTotalShipmentValue(): Promise<number> {
    return this.shipments.reduce((sum, s) => sum + s.totalValue, 0);
  }

  /**
   * Get shipment statistics
   */
  async getShipmentStats(): Promise<{
    total: number;
    inTransit: number;
    delivered: number;
    delayed: number;
    atPort: number;
    totalValue: number;
    averageValue: number;
  }> {
    const stats = {
      total: this.shipments.length,
      inTransit: this.shipments.filter((s) => s.status === ShipmentStatus.IN_TRANSIT).length,
      delivered: this.shipments.filter((s) => s.status === ShipmentStatus.DELIVERED).length,
      delayed: this.shipments.filter((s) => s.status === ShipmentStatus.DELAYED).length,
      atPort: this.shipments.filter((s) => s.status === ShipmentStatus.AT_PORT).length,
      totalValue: this.shipments.reduce((sum, s) => sum + s.totalValue, 0),
      averageValue: 0,
    };
    stats.averageValue = stats.totalValue / stats.total;
    return stats;
  }
}
