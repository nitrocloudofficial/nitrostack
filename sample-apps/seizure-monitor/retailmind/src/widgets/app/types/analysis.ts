export interface BusinessInput {
  businessType: string;
  budget: number;
  city: string;
  radiusKm: number;
}

export type AgentStatus =
  | "waiting"
  | "running"
  | "completed"
  | "failed";

export interface AgentState {
  name: string;
  status: AgentStatus;
}

export interface Zone {
  id: string;
  name: string;

  latitude: number;
  longitude: number;

  opportunityScore: number;

  demographicScore: number;
  footfallScore: number;
  competitionScore: number;
  anchorScore: number;

  /** Real WorldPop catchment population, or null when unavailable. */
  population: number | null;
  competitorCount: number;

  /** Relative commercial cost pressure, 0-100 — derived, not a rent figure. */
  costPressureIndex: number;
  budgetFitScore: number;
}