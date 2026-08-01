/**
 * SentryFlow Type Definitions
 * 
 * Shared types for Amazon return fraud detection
 */

export interface PackageLog {
  orderId: string;
  weightGrams: number;
  courierNotes: string;
  timestamp: string;
}

export interface OrderMeta {
  orderId: string;
  claimValueINR: number;
  accountReturnRate90d: number;
  priorDamageComplaintsThisSku: number;
  buyerName: string;
  buyerAddress: string;
  sku: string;
}

export interface FraudSignal {
  name: string;
  weight: number;
  triggered: boolean;
  detail: string;
}

export interface FraudScoreResult {
  score: number;
  signals: FraudSignal[];
}

export interface AuditLogEntry {
  timestamp: string;
  orderId: string;
  action: 'audit' | 'dispatch' | 'guard_block';
  result?: any;
  input?: any;
  guardDecision?: boolean;
  entryHash: string;
  previousHash: string;
}

export interface IncidentAuditResult {
  orderId: string;
  claimValueINR: number;
  score: number;
  signals: FraudSignal[];
}
