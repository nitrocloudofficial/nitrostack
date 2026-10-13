export type MachineStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'MAINTENANCE';

export interface Machine {
  id: string; // e.g. MAC-CNC-101
  name: string; // CNC Mill Alpha
  line: string; // Line 1 - Precision Machining
  type: string; // CNC Milling Machine
  status: MachineStatus;
  healthScore: number; // 0 to 100
  telemetry: {
    vibration: number; // mm/s
    temperature: number; // °C
    powerConsumption: number; // kW
    cycleTime: number; // sec
    hydraulicPressure?: number; // bar
  };
  lastMaintenance: string;
  assignedTechnician?: string;
  activeAlert?: string;
}

export interface TelemetryPoint {
  timestamp: string;
  vibration: number;
  temperature: number;
  power: number;
}

export interface AnomalyFinding {
  id: string;
  timestamp: string;
  machineId: string;
  machineName: string;
  sensor: string;
  value: string;
  threshold: string;
  severity: 'WARNING' | 'CRITICAL';
  correlationWindow: string; // "45s Window #1042"
  message: string;
}

export interface SopDocument {
  id: string;
  machineType: string;
  title: string;
  relevanceScore: number;
  contentSnippet: string;
  recommendedAction: string;
  requiredParts: string[];
}

export interface VerificationStep {
  stepIndex: number;
  name: string; // e.g., "1. Correlation Windowing & Finding Extraction"
  description: string;
  status: 'PENDING' | 'RUNNING' | 'VERIFIED' | 'FAILED';
  mcpToolCall?: {
    toolName: string;
    args: Record<string, any>;
    result?: Record<string, any>;
  };
  timestamp: string;
  findings: string[];
}

export interface WorkOrder {
  id: string;
  machineId: string;
  machineName: string;
  line: string;
  severity: 'HIGH' | 'CRITICAL' | 'MEDIUM';
  issueSummary: string;
  rootCause: string;
  confidenceScore: number; // e.g. 0.94
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  assignedTechnician: {
    id: string;
    name: string;
    specialty: string;
    availability: string;
  };
  requiredParts: Array<{
    partId: string;
    partName: string;
    requiredQty: number;
    inStockQty: number;
    isAvailable: boolean;
  }>;
  estimatedImpact: {
    downtimeMinutes: number;
    unitsLost: number;
    financialImpactUsd: number;
  };
  createdAt: string;
}

export interface FaultScenario {
  id: string;
  title: string;
  machineId: string;
  description: string;
  severity: 'WARNING' | 'CRITICAL';
  simulatedMetrics: {
    vibration: number;
    temperature: number;
    powerConsumption: number;
  };
  verificationSteps: VerificationStep[];
  sop: SopDocument;
  generatedWorkOrder: WorkOrder;
}
