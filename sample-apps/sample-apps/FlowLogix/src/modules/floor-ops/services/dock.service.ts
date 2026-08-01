import { Injectable } from '@nitrostack/core';

// ─────────────────────────────────────────────
// Mock Data Stores
// ─────────────────────────────────────────────

interface DockDoor {
  doorId: string;
  label: string;
  zone: 'A' | 'B' | 'C' | 'OVERFLOW';
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  assignedTruckId: string | null;
  scheduledArrival: string | null; // ISO timestamp
  scheduledDeparture: string | null;
}

interface TruckSchedule {
  truckId: string;
  vendorName: string;
  licensePlate: string;
  doorId: string;
  scheduledArrival: string; // ISO
  poId: string;
  status: 'ON_TIME' | 'DELAYED' | 'ARRIVED' | 'DEPARTED';
  delayMinutes: number;
}

interface Worker {
  workerId: string;
  name: string;
  currentTask: 'RECEIVING' | 'PICKING' | 'PUTAWAY' | 'IDLE';
  assignedDockId: string | null;
  certifications: string[];
  shiftEnd: string; // ISO
}

interface ErpPoRecord {
  poId: string;
  vendorName: string;
  licensePlate: string;
  sku: string;
  itemName: string;
  expectedQty: number;
  status: 'OPEN' | 'PARTIAL' | 'CLOSED';
}

const MOCK_DOCK_DOORS: DockDoor[] = [
  { doorId: 'DOCK-A1', label: 'Dock A1', zone: 'A', status: 'OCCUPIED', assignedTruckId: 'TRK-003', scheduledArrival: '2024-08-01T08:00:00Z', scheduledDeparture: '2024-08-01T10:00:00Z' },
  { doorId: 'DOCK-A2', label: 'Dock A2', zone: 'A', status: 'AVAILABLE', assignedTruckId: null, scheduledArrival: null, scheduledDeparture: null },
  { doorId: 'DOCK-B1', label: 'Dock B1', zone: 'B', status: 'OCCUPIED', assignedTruckId: 'TRK-007', scheduledArrival: '2024-08-01T09:00:00Z', scheduledDeparture: '2024-08-01T11:00:00Z' },
  { doorId: 'DOCK-B2', label: 'Dock B2', zone: 'B', status: 'AVAILABLE', assignedTruckId: null, scheduledArrival: null, scheduledDeparture: null },
  { doorId: 'DOCK-C1', label: 'Dock C1', zone: 'C', status: 'MAINTENANCE', assignedTruckId: null, scheduledArrival: null, scheduledDeparture: null },
  { doorId: 'DOCK-B99', label: 'Dock B99 (Overflow)', zone: 'OVERFLOW', status: 'AVAILABLE', assignedTruckId: null, scheduledArrival: null, scheduledDeparture: null },
];

const MOCK_TRUCK_SCHEDULES: TruckSchedule[] = [
  { truckId: 'TRK-DELAY-001', vendorName: 'Apex Auto Parts', licensePlate: 'MH-12-AB-1234', doorId: 'DOCK-A2', scheduledArrival: '2024-08-01T09:30:00Z', poId: 'PO-2024-001', status: 'DELAYED', delayMinutes: 0 },
  { truckId: 'TRK-003', vendorName: 'Delta Components', licensePlate: 'TN-09-XY-5678', doorId: 'DOCK-A1', scheduledArrival: '2024-08-01T08:00:00Z', poId: 'PO-2024-002', status: 'ARRIVED', delayMinutes: 0 },
];

const MOCK_WORKERS: Worker[] = [
  { workerId: 'WRK-001', name: 'Rajesh Kumar', currentTask: 'RECEIVING', assignedDockId: 'DOCK-A2', certifications: ['FORKLIFT', 'HAZMAT'], shiftEnd: '2024-08-01T18:00:00Z' },
  { workerId: 'WRK-002', name: 'Priya Sharma', currentTask: 'RECEIVING', assignedDockId: 'DOCK-A2', certifications: ['RECEIVING'], shiftEnd: '2024-08-01T18:00:00Z' },
  { workerId: 'WRK-003', name: 'Mohan Iyer', currentTask: 'IDLE', assignedDockId: null, certifications: ['PICKING', 'RECEIVING'], shiftEnd: '2024-08-01T18:00:00Z' },
  { workerId: 'WRK-004', name: 'Anita Singh', currentTask: 'PICKING', assignedDockId: null, certifications: ['PICKING', 'PACKING'], shiftEnd: '2024-08-01T18:00:00Z' },
];

