/**
 * Global Shared Agent State Matrix for AetherCare
 * Ensures all tools and AI agents share context, task history, and updated state.
 */

export interface GlobalAgentState {
  activeSessionId: string;
  patientName: string;
  hospitalName: string;
  city: string;
  state: string;
  activeScheme: string;
  quotedAmountINR: number;
  nppaLegalCapINR: number;
  illegalExcessOverchargeINR: number;
  empanelmentStatus: 'EMPANELED_ACTIVE' | 'SUSPENDED' | 'BLACK_LISTED';
  fraudRiskLevel: 'CLEAN' | 'MEDIUM_RISK' | 'HIGH_FRAUD_VIOLATION';
  legalNoticeGenerated: boolean;
  emailEscalationDispatched: boolean;
  rebateEntitlementINR: number;
  lastUpdatedTimestamp: string;
  completedTasksHistory: Array<{ taskId: string; actionName: string; status: string; timestamp: string }>;
}

export const CURRENT_GLOBAL_AGENT_STATE: GlobalAgentState = {
  activeSessionId: 'SESS-AETHER-2026-99201',
  patientName: 'Rajesh Kumar',
  hospitalName: 'Kauvery Super Specialty Hospital',
  city: 'Chennai',
  state: 'Tamil Nadu',
  activeScheme: 'CMCHIS Tamil Nadu & PM-JAY (Ayushman Bharat)',
  quotedAmountINR: 45000,
  nppaLegalCapINR: 38260,
  illegalExcessOverchargeINR: 6740,
  empanelmentStatus: 'EMPANELED_ACTIVE',
  fraudRiskLevel: 'HIGH_FRAUD_VIOLATION',
  legalNoticeGenerated: true,
  emailEscalationDispatched: true,
  rebateEntitlementINR: 25123.28,
  lastUpdatedTimestamp: new Date().toISOString(),
  completedTasksHistory: [
    { taskId: 'TASK-101', actionName: 'Hospital Empanelment Verification', status: 'EMPANELED_ACTIVE', timestamp: new Date().toISOString() },
    { taskId: 'TASK-102', actionName: 'NPPA Cardiac Stent Price Audit', status: 'OVERCHARGE_DETECTED (₹6,740)', timestamp: new Date().toISOString() },
    { taskId: 'TASK-103', actionName: 'Form 14555 Statutory Notice Generation', status: 'NOTICE_FORMULATED', timestamp: new Date().toISOString() },
    { taskId: 'TASK-104', actionName: 'District Collector Email Escalation', status: 'EMAIL_DISPATCHED', timestamp: new Date().toISOString() }
  ]
};

export function updateGlobalState(updates: Partial<GlobalAgentState>): GlobalAgentState {
  Object.assign(CURRENT_GLOBAL_AGENT_STATE, updates);
  CURRENT_GLOBAL_AGENT_STATE.lastUpdatedTimestamp = new Date().toISOString();
  return CURRENT_GLOBAL_AGENT_STATE;
}
