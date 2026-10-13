export interface DecisionContext {
  /**
   * The core goal the user wants to achieve.
   */
  objective: string;

  /**
   * Key nouns or subjects in the request.
   */
  entities: string[];

  /**
   * Hard limits (e.g., must be completed by Friday).
   */
  constraints: string[];

  /**
   * Unverified beliefs stated by the user.
   */
  assumptions: string[];

  /**
   * The geographical or logical location.
   */
  location: string | null;

  /**
   * The total capital available for the decision.
   */
  budget: number | null;

  /**
   * The timeframe for the decision.
   */
  timeHorizon: string | null;

  /**
   * People or groups affected by the decision.
   */
  stakeholders: string[];

  /**
   * The category of the decision (e.g., BUSINESS, PERSONAL, LEGAL).
   */
  decisionType: string;

  /**
   * Fields that are critically missing and must be gathered.
   */
  missingInformation: string[];

  /**
   * Any detected ambiguity in the request.
   */
  ambiguity: string | null;

  /**
   * A score from 0-100 indicating how complete the context is.
   */
  confidenceScore: number;
}
