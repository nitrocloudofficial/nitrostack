export interface AnalyzeInput {
  businessType: string;
  city: string;
  budget: number;
  radius: number;
}

export interface ZoneCandidate {
  name: string;
  lat: number;
  lng: number;
}

export interface MapsResult {
  zones: ZoneCandidate[];
}

export interface PlacesResult {
  zone: string;
  competitorCount: number;
  competitors: string[];
  anchorPoints: string[];
}

export interface DemographicsResult {
  zone: string;
  /**
   * Null when WorldPop is unreachable. The value is never estimated or
   * substituted — an absent measurement is reported as absent.
   */
  population: number | null;
  /** Purchasing Power Proxy (Geoapify-derived), NOT measured income. */
  medianIncome: number;
  /** Null when WorldPop is unreachable, on the same basis as `population`. */
  age18to35Pct: number | null;
}

export interface TrafficResult {
  zone: string;
  footTraffic: number;
}

/**
 * Per-zone scores for every candidate the analysis evaluated, not just the
 * winner. The Opportunity Engine already computes these internally; exposing
 * them lets a client rank, map and compare zones without re-deriving anything
 * (and without inventing data to fill a UI).
 */
export interface ZoneScore {
  name: string;
  lat: number;
  lng: number;
  opportunityScore: number;
  footfallPotentialScore: number;
  demographicScore: number;
  competitionScore: number;
  anchorScore: number;
  /**
   * Real WorldPop catchment population, or null when WorldPop is unreachable.
   * Never estimated — see DemographicsService.
   */
  population: number | null;
  competitorCount: number;
  /**
   * Relative commercial cost pressure, 0-100. Derived from real measured
   * signals (affluence density and footfall). NOT a rent figure.
   */
  costPressureIndex: number;
  /** How well the zone's cost pressure fits the stated budget, 0-100. */
  budgetFitScore: number;
}

export interface AnalyzeOutput {
  opportunityScore: number;
  recommendedArea: string;
  traffic: number;
  competition: number;
  demographics: number;
  executiveSummary: string;
  /** Every evaluated zone, best first. Additive — the fields above are unchanged. */
  zones: ZoneScore[];
  /**
   * Plain-language statement of the budget assumption applied, so a reader is
   * never left thinking the budget was matched against real rent data.
   */
  budgetAssumption: string;
  /**
   * Set when a data source was unavailable and the score was computed without
   * it. Null on a fully-measured analysis. Surfaced so degraded results are
   * never mistaken for complete ones.
   */
  dataAvailabilityNote: string | null;
}
