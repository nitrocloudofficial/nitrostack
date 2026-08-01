/**
 * Lab Test Reference Ranges
 *
 * Defines normal and critical ranges for each canonical test, sourced
 * from cited clinical references (Mayo Clinic Laboratories, WHO, ADA,
 * NCEP ATP III) rather than approximated figures. Ranges are unisex
 * combined values for simplicity — real clinical practice often uses
 * sex-specific ranges, and "critical" thresholds vary by institution;
 * where no single widely-cited panic value exists, that's noted below.
 *
 * Used by flag_critical tool to classify test results.
 */

export interface ReferenceRange {
  testName: string;
  unit: string;
  panel: string;
  normalRange: {
    min: number;
    max: number;
  };
  criticalRange: {
    min: number;
    max: number;
  };
  description?: string;
  source?: string;
}

export const referenceRanges: ReferenceRange[] = [
  // CBC (Complete Blood Count)
  {
    testName: 'Hemoglobin',
    unit: 'g/dL',
    panel: 'CBC',
    normalRange: { min: 12.0, max: 18.0 },
    criticalRange: { min: 6.0, max: 20.0 },
    description: 'Red blood cell oxygen-carrying protein (unisex combined range)',
    source: 'WHO hemoglobin thresholds; Mayo Clinic Laboratories critical value (≤6.0 g/dL)'
  },
  {
    testName: 'WBC',
    unit: 'K/uL',
    panel: 'CBC',
    normalRange: { min: 4.5, max: 11.0 },
    criticalRange: { min: 2.0, max: 30.0 },
    description: 'White blood cell count (infection/immune marker)',
    source: 'Standard adult reference interval; critical bounds follow common hospital panic-value convention (institution-specific)'
  },
  {
    testName: 'Platelet',
    unit: 'K/uL',
    panel: 'CBC',
    normalRange: { min: 150.0, max: 400.0 },
    criticalRange: { min: 40.0, max: 1000.0 },
    description: 'Platelet count (clotting ability)',
    source: 'Mayo Clinic Laboratories (critical low ≤40, critical high ≥1000 ×10³/µL)'
  },
  {
    testName: 'RBC',
    unit: 'M/uL',
    panel: 'CBC',
    normalRange: { min: 4.2, max: 6.2 },
    criticalRange: { min: 2.5, max: 7.5 },
    description: 'Red blood cell count (unisex combined range)',
    source: 'Standard adult reference interval (men 4.6–6.2, women 4.2–5.4 million/µL); critical bounds are a derived clinical-severity estimate, not a standard panic value'
  },
  {
    testName: 'Hematocrit',
    unit: '%',
    panel: 'CBC',
    normalRange: { min: 36.0, max: 54.0 },
    criticalRange: { min: 15.0, max: 60.0 },
    description: 'Percentage of blood volume that is red blood cells (unisex combined range)',
    source: 'Standard adult reference interval (men 40–54%, women 36–48%); critical bounds are commonly cited severe anemia/polycythemia thresholds'
  },

  // KFT (Kidney Function Tests + Electrolytes)
  {
    testName: 'Creatinine',
    unit: 'mg/dL',
    panel: 'KFT',
    normalRange: { min: 0.6, max: 1.35 },
    criticalRange: { min: 0.2, max: 4.0 },
    description: 'Kidney function marker (unisex combined range)',
    source: 'Mayo Clinic Laboratories (men 0.74–1.35, women 0.59–1.04 mg/dL); critical high commonly cited for acute kidney injury (institution-specific)'
  },
  {
    testName: 'Urea',
    unit: 'mg/dL',
    panel: 'KFT',
    normalRange: { min: 7.0, max: 20.0 },
    criticalRange: { min: 2.0, max: 100.0 },
    description: 'Blood urea nitrogen (BUN) — nitrogen waste product, kidney function',
    source: 'Medscape/Mayo standard adult range; critical high is a commonly cited severe-azotemia threshold'
  },
  {
    testName: 'Sodium',
    unit: 'mEq/L',
    panel: 'KFT',
    normalRange: { min: 135.0, max: 145.0 },
    criticalRange: { min: 120.0, max: 160.0 },
    description: 'Serum sodium (electrolyte, fluid balance)',
    source: 'Mayo Clinic Laboratories'
  },
  {
    testName: 'Potassium',
    unit: 'mEq/L',
    panel: 'KFT',
    normalRange: { min: 3.5, max: 5.0 },
    criticalRange: { min: 2.5, max: 6.5 },
    description: 'Serum potassium (electrolyte, cardiac rhythm)',
    source: 'Mayo Clinic Laboratories (life-threatening arrhythmia risk below 2.5 or above 6.0–6.5 mEq/L)'
  },
  {
    testName: 'UricAcid',
    unit: 'mg/dL',
    panel: 'KFT',
    normalRange: { min: 2.0, max: 7.0 },
    criticalRange: { min: 0.5, max: 12.0 },
    description: 'Serum uric acid (gout / kidney stone / kidney function marker, unisex combined range)',
    source: 'Mayo Clinic Laboratories (men 2.7–6.1 mg/dL, women ~1.7–5.1 mg/dL); critical high reflects severe hyperuricemia/tumor-lysis-syndrome risk, not a standard panic value'
  },

  // LFT (Liver Function Tests)
  {
    testName: 'ALT',
    unit: 'U/L',
    panel: 'LFT',
    normalRange: { min: 7.0, max: 35.0 },
    criticalRange: { min: 0.0, max: 500.0 },
    description: 'Alanine aminotransferase (liver enzyme)',
    source: 'Standard adult reference interval; critical high reflects severe acute hepatic injury (institution-specific)'
  },
  {
    testName: 'AST',
    unit: 'U/L',
    panel: 'LFT',
    normalRange: { min: 0.0, max: 35.0 },
    criticalRange: { min: 0.0, max: 500.0 },
    description: 'Aspartate aminotransferase (liver/muscle enzyme)',
    source: 'Standard adult reference interval; critical high reflects severe acute hepatic injury (institution-specific)'
  },
  {
    testName: 'ALP',
    unit: 'U/L',
    panel: 'LFT',
    normalRange: { min: 30.0, max: 120.0 },
    criticalRange: { min: 0.0, max: 400.0 },
    description: 'Alkaline phosphatase (liver/bone enzyme)',
    source: 'Standard adult reference interval; critical high reflects marked cholestasis/bone disease (institution-specific)'
  },
  {
    testName: 'Bilirubin',
    unit: 'mg/dL',
    panel: 'LFT',
    normalRange: { min: 0.1, max: 1.2 },
    criticalRange: { min: 0.0, max: 12.0 },
    description: 'Total bilirubin (bile pigment, liver/hemolysis marker)',
    source: 'Standard adult reference interval; critical value >12 mg/dL commonly cited'
  },
  {
    testName: 'Albumin',
    unit: 'g/dL',
    panel: 'LFT',
    normalRange: { min: 3.5, max: 5.5 },
    criticalRange: { min: 2.0, max: 6.0 },
    description: 'Serum albumin (liver synthetic function / nutrition marker)',
    source: 'Standard adult reference interval; critical low reflects severe hypoalbuminemia (institution-specific)'
  },

  // Lipid Profile
  {
    testName: 'LDL',
    unit: 'mg/dL',
    panel: 'Lipid',
    normalRange: { min: 0.0, max: 99.0 },
    criticalRange: { min: 0.0, max: 189.0 },
    description: 'Low-density lipoprotein cholesterol ("bad" cholesterol)',
    source: 'NCEP ATP III (optimal <100 mg/dL; very high ≥190 mg/dL)'
  },
  {
    testName: 'HDL',
    unit: 'mg/dL',
    panel: 'Lipid',
    normalRange: { min: 40.0, max: 200.0 },
    criticalRange: { min: 20.0, max: 200.0 },
    description: 'High-density lipoprotein cholesterol ("good" cholesterol) — only low values are a health concern',
    source: 'NCEP ATP III (low HDL <40 mg/dL is a cardiovascular risk factor)'
  },
  {
    testName: 'TotalCholesterol',
    unit: 'mg/dL',
    panel: 'Lipid',
    normalRange: { min: 0.0, max: 199.0 },
    criticalRange: { min: 0.0, max: 239.0 },
    description: 'Total serum cholesterol',
    source: 'NCEP ATP III (desirable <200 mg/dL; high ≥240 mg/dL)'
  },
  {
    testName: 'Triglycerides',
    unit: 'mg/dL',
    panel: 'Lipid',
    normalRange: { min: 0.0, max: 149.0 },
    criticalRange: { min: 0.0, max: 499.0 },
    description: 'Serum triglycerides',
    source: 'NCEP ATP III (normal <150 mg/dL; very high ≥500 mg/dL, acute pancreatitis risk)'
  },

  // Glucose
  {
    testName: 'FastingGlucose',
    unit: 'mg/dL',
    panel: 'Glucose',
    normalRange: { min: 70.0, max: 100.0 },
    criticalRange: { min: 54.0, max: 240.0 },
    description: 'Fasting blood glucose (diabetes marker)',
    source: 'ADA Standards of Care (normal 70–99 mg/dL; severe hypoglycemia <54 mg/dL; DKA risk >240 mg/dL)'
  },
  {
    testName: 'RandomGlucose',
    unit: 'mg/dL',
    panel: 'Glucose',
    normalRange: { min: 70.0, max: 139.0 },
    criticalRange: { min: 54.0, max: 240.0 },
    description: 'Random / postprandial blood glucose',
    source: 'ADA-aligned postprandial threshold (<140 mg/dL); severe thresholds match ADA hypo/hyperglycemia criteria'
  },
  {
    testName: 'HbA1c',
    unit: '%',
    panel: 'Glucose',
    normalRange: { min: 3.0, max: 5.6 },
    criticalRange: { min: 3.0, max: 9.9 },
    description: 'Glycated hemoglobin (3-month average blood glucose)',
    source: 'ADA Standards of Care (normal <5.7%; diabetes ≥6.5%); ≥10% commonly cited as poor long-term control'
  },

  // Thyroid
  {
    testName: 'TSH',
    unit: 'mIU/L',
    panel: 'Thyroid',
    normalRange: { min: 0.4, max: 4.0 },
    criticalRange: { min: 0.1, max: 10.0 },
    description: 'Thyroid-stimulating hormone',
    source: 'Standard adult reference interval; values <0.1 or >10 mIU/L commonly cited as warranting clinical follow-up'
  },
  {
    testName: 'FreeT4',
    unit: 'ng/dL',
    panel: 'Thyroid',
    normalRange: { min: 0.8, max: 1.8 },
    criticalRange: { min: 0.4, max: 4.0 },
    description: 'Free thyroxine',
    source: 'Standard adult reference interval; critical bounds reflect myxedema coma / thyroid storm risk zones (institution-specific)'
  },
  {
    testName: 'FreeT3',
    unit: 'pg/mL',
    panel: 'Thyroid',
    normalRange: { min: 2.3, max: 4.2 },
    criticalRange: { min: 1.0, max: 10.0 },
    description: 'Free triiodothyronine',
    source: 'Standard adult reference interval; critical bounds reflect thyroid storm risk zone (institution-specific)'
  }
];

/**
 * Build a lookup map for fast reference-range queries
 * Key: `${testName}|${unit}` (e.g., "Hemoglobin|g/dL")
 */
export function buildReferenceMap(): Map<string, ReferenceRange> {
  const map = new Map<string, ReferenceRange>();
  for (const range of referenceRanges) {
    const key = `${range.testName}|${range.unit}`;
    map.set(key, range);
  }
  return map;
}

/**
 * Get reference range for a specific test
 */
export function getReferenceRange(testName: string, unit: string): ReferenceRange | undefined {
  const key = `${testName}|${unit}`;
  const map = buildReferenceMap();
  return map.get(key);
}
