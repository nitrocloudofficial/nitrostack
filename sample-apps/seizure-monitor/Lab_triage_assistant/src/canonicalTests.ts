/**
 * Canonical Lab Test Registry
 * 
 * Maps canonical test names to their aliases and categories.
 * Used for normalizing raw lab report text to standard names.
 */

export type TestCategory = 'CBC' | 'KFT' | 'LFT' | 'Lipid' | 'Glucose' | 'Thyroid';

export interface CanonicalTest {
  aliases: string[];
  category: TestCategory;
  normalRange?: string; // For reference; not used in parsing
}

export const CANONICAL_TESTS: Record<string, CanonicalTest> = {
  // Complete Blood Count (CBC)
  Hemoglobin: {
    aliases: ['hemoglobin', 'hb', 'hgb', 'hemo'],
    category: 'CBC',
    normalRange: '12.0-18.0 g/dL'
  },
  WBC: {
    aliases: ['wbc', 'white blood cell', 'white blood cells', 'leukocyte', 'leukocytes'],
    category: 'CBC',
    normalRange: '4.5-11.0 K/uL'
  },
  Platelet: {
    aliases: ['platelet', 'platelets', 'plt', 'thrombocyte', 'thrombocytes'],
    category: 'CBC',
    normalRange: '150-400 K/uL'
  },
  RBC: {
    aliases: ['rbc', 'red blood cell', 'red blood cells', 'red blood cell count', 'erythrocyte count'],
    category: 'CBC',
    normalRange: '4.2-6.2 M/uL'
  },
  Hematocrit: {
    aliases: ['hematocrit', 'hct', 'packed cell volume', 'pcv'],
    category: 'CBC',
    normalRange: '36-54 %'
  },

  // Kidney Function Tests (KFT) + Electrolytes
  Creatinine: {
    aliases: ['creatinine', 'serum creatinine', 'cr'],
    category: 'KFT',
    normalRange: '0.6-1.35 mg/dL'
  },
  Urea: {
    aliases: ['urea', 'blood urea nitrogen', 'bun', 'serum urea'],
    category: 'KFT',
    normalRange: '7-20 mg/dL'
  },
  Sodium: {
    aliases: ['sodium', 'na', 'serum sodium'],
    category: 'KFT',
    normalRange: '135-145 mEq/L'
  },
  Potassium: {
    aliases: ['potassium', 'k', 'serum potassium'],
    category: 'KFT',
    normalRange: '3.5-5.0 mEq/L'
  },
  UricAcid: {
    aliases: ['uric acid', 'serum uric acid', 'ua'],
    category: 'KFT',
    normalRange: '2.0-7.0 mg/dL'
  },

  // Liver Function Tests (LFT)
  ALT: {
    aliases: ['alt', 'alanine aminotransferase', 'sgpt', 'serum glutamic pyruvic transaminase'],
    category: 'LFT',
    normalRange: '7-35 U/L'
  },
  AST: {
    aliases: ['ast', 'aspartate aminotransferase', 'sgot', 'serum glutamic oxaloacetic transaminase'],
    category: 'LFT',
    normalRange: '0-35 U/L'
  },
  ALP: {
    aliases: ['alp', 'alkaline phosphatase', 'serum alkaline phosphatase'],
    category: 'LFT',
    normalRange: '30-120 U/L'
  },
  Bilirubin: {
    aliases: ['bilirubin', 'total bilirubin', 'tbil', 'serum bilirubin'],
    category: 'LFT',
    normalRange: '0.1-1.2 mg/dL'
  },
  Albumin: {
    aliases: ['albumin', 'serum albumin', 'alb'],
    category: 'LFT',
    normalRange: '3.5-5.5 g/dL'
  },

  // Lipid Profile
  LDL: {
    aliases: ['ldl', 'ldl cholesterol', 'low density lipoprotein'],
    category: 'Lipid',
    normalRange: '<100 mg/dL'
  },
  HDL: {
    aliases: ['hdl', 'hdl cholesterol', 'high density lipoprotein'],
    category: 'Lipid',
    normalRange: '>=40 mg/dL'
  },
  TotalCholesterol: {
    aliases: ['total cholesterol', 'cholesterol', 'serum cholesterol', 'tc'],
    category: 'Lipid',
    normalRange: '<200 mg/dL'
  },
  Triglycerides: {
    aliases: ['triglycerides', 'tg', 'serum triglycerides'],
    category: 'Lipid',
    normalRange: '<150 mg/dL'
  },

  // Glucose
  FastingGlucose: {
    aliases: ['fasting glucose', 'fasting blood glucose', 'fbg', 'glucose fasting', 'blood glucose'],
    category: 'Glucose',
    normalRange: '70-100 mg/dL'
  },
  RandomGlucose: {
    aliases: ['random glucose', 'random blood sugar', 'rbs', 'postprandial glucose', 'ppbs', 'post prandial blood sugar'],
    category: 'Glucose',
    normalRange: '70-139 mg/dL'
  },
  HbA1c: {
    aliases: ['hba1c', 'a1c', 'glycated hemoglobin', 'glycosylated hemoglobin', 'hemoglobin a1c'],
    category: 'Glucose',
    normalRange: '<5.7 %'
  },

  // Thyroid
  TSH: {
    aliases: ['tsh', 'thyroid stimulating hormone', 'thyrotropin'],
    category: 'Thyroid',
    normalRange: '0.4-4.0 mIU/L'
  },
  FreeT4: {
    aliases: ['free t4', 'ft4', 'free thyroxine'],
    category: 'Thyroid',
    normalRange: '0.8-1.8 ng/dL'
  },
  FreeT3: {
    aliases: ['free t3', 'ft3', 'free triiodothyronine'],
    category: 'Thyroid',
    normalRange: '2.3-4.2 pg/mL'
  }
};

/**
 * Resolve a test name (from raw report) to its canonical name.
 * Returns the canonical name if found, otherwise null.
 * 
 * @param testName Raw test name from report (case-insensitive)
 * @returns Canonical test name or null if not found
 */
export function resolveTestName(testName: string): string | null {
  const normalized = testName.toLowerCase().trim();

  for (const [canonical, test] of Object.entries(CANONICAL_TESTS)) {
    if (canonical.toLowerCase() === normalized || test.aliases.includes(normalized)) {
      return canonical;
    }
  }

  return null;
}

/**
 * Get all canonical test names.
 */
export function getAllCanonicalNames(): string[] {
  return Object.keys(CANONICAL_TESTS);
}

/**
 * Get all aliases for a canonical test name.
 */
export function getAliasesForTest(canonicalName: string): string[] {
  const test = CANONICAL_TESTS[canonicalName];
  return test ? test.aliases : [];
}
