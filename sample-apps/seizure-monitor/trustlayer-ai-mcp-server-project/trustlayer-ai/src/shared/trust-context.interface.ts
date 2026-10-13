/**
 * TrustLayer AI — Shared Type Contracts
 * Single source of truth for all modules.
 */

// --- Claim Severity Levels ---
export type ClaimSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// --- Severity → Strength Mapping (used by ContextService.addClaim) ---
export const SEVERITY_TO_STRENGTH: Record<ClaimSeverity, number> = {
  INFO: 0.1,
  LOW: 0.3,
  MEDIUM: 0.5,
  HIGH: 0.8,
  CRITICAL: 0.95
};

// --- Claim Input Interface (what tool outputs return) ---
export interface ClaimInput {
  source: string;
  type: string;
  fact: string;
  value: any;
  description: string;
  severity: ClaimSeverity;
  weight?: number;
}

// --- Full Claim Interface (stored in TrustContext) ---
export interface Claim extends ClaimInput {
  id: string;
  ts: number;
  strength: number;
}

// --- Corroboration Interface ---
export interface Corroboration {
  relation: 'CONTRADICTS' | 'CORROBORATES';
  claimIds: string[];
  description: string;
}

// --- Trust Context Interface ---
export interface TrustContext {
  transactionId: string;
  claims: Claim[];
  corroborations: Corroboration[];
  posterior?: number;
  benignExplanationChecked?: boolean;
  decision?: string;
}
