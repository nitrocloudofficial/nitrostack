export const TOOL_NAMES = {
  GET_NEARBY_HOSPITALS: 'get_nearby_hospitals',
  GET_HOSPITAL_CAPABILITIES: 'get_hospital_capabilities',
  CHECK_RESOURCE_AVAILABILITY: 'check_resource_availability',
  CALCULATE_ROUTE: 'calculate_route',
  RANK_HOSPITALS: 'rank_hospitals',
  REQUEST_EMERGENCY_RESERVATION: 'request_emergency_reservation',
  TRIAGE_SYMPTOMS: 'triage_symptoms',
} as const;

export const CAPABILITIES = {
  CARDIAC_CATH_LAB: 'Cardiac Cath Lab',
  TRAUMA_LEVEL_1: 'Trauma Level 1',
  STROKE_CENTER: 'Stroke Center',
  PEDIATRIC_ICU: 'Pediatric ICU',
  GENERAL_ER: 'General ER',
} as const;

export const DEFAULT_SEARCH_RADIUS_KM = 50;
export const DEFAULT_AMBULANCE_SPEED_KMH = 50;

/**
 * Weighted scoring model for rank_hospitals. Weights sum to 1.0.
 * Each factor is min-max normalized across the candidate set before weighting
 * (specialization match is a fixed 0 / 0.3 / 1.0 score, not normalized).
 */
export const DEFAULT_RANKING_WEIGHTS = {
  specialization_match: 0.3,
  icu_beds_available: 0.15,
  er_beds_available: 0.15,
  distance: 0.15,
  eta: 0.15,
  wait_time: 0.1,
} as const;

export const ERROR_CODES = {
  INVALID_SYMPTOMS: 'INVALID_SYMPTOMS',
  INVALID_COORDINATES: 'INVALID_COORDINATES',
  HOSPITAL_NOT_FOUND: 'HOSPITAL_NOT_FOUND',
  NO_HOSPITALS_FOUND: 'NO_HOSPITALS_FOUND',
  NO_BEDS_AVAILABLE: 'NO_BEDS_AVAILABLE',
  RESERVATION_CONFLICT: 'RESERVATION_CONFLICT',
  INVALID_HOSPITAL_ID: 'INVALID_HOSPITAL_ID',
  ROUTING_SERVICE_ERROR: 'ROUTING_SERVICE_ERROR',
} as const;
