/**
 * Source of Truth Hospital Interface
 * Shared across all 4 engineering modules. DO NOT RENAME fields.
 */
export interface Hospital {
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
}

export interface NearbyHospitalsQuery {
  latitude: number;
  longitude: number;
  radius_km?: number;
  required_capability?: string;
}

export interface ResourceAvailabilityResult {
  hospital_id: string;
  hospital_name: string;
  er_beds_available: number;
  icu_beds_available: number;
  estimated_er_wait_minutes: number;
  is_operational: boolean;
}

export interface RankedHospital extends Hospital {
  distance_km: number;
  eta_minutes: number;
  match_score: number;
  is_recommended: boolean;
}

export interface RankHospitalsInput {
  hospitals: Hospital[];
  required_capability: string;
  origin_latitude: number;
  origin_longitude: number;
}

export interface NearbyHospitalResult extends Hospital {
  distance_km: number;
}

export interface HospitalCapabilitiesResult {
  hospital_id: string;
  hospital_name: string;
  city: string;
  capabilities: string[];
  languages: string[];
  verification_status: string;
  phone_number: string;
  is_operational: boolean;
}

/**
 * Weighted scoring model consumed by RankingService.rank(). See
 * DEFAULT_RANKING_WEIGHTS in shared/constants.ts for the configured values.
 */
export interface RankingWeights {
  specialization_match: number;
  icu_beds_available: number;
  er_beds_available: number;
  distance: number;
  eta: number;
  wait_time: number;
}
