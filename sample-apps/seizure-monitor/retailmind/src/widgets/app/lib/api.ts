/**
 * Client for the RetailMind analysis backend.
 *
 * In local development the browser talks to the dev bridge (src/dev-server.ts),
 * which runs the same PlannerTools.analyze() the MCP `analyze` tool runs. When
 * the widget is hosted inside an MCP client the host supplies the tool result
 * directly and this module is not used.
 *
 * There is deliberately no mock fallback: if the backend fails, the error is
 * surfaced to the UI rather than quietly substituting invented numbers.
 */

/** One evaluated zone. Mirrors ZoneScore in src/common/types.ts. */
export interface ZoneScore {
  name: string;
  lat: number;
  lng: number;
  opportunityScore: number;
  footfallPotentialScore: number;
  demographicScore: number;
  competitionScore: number;
  anchorScore: number;
  /** Null when WorldPop was unreachable; never estimated. */
  population: number | null;
  competitorCount: number;
  /** Relative commercial cost pressure, 0-100 — derived, not a rent figure. */
  costPressureIndex: number;
  budgetFitScore: number;
}

/** Mirrors AnalyzeOutput in src/common/types.ts. */
export interface AnalyzeResponse {
  opportunityScore: number;
  recommendedArea: string;
  /** Footfall Potential Score — named "traffic" for schema compatibility. */
  traffic: number;
  competition: number;
  demographics: number;
  executiveSummary: string;
  zones: ZoneScore[];
  /** States the budget assumption applied, and that it is not measured rent data. */
  budgetAssumption: string;
  /** Set when a data source was unavailable and its weight was redistributed. */
  dataAvailabilityNote: string | null;
}

export interface AnalyzeRequest {
  businessType: string;
  city: string;
  budget: number;
  radius: number;
}

const API_URL =
  process.env.NEXT_PUBLIC_ANALYZE_API ?? "http://localhost:3002/analyze";

/** Survives the client-side navigation from the form to /analysis. */
const STORAGE_KEY = "retailmind.analysis";

export async function requestAnalysis(
  input: AnalyzeRequest
): Promise<AnalyzeResponse> {
  let response: Response;

  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error(
      `Could not reach the analysis backend at ${API_URL}. Start it with "npm run dev:api".`
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error ?? `Analysis failed (HTTP ${response.status}).`);
  }
  if (!payload?.zones?.length) {
    throw new Error("The backend returned no analyzed zones.");
  }

  return payload as AnalyzeResponse;
}

export function storeAnalysis(result: AnalyzeResponse): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
}

/**
 * Whether a value is a complete analysis result for the CURRENT output shape.
 *
 * Used for both the MCP host's tool output and anything restored from session
 * storage. A payload from an older build can be missing fields the report now
 * shows (budget assumption, cost pressure); rendering it would silently
 * produce a half-empty report that still looks like a real one.
 */
export function isAnalyzeResponse(value: unknown): value is AnalyzeResponse {
  const candidate = value as AnalyzeResponse | null | undefined;

  return (
    typeof candidate?.recommendedArea === "string" &&
    typeof candidate?.budgetAssumption === "string" &&
    Array.isArray(candidate?.zones) &&
    candidate.zones.length > 0 &&
    typeof candidate.zones[0]?.costPressureIndex === "number"
  );
}

/**
 * Returns null when the page is opened without a preceding analysis, or when
 * the stored result predates the current output shape (in which case the
 * stale entry is cleared so it cannot resurface).
 */
export function loadStoredAnalysis(): AnalyzeResponse | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!isAnalyzeResponse(parsed)) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