const MOCK_ERP_PO_RECORDS: ErpPoRecord[] = [
  { poId: 'PO-2024-004', vendorName: 'Nova Freight', licensePlate: 'KA-05-EF-9012', sku: 'SKU-WIPER-MOTOR-W7', itemName: 'Wiper Motor W7', expectedQty: 150, status: 'OPEN' },
  { poId: 'PO-2024-005', vendorName: 'Sigma Logistics', licensePlate: 'GJ-01-CD-3456', sku: 'SKU-FUEL-PUMP-F4', itemName: 'Fuel Pump F4', expectedQty: 60, status: 'OPEN' },
];

// In-memory mutable schedule
const truckScheduleStore: TruckSchedule[] = [...MOCK_TRUCK_SCHEDULES];
const dockDoorStore: DockDoor[] = [...MOCK_DOCK_DOORS];
const workerStore: Worker[] = [...MOCK_WORKERS];

// ─────────────────────────────────────────────
// Result Interfaces
// ─────────────────────────────────────────────

export interface GpsDelayEvent {
  truckId: string;
  vendorName: string;
  licensePlate: string;
  originalArrival: string;
  delayMinutes: number;
  newEta: string;
  currentDoorId: string;
  poId: string;
}

export interface DockRescheduleResult {
  truckId: string;
  originalDoorId: string;
  newDoorId: string;
  newDoorLabel: string;
  originalArrival: string;
  newScheduledArrival: string;
  shiftedBy: number; // minutes
  affectedWorkers: string[];
  message: string;
}

export interface WorkerReassignmentResult {
  reassigned: Array<{
    workerId: string;
    name: string;
    fromTask: string;
    toTask: string;
    reason: string;
  }>;
  idleNow: string[];
  message: string;
}

export interface ErpPoLookupResult {
  found: boolean;
  matchedBy: 'LICENSE_PLATE' | 'VENDOR_NAME' | 'NONE';
  poRecord: ErpPoRecord | null;
  confidence: number; // 0.0–1.0
  message: string;
}

export interface OverflowDockResult {
  doorId: string;
  doorLabel: string;
  zone: string;
  vendorName: string;
  assignedAt: string;
  instruction: string;
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

@Injectable()
export class DockService {
  /**
   * UC2: Ingest a mock GPS delay event for a truck.
   */
  ingestGpsDelay(truckId: string, delayMinutes: number): GpsDelayEvent {
    const schedule = truckScheduleStore.find((t) => t.truckId === truckId);
    if (!schedule) {
      throw new Error(`No schedule found for truck: ${truckId}`);
    }

    const originalDate = new Date(schedule.scheduledArrival);
    const newEta = new Date(originalDate.getTime() + delayMinutes * 60 * 1000);

    // Mutate in store
    schedule.delayMinutes = delayMinutes;
    schedule.status = 'DELAYED';

    return {
      truckId,
      vendorName: schedule.vendorName,
      licensePlate: schedule.licensePlate,
      originalArrival: schedule.scheduledArrival,
      delayMinutes,
      newEta: newEta.toISOString(),
      currentDoorId: schedule.doorId,
      poId: schedule.poId,
    };
  }

  /**
   * UC2: Find next available dock door and shift the truck's slot.
   * Prioritizes same zone → then any available door.
   */
  findNextDockSlot(truckId: string, delayMinutes: number): DockRescheduleResult {
    const schedule = truckScheduleStore.find((t) => t.truckId === truckId);
    if (!schedule) {
      throw new Error(`No schedule found for truck: ${truckId}`);
    }

    const originalDoorId = schedule.doorId;
    const originalArrival = schedule.scheduledArrival;

    // Find next available door (not the current one, not MAINTENANCE)
    const available = dockDoorStore.filter(
      (d) => d.status === 'AVAILABLE' && d.doorId !== originalDoorId && d.zone !== 'OVERFLOW'
    );

    const newDoor = available[0] ?? dockDoorStore.find((d) => d.zone === 'OVERFLOW')!;
    if (!newDoor) {
      throw new Error('No available dock doors. All doors occupied or under maintenance.');
    }

    // Calculate new arrival
    const newArrivalDate = new Date(
      new Date(originalArrival).getTime() + delayMinutes * 60 * 1000
    );
    const newScheduledArrival = newArrivalDate.toISOString();

    // Update stores
    schedule.doorId = newDoor.doorId;
    newDoor.status = 'OCCUPIED';
    newDoor.assignedTruckId = truckId;
    newDoor.scheduledArrival = newScheduledArrival;

    // Release original door
    const oldDoor = dockDoorStore.find((d) => d.doorId === originalDoorId);
    if (oldDoor && oldDoor.assignedTruckId === truckId) {
      oldDoor.status = 'AVAILABLE';
      oldDoor.assignedTruckId = null;
      oldDoor.scheduledArrival = null;
    }

    // Find workers previously assigned to this dock
    const affectedWorkers = workerStore
      .filter((w) => w.assignedDockId === originalDoorId)
      .map((w) => w.workerId);

    return {
      truckId,
      originalDoorId,
      newDoorId: newDoor.doorId,
      newDoorLabel: newDoor.label,
      originalArrival,
      newScheduledArrival,
      shiftedBy: delayMinutes,
      affectedWorkers,
      message: `Truck ${truckId} rescheduled from ${originalDoorId} to ${newDoor.label}. New ETA: ${newScheduledArrival}.`,
    };
  }

