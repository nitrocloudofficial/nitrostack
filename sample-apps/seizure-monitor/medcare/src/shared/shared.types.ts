/**
 * Shared Type Definitions — Family MedCare Ecosystem
 *
 * Unified types used across Health, Medication, and Emergency modules.
 * Single source of truth — do NOT redeclare these in module files.
 */

// ---------------------------------------------------------------------------
// Patient & Family Profile Types
// ---------------------------------------------------------------------------

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  is_primary: boolean;
}

export interface Allergy {
  substance: string;
  reaction: string;
  severity: string;
  cross_reactions?: string[];
}

export interface Condition {
  name: string;
  icd10?: string;
  diagnosed_date?: string;
  status: string;
  severity: string;
}

export interface Medication {
  name: string;
  dose: string;
  frequency: string;
  ndc?: string;
  prescribing_physician?: string;
  start_date?: string;
  indication?: string;
}

export interface GeneticMarker {
  gene: string;
  variant: string;
  phenotype: string;
  tested_date?: string;
  clinical_note?: string;
}

export interface LabResult {
  test: string;
  value: number;
  unit: string;
  reference_range: string;
  status: string;
  date: string;
}

export interface PatientProfile {
  patient_id: string;
  name: string;
  relationship: string;
  age: number;
  date_of_birth?: string;
  sex: string;
  blood_type: string;
  weight_kg: number;
  height_cm: number;
  genetic_markers: GeneticMarker[];
  conditions: Condition[];
  active_medications: Medication[];
  allergies: Allergy[];
  emergency_contacts: EmergencyContact[];
  recent_lab_results?: LabResult[];
}

export interface PatientDB {
  version?: string;
  description?: string;
  patients: PatientProfile[];
}

// ---------------------------------------------------------------------------
// Pharmacogenomics Types
// ---------------------------------------------------------------------------

export interface GeneConflict {
  drug: string;
  severity: 'high' | 'moderate' | 'low';
  risk: string;
  recommendation: string;
  fda_boxed_warning: boolean;
}

export interface GeneVariant {
  phenotype: string;
  frequency_percent?: number;
  conflicts: GeneConflict[];
}

export interface GeneMarkerData {
  gene: string;
  full_name: string;
  function?: string;
  variants: Record<string, GeneVariant>;
}

export interface PharmacogenomicsDB {
  version?: string;
  description?: string;
  markers: Record<string, GeneMarkerData>;
}

// ---------------------------------------------------------------------------
// Counterfeit Batch Types
// ---------------------------------------------------------------------------

export interface CounterfeitBatch {
  batch: string;
  drug: string;
  reason: string;
  reported_date: string;
  severity: string;
  source: string;
  lot_numbers?: string[];
}

// ---------------------------------------------------------------------------
// Health Data Extraction Types
// ---------------------------------------------------------------------------

export interface HealthEntry {
  test_name: string;
  value: string | number;
  unit: string;
  reference_range: string;
  status: 'normal' | 'above_range' | 'below_range' | 'critical' | 'unknown';
  date: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Medication Authenticity Types
// ---------------------------------------------------------------------------

export type AuthenticityStatus =
  | 'verified'
  | 'flagged_recall'
  | 'flagged_reported_counterfeit'
  | 'unrecognized_product'
  | 'unable_to_verify';

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
