/**
 * Unified payload shape for PharmaGuard widget
 * Normalizes output from lookup_ndc, search_adverse_events, check_recall_status
 */

export interface DrugInfo {
  name: string;
  ndc: string;
  manufacturer: string;
  dosageForm?: string;
}

export interface AdverseReaction {
  reaction: string;
  count: number;
}

export interface Recall {
  classification: string;
  reason: string;
  status: string;
  initiationDate: string;
}

export interface PharmaGuardPayload {
  drug: DrugInfo;
  adverseEvents: AdverseReaction[];
  recalls: Recall[];
  loading?: boolean;
  error?: string | null;
}