  /**
   * UC2: Reassign idle receiving workers to picking duties.
   */
  shiftWorkers(originalDockId: string): WorkerReassignmentResult {
    const dockWorkers = workerStore.filter(
      (w) => w.assignedDockId === originalDockId && w.currentTask === 'RECEIVING'
    );

    const reassigned: WorkerReassignmentResult['reassigned'] = [];
    const idleNow: string[] = [];

    for (const worker of dockWorkers) {
      if (worker.certifications.includes('PICKING')) {
        reassigned.push({
          workerId: worker.workerId,
          name: worker.name,
          fromTask: 'RECEIVING',
          toTask: 'PICKING',
          reason: 'Dock slot delayed. Reassigned to picking queue to prevent idle time.',
        });
        worker.currentTask = 'PICKING';
        worker.assignedDockId = null;
      } else {
        idleNow.push(worker.workerId);
        worker.currentTask = 'IDLE';
        worker.assignedDockId = null;
      }
    }

    return {
      reassigned,
      idleNow,
      message:
        reassigned.length > 0
          ? `${reassigned.length} worker(s) reassigned to picking. ${idleNow.length} worker(s) now idle (no picking certification).`
          : `No workers could be reassigned — none hold a PICKING certification.`,
    };
  }

  /**
   * UC3: ERP lookup by license plate or vendor name (fuzzy match).
   */
  erpPoLookup(licensePlate: string, vendorName: string): ErpPoLookupResult {
    // Try exact license plate match first
    const plateMatch = MOCK_ERP_PO_RECORDS.find(
      (r) => r.licensePlate.toLowerCase() === licensePlate.toLowerCase()
    );

    if (plateMatch) {
      return {
        found: true,
        matchedBy: 'LICENSE_PLATE',
        poRecord: plateMatch,
        confidence: 0.99,
        message: `PO found via license plate match: ${plateMatch.poId} for ${plateMatch.vendorName}.`,
      };
    }

    // Fuzzy vendor name match
    const vendorMatch = MOCK_ERP_PO_RECORDS.find((r) =>
      r.vendorName.toLowerCase().includes(vendorName.toLowerCase()) ||
      vendorName.toLowerCase().includes(r.vendorName.toLowerCase())
    );

    if (vendorMatch) {
      return {
        found: true,
        matchedBy: 'VENDOR_NAME',
        poRecord: vendorMatch,
        confidence: 0.75,
        message: `PO found via vendor name fuzzy match: ${vendorMatch.poId} for ${vendorMatch.vendorName}. Please verify license plate manually.`,
      };
    }

    return {
      found: false,
      matchedBy: 'NONE',
      poRecord: null,
      confidence: 0,
      message: `No PO found for plate "${licensePlate}" or vendor "${vendorName}". Create a manual receiving ticket and escalate to procurement.`,
    };
  }

  /**
   * UC3: Allocate the overflow dock door (B-99) for an unannounced truck.
   */
  allocateOverflowDock(vendorName: string): OverflowDockResult {
    const overflowDoor = dockDoorStore.find((d) => d.zone === 'OVERFLOW');
    if (!overflowDoor) {
      throw new Error('Overflow dock door not found in configuration.');
    }

    overflowDoor.status = 'OCCUPIED';
    overflowDoor.assignedTruckId = `TRK-ANON-${Date.now()}`;
    overflowDoor.scheduledArrival = new Date().toISOString();

    return {
      doorId: overflowDoor.doorId,
      doorLabel: overflowDoor.label,
      zone: overflowDoor.zone,
      vendorName,
      assignedAt: new Date().toISOString(),
      instruction: `Direct driver to ${overflowDoor.label}. Assign a receiving supervisor to verify goods against any found PO. Do NOT unload until PO is confirmed.`,
    };
  }
}
