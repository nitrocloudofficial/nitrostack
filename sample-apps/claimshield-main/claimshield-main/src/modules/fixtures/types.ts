import { RiskResult } from '../../engine/denial-rules.engine.js';

export interface Incident {
  id: string;
  createdAt: string;
  accidentType: 'motor' | 'injury';
  incidentDate: string;
  incidentTime: string;
  location: string;
  policyType: 'motor-basic' | 'motor-premium' | 'health-addon';
  policyNumber?: string;
  vehicleRegistration?: string;
  drivingLicenceAvailable: boolean;
  injuryReported: boolean;
  firAvailable: boolean;
  hospitalBillAvailable: boolean;
  hospitalEstimateAvailable: boolean;
  notes?: string;
  state?: string;
  hasInjuries?: boolean;
  hasFIR?: boolean;
  hasDrivingLicence?: boolean;
  policyExpiryDate?: string;
  estimatedDamage?: number;
  hasSurveyor?: boolean;
  treatmentType?: 'cashless' | 'reimbursement';
  hasPreAuthorization?: boolean;
  riskResult?: RiskResult;
}

export interface ActionItem {
  id: string;
  incidentId: string;
  title: string;
  priority: 'critical' | 'high' | 'medium';
  deadlineText: string;
  owner: string;
  status: 'open' | 'completed';
  reason: string;
}

export interface ClaimReadinessResult {
  incidentId: string;
  score: number;
  status: 'READY' | 'NEEDS_ATTENTION' | 'HIGH_RISK';
  blockers: string[];
  warnings: string[];
  completedItems: string[];
  scoreBreakdown: Array<{ rule: string; points: number; explanation: string }>;
  disclaimer: string;
}

export interface PolicyDefinition {
  type: string;
  requiredDocuments: string[];
  conditionalDocuments?: Array<{ condition: string; documents: string[] }>;
}

export interface DemoHospital {
  name: string;
  isDemo: boolean;
  location: string;
}

