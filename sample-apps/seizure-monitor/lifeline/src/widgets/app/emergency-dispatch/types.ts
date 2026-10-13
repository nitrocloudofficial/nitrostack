/**
 * Local mirrors of the server's tool output shapes. The widget Next.js
 * project has its own tsconfig (moduleResolution: bundler, no access to
 * src/server) so shapes are duplicated here rather than imported.
 */

export interface RankedHospitalData {
  hospital_id: string;
  hospital_name: string;
  city: string;
  latitude: number;
  longitude: number;
  capabilities: string[];
  er_beds_available: number;
  icu_beds_available: number;
  estimated_er_wait_minutes: number;
  languages: string[];
  verification_status: string;
  phone_number: string;
  data_type: 'SYNTHETIC_DEMO';
  distance_km: number;
  eta_minutes: number;
  match_score: number;
  is_recommended: boolean;
}

export interface RankingWeightsData {
  specialization_match: number;
  icu_beds_available: number;
  er_beds_available: number;
  distance: number;
  eta: number;
  wait_time: number;
}

export interface RankHospitalsOutputData {
  hospitals: RankedHospitalData[];
  recommended_hospital_id: string | null;
  ranking_weights: RankingWeightsData;
}

export type SeverityLevelData = 'Critical' | 'Severe' | 'Moderate' | 'Mild';

export interface PatientContextData {
  symptoms?: string;
  age?: number;
  gender?: string;
}

export interface RankHospitalsToolInputData {
  required_capability: string;
  origin_latitude: number;
  origin_longitude: number;
  severity?: SeverityLevelData;
  confidence?: number;
  triage_reasoning?: string;
  patient?: PatientContextData;
}

export interface GeoJSONRouteData {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  properties: {
    distanceKm: number;
    durationMinutes: number;
    summary?: string;
  };
}

export interface RouteResultData {
  distance_km: number;
  eta_minutes: number;
  route: GeoJSONRouteData;
}

export type BedTypeData = 'ER' | 'ICU';

export interface ReservationResultData {
  reservation_id: string;
  confirmation_code: string;
  status: string;
  hospital_id: string;
  hospital_name: string;
  hospital_phone_number: string;
  patient_name: string;
  bed_type: BedTypeData;
  department: string;
  arrival_instructions: string;
  reserved_at: string;
  remaining_er_beds: number;
  remaining_icu_beds: number;
}

export interface ReservationRequestPayload {
  patient_name: string;
  patient_age?: number;
  bed_type: BedTypeData;
  notes?: string;
}

/**
 * A single tool call made by THIS widget (not the upstream AI reasoning that
 * ran before the widget mounted — MCP exposes no invocation history for
 * that). Backs the Developer Panel.
 */
export interface ToolCallLogEntry {
  id: string;
  toolName: string;
  startedAt: number;
  durationMs: number | null;
  status: 'pending' | 'success' | 'error';
  requestPayload: Record<string, unknown>;
  responseSummary: string | null;
}
