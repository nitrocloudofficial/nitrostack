export enum OrderPriority {
  Critical = 'Critical',
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

export enum PlanningDecision {
  Reroute = 'reroute',
  Delay = 'delay',
  NoChange = 'no_change',
}

export interface ProductionOrder {
  orderId: string;
  productName: string;
  quantity: number;
  priority: OrderPriority;
  dueDate: string;
  productionDate: string;
  originalMachineId: string;
  requiredMachineType: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
}

export interface ProductionSchedule {
  machineId: string;
  productionDate: string;
  availableFrom: string;
  availableTo: string;
  capacityHours: number;
  scheduledLoadHours: number;
  supportedProducts: string[];
  status: 'Available' | 'Unavailable' | 'Maintenance';
}

export interface ProductionDisruption {
  machineId: string;
  downtimeStart: string;
  expectedDowntimeHours: number;
  reason: string;
  sourceReference?: string;
}

export interface PlannedOrderChange {
  orderId: string;
  productName: string;
  priority: OrderPriority;
  decision: PlanningDecision;
  originalMachineId: string;
  originalStart: string;
  originalEnd: string;
  revisedMachineId: string;
  revisedStart: string;
  revisedEnd: string;
  delayHours: number;
  rationale: string;
}

export interface AlternateMachineAssessment {
  machineId?: string;
  exists: boolean;
  statusValid: boolean;
  productionLineValid: boolean;
  machineTypeValid: boolean;
  scheduleAvailable: boolean;
  loadAvailable: boolean;
  reasons: string[];
}

export interface ProductionPlan {
  planId: string;
  createdAt: string;
  status: 'Pending Manager Approval';
  disruption: ProductionDisruption;
  downtimeEnd: string;
  alternateMachine: AlternateMachineAssessment;
  affectedOrderCount: number;
  orderChanges: PlannedOrderChange[];
  totalDelayHours: number;
  summary: string;
}
