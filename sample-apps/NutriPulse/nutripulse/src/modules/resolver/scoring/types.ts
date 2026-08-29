export interface ScoreBreakdown {
  score: number;
  components: Record<string, number>;
  metadata?: Record<string, unknown>;
}
