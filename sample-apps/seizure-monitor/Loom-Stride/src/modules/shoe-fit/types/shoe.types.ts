export type CoinType =
  | 'inr_5'
  | 'inr_10'
  | 'credit_card';

export type Gender = 'men' | 'women' | 'unisex';
export type WidthCategory = 'narrow' | 'standard' | 'wide' | 'extra_wide';

export interface CoinSpec {
  label: string;
  diameter_mm: number;
}

export const COIN_SPECS: Record<CoinType, CoinSpec> = {
  inr_5: { label: 'INR ₹5 coin', diameter_mm: 23.0 },
  inr_10: { label: 'INR ₹10 coin', diameter_mm: 27.0 },
  credit_card: { label: 'Standard Debit/Credit/ID Card', diameter_mm: 85.60 },
};

export type ToeShape = 'Egyptian' | 'Greek' | 'Roman' | 'Square' | 'German' | 'Celtic';

export interface ShoeRecord {
  id: string;
  item_no?: string;
  brand: string;
  model: string;
  gender: Gender;
  size_us: number;
  size_uk: number;
  size_eu: number;
  length_mm: number;
  width_mm: number;
  forefoot_width_mm?: number;
  heel_width_mm?: number;
  toe_box?: 'Narrow' | 'Medium' | 'Medium Wide' | 'Wide';
  width_category: WidthCategory;
  ratio: number;
  category?: 'Running' | 'Sports' | 'Casual' | 'Professional' | 'Basketball' | 'Gym' | 'Hiking';
  heel_counter?: 'Soft' | 'Medium' | 'Firm';
  cushioning?: 'Low' | 'Medium' | 'High' | 'Maximum';
  stack_height?: number; // mm
  heel_drop?: number; // mm
  flexibility?: 'High' | 'Medium' | 'Stiff';
  weight_limit?: number; // kg
  standing_rating?: number; // 1-10
  breathability?: number; // 1-10
  price_inr?: number;
  price_usd?: number;
  url: string;
  image_url?: string;
  image_source?: string;
  image_width_px?: number;
  image_height_px?: number;
  scraped_dimensions?: Record<string, string>;
  source: string;
  last_updated: string;
}

export interface ShoeMatch {
  shoe: ShoeRecord;
  fit_score: number;
  ratio_delta: number;
  length_delta_mm: number;
  width_delta_mm: number;
  recommended_toe_room_mm: number;
  fit_summary: string;
}

export interface MatchResult {
  foot: Pick<FootMeasurement, 'length_mm' | 'width_mm' | 'ratio'>;
  matches: ShoeMatch[];
  total_candidates: number;
  query: {
    gender?: Gender;
    brand_filter?: string;
    limit: number;
  };
}

export interface ShoeDatabaseMeta {
  version: string;
  last_scraped: string | null;
  total_records: number;
  brands: string[];
  sources: string[];
}

export interface ShoeDatabase {
  meta: ShoeDatabaseMeta;
  shoes: ShoeRecord[];
}

export interface FootMeasurement {
  length_mm: number;
  width_mm: number;
  forefoot_width?: number;
  heel_width?: number;
  heel_width_mm?: number;
  toe_shape?: ToeShape;
  hallux_angle?: number;
  hallux_angle_deg?: number;
  arch_type?: string;
  scan_quality?: string;
  calibration_source?: string;
  ratio: number;
  confidence: number;
  coin_type?: CoinType;
  coin_diameter_mm?: number;
  pixels_per_mm?: number;
  foot_bounds_px?: { x: number; y: number; width: number; height: number };
  coin_bounds_px?: { x: number; y: number; width: number; height: number };
  analysis_width?: number;
  analysis_height?: number;
  notes?: string[];
}

export interface FunctionalAssessment {
  stability_level: number; // 0.25 (Unable) to 1.0 (Stable)
  balance_level: number; // 0.4 (Significant wobble) to 1.0 (Stable)
  standing_hours: number; // <2, 2-5, 5-8, >8
  activity: string; // Running, Walking, Gym, Basketball, Football, Hiking, Office, Casual
}

export interface UserProfile {
  height: number; // cm
  weight: number; // kg
  age: number;
  budget_inr?: number;
  comfort_preference: 'Soft' | 'Balanced' | 'Firm';
}

export interface MedicalConsiderations {
  diabetes: boolean;
  plantar_fasciitis: boolean;
  bunion: boolean;
  flat_feet: boolean;
  past_injury: boolean;
}

export interface BiomechanicalAssessment {
  arch_type?: 'flat_feet' | 'neutral' | 'high_arch';
  footprint_test?: 'full_midfoot' | 'curved' | 'thin_broken';
  tread_wear_test?: 'inner_edge' | 'uniform' | 'outer_edge';
  knee_alignment?: 'caves_in' | 'straight';
  heel_strike?: 'heavy_heel' | 'midfoot_forefoot';
  dynamic_load_kg?: number;
}

export interface FitWiseQuery {
  foot: {
    foot_length: number;
    forefoot_width: number;
    heel_width?: number;
    toe_shape?: ToeShape;
    hallux_angle?: number;
    scan_confidence?: number;
  };
  functional: FunctionalAssessment;
  profile: UserProfile;
  medical: MedicalConsiderations;
  biomechanical?: BiomechanicalAssessment;
  gender?: Gender;
  brand_filter?: string;
  category_filter?: string;
  search_query?: string;
  limit?: number;
}

export interface ExplainedBreakdown {
  geometry: number; // 0-100%
  activity: number; // 0-100%
  standing: number; // 0-100%
  comfort: number; // 0-100%
  medical: number; // 0-100%
  budget: number; // 0-100%
}

export interface FitWiseMatch {
  shoe: ShoeRecord;
  compatibility_score: number; // 0-100%
  confidence_score: number; // 0-100%
  topsis_closeness: number; // 0.0 - 1.0
  breakdown: ExplainedBreakdown;
  reasons: string[]; // Strengths (✓) and Warnings (△)
}

export interface FitWiseResult {
  query_summary: {
    bmi: number;
    bmi_category: string;
    width_offset_mm: number;
    recommended_size_us: number;
    recommended_size_uk: number;
  };
  matches: FitWiseMatch[];
  total_candidates: number;
}
