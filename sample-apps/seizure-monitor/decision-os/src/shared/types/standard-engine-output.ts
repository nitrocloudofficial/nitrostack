export type StandardEngineOutput = {
  /**
   * The unique identifier of the engine (e.g., 'finance-engine')
   */
  engineName: string;

  /**
   * 0 to 100 scale indicating certainty of the findings
   */
  confidence: number;

  /**
   * A human-readable executive summary of the engine's work
   */
  summary: string;

  /**
   * Strictly typed domain-specific data
   */
  structuredFindings: Record<string, any>;

  /**
   * What the engine had to assume to reach its findings
   */
  assumptions: string[];

  /**
   * Known blind spots or data gaps
   */
  limitations: string[];

  /**
   * Domain-specific actionable advice
   */
  recommendations: string[];

  /**
   * Observability data
   */
  metadata: {
    executionTimeMs: number;
    toolsUsed: string[];
    version: string;
  };
};
