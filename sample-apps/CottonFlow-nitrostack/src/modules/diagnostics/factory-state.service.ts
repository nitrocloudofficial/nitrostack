import { Injectable } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Machine {
  id: string;
  name: string;
  type: string;
  lineId: string;
  status: string;
  vibration: number;
  vibrationTrend: string;
  temperature: number;
  rpm: number;
  predictedFailureWindow: number | null;
  lastMaintenanceDate: string;
  imageUrl: string;
}

interface Line {
  id: string;
  name: string;
  zone: string;
  status: string;
  currentBatchId: string;
  yarnBreakageRate: number;
  yarnBreakageTrend: string;
  imageUrl: string;
}

interface Order {
  id: string;
  customerName: string;
  priority: string;
  status: string;
  lineId: string | null;
  batchId: string | null;
  quantity: number;
  unit: string;
  dueDate: string;
  currentEta: string;
  imageUrl: string;
}

interface SparePart {
  id: string;
  name: string;
  type: string;
  machineType: string;
  quantity: number;
  reorderLevel: number;
  leadTime: number;
  imageUrl: string;
}

interface Zone {
  id: string;
  name: string;
  targetHumidity: number;
  currentHumidity: number;
  humidityTrend: string;
}

interface FactoryState {
  machines: Machine[];
  lines: Line[];
  orders: Order[];
  spareParts: SparePart[];
  zones: Zone[];
}

/**
 * Factory State Service
 * 
 * Manages in-memory factory state loaded from fixtures/factory-state.json.
 * Provides methods to query and update machine health, production status,
 * environmental conditions, orders, and spare parts inventory.
 */
@Injectable()
export class FactoryStateService {
  private state: FactoryState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): FactoryState {
    try {
      // Load from fixtures directory at project root
      const fixturesPath = path.join(__dirname, '../../..', 'fixtures', 'factory-state.json');
      const data = fs.readFileSync(fixturesPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to load factory state: ${error}`);
    }
  }

  /**
   * Get machine health data by ID
   */
  getMachineHealth(machineId: string): Machine | null {
    return this.state.machines.find(m => m.id === machineId) || null;
  }

  /**
   * Get all machines
   */
  getAllMachines(): Machine[] {
    return this.state.machines;
  }

  /**
   * Get production status for a line
   */
  getLineProduction(lineId: string): Line | null {
    return this.state.lines.find(l => l.id === lineId) || null;
  }

  /**
   * Get all lines
   */
  getAllLines(): Line[] {
    return this.state.lines;
  }

  /**
   * Get zone environmental data
   */
  getZoneEnvironment(zoneId: string): Zone | null {
    return this.state.zones.find(z => z.id === zoneId) || null;
  }

  /**
   * Get all zones
   */
  getAllZones(): Zone[] {
    return this.state.zones;
  }

  /**
   * Get active orders
   */
  getActiveOrders(): Order[] {
    return this.state.orders.filter(o => o.status === 'in-progress' || o.status === 'queued');
  }

  /**
   * Get order by ID
   */
  getOrder(orderId: string): Order | null {
    return this.state.orders.find(o => o.id === orderId) || null;
  }

  /**
   * Get spare part by ID
   */
  getSparePart(partId: string): SparePart | null {
    return this.state.spareParts.find(p => p.id === partId) || null;
  }

  /**
   * Get all spare parts
   */
  getAllSpareParts(): SparePart[] {
    return this.state.spareParts;
  }

  /**
   * Update machine vibration (simulates trending)
   */
  updateMachineVibration(machineId: string, newVibration: number, trend: string): void {
    const machine = this.state.machines.find(m => m.id === machineId);
    if (machine) {
      machine.vibration = newVibration;
      machine.vibrationTrend = trend;
      // Predict failure window based on vibration
      if (newVibration > 7) {
        machine.predictedFailureWindow = Math.max(15, 120 - (newVibration * 10));
      }
    }
  }

  /**
   * Update zone humidity
   */
  updateZoneHumidity(zoneId: string, newHumidity: number): void {
    const zone = this.state.zones.find(z => z.id === zoneId);
    if (zone) {
      const oldHumidity = zone.currentHumidity;
      zone.currentHumidity = newHumidity;
      zone.humidityTrend = newHumidity > oldHumidity ? 'rising' : newHumidity < oldHumidity ? 'falling' : 'stable';
    }
  }

  /**
   * Update line yarn breakage rate
   */
  updateLineBreakageRate(lineId: string, newRate: number): void {
    const line = this.state.lines.find(l => l.id === lineId);
    if (line) {
      const oldRate = line.yarnBreakageRate;
      line.yarnBreakageRate = newRate;
      line.yarnBreakageTrend = newRate > oldRate ? 'rising' : newRate < oldRate ? 'falling' : 'stable';
    }
  }

  /**
   * Reassign production batch from one line to another
   */
  reassignBatch(fromLineId: string, toLineId: string, batchId: string): boolean {
    const fromLine = this.state.lines.find(l => l.id === fromLineId);
    const toLine = this.state.lines.find(l => l.id === toLineId);
    const order = this.state.orders.find(o => o.batchId === batchId);

    if (!fromLine || !toLine || !order) {
      return false;
    }

    // Move batch to new line
    fromLine.currentBatchId = '';
    toLine.currentBatchId = batchId;
    order.lineId = toLineId;

    return true;
  }

  /**
   * Update order ETA
   */
  updateOrderEta(orderId: string, newEta: string): boolean {
    const order = this.state.orders.find(o => o.id === orderId);
    if (order) {
      order.currentEta = newEta;
      return true;
    }
    return false;
  }

  /**
   * Update spare part quantity
   */
  updateSparePartQuantity(partId: string, quantity: number): boolean {
    const part = this.state.spareParts.find(p => p.id === partId);
    if (part) {
      part.quantity = quantity;
      return true;
    }
    return false;
  }

  /**
   * Create a new production line
   */
  createLine(line: Line): void {
    this.state.lines.push(line);
  }

  /**
   * Get the full factory state (for resources)
   */
  getFullState(): FactoryState {
    return this.state;
  }
}
