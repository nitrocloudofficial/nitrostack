/**
 * Condition-to-Specialty Mapping Rules
 * Maps medical conditions/keywords to specialty IDs for recommendation logic.
 * Easy to inspect and extend — add new mappings as needed.
 */

export const CONDITION_TO_SPECIALTY_MAP: Record<string, string> = {
  // Cardiology
  'acute coronary syndrome': 'cardiology',
  'acs': 'cardiology',
  'chest pain': 'cardiology',
  'heart attack': 'cardiology',
  'myocardial infarction': 'cardiology',
  'arrhythmia': 'cardiology',
  'atrial fibrillation': 'cardiology',
  'heart failure': 'cardiology',
  'hypertension': 'cardiology',
  'palpitations': 'cardiology',

  // Neurology
  'stroke': 'neurology',
  'seizure': 'neurology',
  'epilepsy': 'neurology',
  'migraine': 'neurology',
  'headache': 'neurology',
  'tremor': 'neurology',
  'parkinson': 'neurology',
  'alzheimer': 'neurology',
  'dementia': 'neurology',
  'neuropathy': 'neurology',

  // Orthopedics
  'fracture': 'orthopedics',
  'broken bone': 'orthopedics',
  'joint pain': 'orthopedics',
  'arthritis': 'orthopedics',
  'osteoarthritis': 'orthopedics',
  'rheumatoid arthritis': 'orthopedics',
  'back pain': 'orthopedics',
  'spinal': 'orthopedics',
  'ligament': 'orthopedics',
  'tendon': 'orthopedics',

  // Pediatrics
  'child': 'pediatrics',
  'infant': 'pediatrics',
  'newborn': 'pediatrics',
  'developmental': 'pediatrics',
  'vaccination': 'pediatrics',
  'growth': 'pediatrics',

  // Dermatology
  'rash': 'dermatology',
  'skin': 'dermatology',
  'acne': 'dermatology',
  'eczema': 'dermatology',
  'psoriasis': 'dermatology',
  'dermatitis': 'dermatology',
  'mole': 'dermatology',
  'wart': 'dermatology',

  // Oncology
  'cancer': 'oncology',
  'tumor': 'oncology',
  'malignancy': 'oncology',
  'chemotherapy': 'oncology',
  'carcinoma': 'oncology',

  // Gastroenterology
  'abdominal pain': 'gastroenterology',
  'nausea': 'gastroenterology',
  'vomiting': 'gastroenterology',
  'diarrhea': 'gastroenterology',
  'constipation': 'gastroenterology',
  'gerd': 'gastroenterology',
  'acid reflux': 'gastroenterology',
  'ulcer': 'gastroenterology',
  'ibd': 'gastroenterology',
  'crohn': 'gastroenterology',
  'colitis': 'gastroenterology',
};

/**
 * Confidence scoring helper
 * Returns a score 0–1 based on match quality
 */
export function scoreConditionMatch(
  conditions: string[],
  specialtyId: string
): number {
  if (!conditions || conditions.length === 0) return 0;

  const matchingConditions = conditions.filter((cond) => {
    const normalized = cond.toLowerCase().trim();
    return CONDITION_TO_SPECIALTY_MAP[normalized] === specialtyId;
  });

  if (matchingConditions.length === 0) return 0;

  // Score: (matching conditions / total conditions) * 100, capped at 1.0
  return Math.min(matchingConditions.length / conditions.length, 1.0);
}
