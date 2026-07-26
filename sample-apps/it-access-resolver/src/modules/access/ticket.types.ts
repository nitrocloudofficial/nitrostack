import type { DiagnosisResult } from './access.types.js';

// Re-export so callers only need to import from one place
export type { DiagnosisResult };

export interface Ticket {
  id: string;
  employeeId: string;
  issueText: string;
  status: 'open' | 'diagnosing' | 'resolved' | 'escalated';
  /** Populated after runFullDiagnosis is called */
  diagnosis?: DiagnosisResult;
  /** Human-readable steps taken to resolve the issue */
  resolutionSteps: string[];
  createdAt: string;
  /** Set when status transitions to "resolved" or "escalated" */
  resolvedAt?: string;
}
