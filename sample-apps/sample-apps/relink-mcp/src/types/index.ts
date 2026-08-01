export interface Factory {
  id: string;
  name: string;
  mobile: string;
  whatsapp_opt_in: boolean;
  gstin?: string;
  location: { lat: number; lng: number; address: string };
  industry_type: IndustryType;
  erp_endpoint?: string;
  trust_score: number;
  created_at: string;
}

export type IndustryType =
  | 'automotive'
  | 'textile'
  | 'plastic'
  | 'metal_fab'
  | 'electronics'
  | 'chemical'
  | 'construction'
  | 'packaging'
  | 'other';

export type MaterialGrade = 'A' | 'B' | 'C' | 'U';

export type Availability = 'one_time' | 'recurring' | 'seasonal';

export type ListingStatus =
  | 'pending_verification'
  | 'verified'
  | 'matched'
  | 'sold'
  | 'cancelled';

export interface Listing {
  id: string;
  factory_id: string;
  factory_name?: string;
  material_type: string;
  grade: MaterialGrade;
  quantity_kg: number;
  availability: Availability;
  seller_quoted_price_per_kg: number;
  ai_benchmark_price_per_kg?: number;
  negotiable: boolean;
  usage_classification: string[];
  health_flags: string[];
  status: ListingStatus;
  photo_urls: string[];
  embedding?: number[];
  location?: { lat: number; lng: number; address: string };
  seller_mobile?: string;
  trust_score?: number;
  created_at: string;
  updated_at: string;
}

export interface IndustrialZone {
  name: string;
  distance_km: number;
  seller_count: number;
  avg_price_per_kg: number;
  avg_grade: string;
  avg_trust_score: number;
  top_listing_ids: string[];
  cluster_center: { lat: number; lng: number };
}

export interface WasteForecast {
  id: string;
  factory_id: string;
  predicted_material_type: string;
  predicted_quantity_kg: number;
  predicted_date: string;
  confidence: number;
  pre_notified_buyers: string[];
  created_at: string;
}

export interface ComplianceReport {
  factory_id: string;
  period: string;
  waste_diverted_tonnes: number;
  co2_saved_tonnes: number;
  revenue_from_waste: number;
  disposal_cost_saved: number;
  match_rate_percent: number;
  epr_compliance_status: 'compliant' | 'partial' | 'non_compliant';
  generated_at: string;
}

// ============================================================================
// Buyer Sourcing Agent Types
// ============================================================================

/** A single line item in a Bill of Materials (generated or manual) */
export interface BOMItem {
  material_type: string;
  estimated_quantity_kg: number;
  grade_preference?: MaterialGrade;
  max_price_per_kg?: number;
  alternatives: string[];
  notes?: string;
}

/** Buyer's procurement requirement for a single material */
export interface ProcurementRequirement {
  material_type: string;
  quantity_kg: number;
  max_price_per_kg?: number;
  required_grade?: MaterialGrade;
  preferred_radius_km?: number;
}

/** Weighted multi-criteria score for a single supplier candidate */
export interface SupplierScore {
  listing_id: string;
  factory_id: string;
  factory_name: string;
  material_type: string;
  available_quantity_kg: number;
  price_per_kg: number;
  grade: MaterialGrade;
  distance_km: number;
  trust_score: number;
  is_verified: boolean;
  is_negotiable: boolean;
  // Scoring breakdown
  distance_score: number;
  price_score: number;
  grade_score: number;
  trust_score_normalized: number;
  quantity_score: number;
  verification_score: number;
  /** Composite weighted procurement score (0–100) */
  procurement_score: number;
  /** AI-generated reasoning for this supplier's ranking */
  reasoning?: string;
}

/** Enhanced industrial zone with computed metrics from actual listings */
export interface SourcingZone {
  name: string;
  center: { lat: number; lng: number };
  distance_km: number;
  seller_count: number;
  total_available_kg: number;
  avg_price_per_kg: number;
  avg_grade: string;
  avg_trust_score: number;
  top_listing_ids: string[];
  /** Composite zone procurement score */
  zone_score: number;
  /** AI reasoning for this zone recommendation */
  reasoning?: string;
}

/** A multi-supplier allocation for one material requirement */
export interface SupplierCombination {
  requirement: ProcurementRequirement;
  allocations: Array<{
    listing_id: string;
    factory_name: string;
    allocated_kg: number;
    price_per_kg: number;
    cost: number;
    transport_cost_estimate: number;
    distance_km: number;
    grade: string;
    trust_score: number;
  }>;
  total_cost: number;
  total_transport_cost: number;
  coverage_percent: number;
  unfulfilled_kg: number;
}

/** Complete procurement plan — the final output of intelligent sourcing */
export interface ProcurementPlan {
  /** Buyer's original requirements */
  requirements: ProcurementRequirement[];
  /** Recommended industrial zones, ranked */
  recommended_zones: SourcingZone[];
  /** Ranked suppliers with scoring breakdown */
  ranked_suppliers: SupplierScore[];
  /** Optimal multi-supplier combination */
  supplier_combinations: SupplierCombination[];
  /** Search metadata */
  search_metadata: {
    radius_used_km: number;
    total_suppliers_found: number;
    total_available_quantity_kg: number;
    search_steps: Array<{ radius_km: number; suppliers_found: number; quantity_found_kg: number }>;
  };
  /** AI-generated procurement reasoning */
  ai_reasoning: string;
}
