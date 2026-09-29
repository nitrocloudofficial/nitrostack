/**
 * HL7 FHIR R4 Standard Types and LOINC / SNOMED CT Codes
 * CAREBRIDGE AI - EHR Interoperability Layer
 */

export const LOINC_CODES = {
  RESTING_HEART_RATE: { code: '8867-4', display: 'Heart rate', unit: 'beats/min' },
  SLEEP_DURATION: { code: '9318-7', display: 'Sleep duration', unit: 'h' },
  DAILY_STEPS: { code: '9383-2', display: 'Step count', unit: 'steps/day' },
  HEMOGLOBIN: { code: '718-7', display: 'Hemoglobin [Mass/volume] in Blood', unit: 'g/dL' },
} as const;

export const SNOMED_CODES = {
  HYPERTENSION: { code: '38341003', display: 'Essential hypertension' },
  CHRONIC_FATIGUE: { code: '84229001', display: 'Fatigue' },
  TYPE_2_DIABETES: { code: '44054006', display: 'Diabetes mellitus type 2' },
  ASTHMA: { code: '195967001', display: 'Asthma' },
} as const;

export interface FHIRCoding {
  system: string;
  code: string;
  display?: string;
}

export interface FHIRCodeableConcept {
  coding: FHIRCoding[];
  text?: string;
}

export interface FHIRQuantity {
  value: number;
  unit: string;
  system?: string;
  code?: string;
}

export interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  active: boolean;
  name: Array<{
    use?: string;
    family: string;
    given: string[];
  }>;
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string;
  telecom?: Array<{
    system: string;
    value: string;
  }>;
}

export interface FHIRObservation {
  resourceType: 'Observation';
  id: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended';
  category?: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject: { reference: string };
  effectiveDateTime: string;
  valueQuantity?: FHIRQuantity;
  valueString?: string;
  interpretation?: FHIRCodeableConcept[];
}

export interface FHIRCondition {
  resourceType: 'Condition';
  id: string;
  clinicalStatus: FHIRCodeableConcept;
  verificationStatus: FHIRCodeableConcept;
  code: FHIRCodeableConcept;
  subject: { reference: string };
  onsetDateTime?: string;
}

export interface FHIRMedicationStatement {
  resourceType: 'MedicationStatement';
  id: string;
  status: 'active' | 'completed' | 'entered-in-error' | 'intended';
  medicationCodeableConcept: FHIRCodeableConcept;
  subject: { reference: string };
  dosage?: Array<{ text: string }>;
}

export interface FHIRBundleEntry {
  fullUrl?: string;
  resource: FHIRPatient | FHIRObservation | FHIRCondition | FHIRMedicationStatement;
}

export interface FHIRBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'collection' | 'searchset' | 'transaction';
  timestamp: string;
  total: number;
  entry: FHIRBundleEntry[];
}
