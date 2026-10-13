export interface ActionRecord {
  timestamp: string;
  action: string;
  target: string;
  detail: Record<string, unknown>;
  proposedBy: 'FinOpsAgent' | 'AvailabilityGuardian' | 'Operator';
  status: 'EXECUTED' | 'REJECTED';
  reason?: string;
}

// ponytail: module-scoped array — persists within one warm instance, resets on restart.
// Upgrade path if durable audit is needed: swap these three functions for NitroCloud KV / Redis.
const log: ActionRecord[] = [];
export const recordAction = (r: ActionRecord) => { log.push(r); };
export const getActionLog = () => log;
