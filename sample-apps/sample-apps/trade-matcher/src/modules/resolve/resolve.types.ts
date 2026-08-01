// This describes the shape of data coming IN from investigate_break
export interface InvestigateBreakResult {
  breakId: string;
  explained: boolean;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
}

// This describes what OUR function returns after processing
export interface ResolveOrEscalateResult {
  breakId: string;
  status: 'resolved' | 'escalated';
  reason: string;
  confidence: 'low' | 'medium' | 'high';
}

// Keeps a running count for the demo (resolved vs escalated)
export interface AccuracyStats {
  totalProcessed: number;
  resolvedCount: number;
  escalatedCount: number;
}