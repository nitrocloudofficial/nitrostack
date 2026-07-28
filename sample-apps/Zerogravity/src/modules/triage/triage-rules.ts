/**
 * Triage Rules Engine
 * 
 * Defines red flags, their severity weights, and urgency thresholds.
 * This is the single source of truth for triage decision logic.
 * Adjust severity values (0-1 scale) to tune urgency scoring.
 */

export interface RedFlag {
  id: string;
  keywords: string[];
  severity: number; // 0-1 scale: 0 = low, 1 = emergency
  category: 'cardiac' | 'respiratory' | 'neurological' | 'hemorrhage' | 'trauma' | 'metabolic' | 'infectious' | 'other';
  description: string;
}

export const RED_FLAGS: RedFlag[] = [
  // CARDIAC EMERGENCIES
  {
    id: 'chest-pain',
    keywords: ['chest pain', 'chest discomfort', 'chest tightness', 'chest pressure', 'angina'],
    severity: 0.95,
    category: 'cardiac',
    description: 'Chest pain or discomfort (potential cardiac event)'
  },
  {
    id: 'heart-palpitations',
    keywords: ['palpitations', 'heart racing', 'heart pounding', 'irregular heartbeat', 'arrhythmia'],
    severity: 0.75,
    category: 'cardiac',
    description: 'Heart palpitations or irregular heartbeat'
  },

  // RESPIRATORY EMERGENCIES
  {
    id: 'difficulty-breathing',
    keywords: ['difficulty breathing', 'shortness of breath', 'dyspnea', 'can\'t breathe', 'gasping', 'wheezing', 'stridor'],
    severity: 0.95,
    category: 'respiratory',
    description: 'Difficulty breathing or severe shortness of breath'
  },
  {
    id: 'choking',
    keywords: ['choking', 'airway obstruction', 'can\'t swallow', 'throat closing'],
    severity: 1.0,
    category: 'respiratory',
    description: 'Choking or airway obstruction'
  },

  // NEUROLOGICAL EMERGENCIES
  {
    id: 'loss-of-consciousness',
    keywords: ['loss of consciousness', 'unconscious', 'passed out', 'fainted', 'syncope', 'unresponsive'],
    severity: 1.0,
    category: 'neurological',
    description: 'Loss of consciousness or unresponsiveness'
  },
  {
    id: 'sudden-numbness',
    keywords: ['sudden numbness', 'sudden weakness', 'paralysis', 'facial drooping', 'arm weakness', 'leg weakness'],
    severity: 0.9,
    category: 'neurological',
    description: 'Sudden numbness, weakness, or paralysis (stroke warning)'
  },
  {
    id: 'severe-headache',
    keywords: ['severe headache', 'worst headache of life', 'thunderclap headache', 'sudden severe headache'],
    severity: 0.85,
    category: 'neurological',
    description: 'Severe or sudden-onset headache'
  },
  {
    id: 'seizure',
    keywords: ['seizure', 'convulsion', 'epilepsy', 'fitting', 'tremors'],
    severity: 0.95,
    category: 'neurological',
    description: 'Seizure or convulsions'
  },

  // HEMORRHAGE / TRAUMA
  {
    id: 'severe-bleeding',
    keywords: ['severe bleeding', 'heavy bleeding', 'uncontrolled bleeding', 'hemorrhage', 'blood loss'],
    severity: 0.95,
    category: 'hemorrhage',
    description: 'Severe or uncontrolled bleeding'
  },
  {
    id: 'head-trauma',
    keywords: ['head injury', 'head trauma', 'hit head', 'head wound', 'skull fracture'],
    severity: 0.85,
    category: 'trauma',
    description: 'Head injury or trauma'
  },
  {
    id: 'abdominal-trauma',
    keywords: ['abdominal trauma', 'abdominal injury', 'blunt trauma', 'penetrating wound'],
    severity: 0.8,
    category: 'trauma',
    description: 'Abdominal trauma or injury'
  },

  // METABOLIC / TOXIC
  {
    id: 'severe-allergic-reaction',
    keywords: ['anaphylaxis', 'severe allergic reaction', 'throat swelling', 'tongue swelling', 'severe rash'],
    severity: 0.95,
    category: 'metabolic',
    description: 'Severe allergic reaction or anaphylaxis'
  },
  {
    id: 'poisoning',
    keywords: ['poisoning', 'overdose', 'toxic ingestion', 'drug overdose', 'medication overdose'],
    severity: 0.9,
    category: 'metabolic',
    description: 'Poisoning or overdose'
  },

  // INFECTIOUS
  {
    id: 'high-fever',
    keywords: ['high fever', 'fever over 103', 'fever over 39', 'fever with confusion'],
    severity: 0.7,
    category: 'infectious',
    description: 'High fever (>103°F / >39°C)'
  },
  {
    id: 'meningitis-signs',
    keywords: ['stiff neck', 'neck stiffness', 'meningitis', 'meningeal signs', 'photophobia'],
    severity: 0.9,
    category: 'infectious',
    description: 'Signs of meningitis (stiff neck, fever, confusion)'
  },

  // OTHER SERIOUS CONDITIONS
  {
    id: 'chest-injury',
    keywords: ['chest injury', 'rib fracture', 'pneumothorax', 'collapsed lung'],
    severity: 0.85,
    category: 'trauma',
    description: 'Chest injury or rib fracture'
  },
  {
    id: 'severe-abdominal-pain',
    keywords: ['severe abdominal pain', 'acute abdomen', 'appendicitis', 'peritonitis'],
    severity: 0.75,
    category: 'other',
    description: 'Severe abdominal pain'
  },
  {
    id: 'vision-loss',
    keywords: ['sudden vision loss', 'sudden blindness', 'eye pain with vision loss'],
    severity: 0.8,
    category: 'neurological',
    description: 'Sudden vision loss'
  },
  {
    id: 'speech-difficulty',
    keywords: ['slurred speech', 'difficulty speaking', 'speech problems', 'aphasia'],
    severity: 0.8,
    category: 'neurological',
    description: 'Slurred speech or difficulty speaking'
  }
];

/**
 * Urgency thresholds based on cumulative red flag severity score
 * Score is calculated as: max(red_flag_severities) + sum(other_flag_severities) * 0.1
 */
export const SEVERITY_THRESHOLDS = {
  emergency: 0.85,    // Score >= 0.85 → EMERGENCY
  high: 0.65,         // Score >= 0.65 → HIGH
  medium: 0.40,       // Score >= 0.40 → MEDIUM
  low: 0.0            // Score < 0.40 → LOW
};

/**
 * Helper function to find matching red flags in symptom text
 */
export function detectRedFlags(symptomText: string): RedFlag[] {
  const lowerText = symptomText.toLowerCase();
  const detected: RedFlag[] = [];
  const seenIds = new Set<string>();

  for (const flag of RED_FLAGS) {
    for (const keyword of flag.keywords) {
      if (lowerText.includes(keyword.toLowerCase()) && !seenIds.has(flag.id)) {
        detected.push(flag);
        seenIds.add(flag.id);
        break;
      }
    }
  }

  return detected;
}

/**
 * Calculate urgency score from detected red flags
 * Returns a score 0-1 that can be compared against SEVERITY_THRESHOLDS
 */
export function calculateSeverityScore(detectedFlags: RedFlag[]): number {
  if (detectedFlags.length === 0) return 0;

  // Primary score: highest severity flag
  const maxSeverity = Math.max(...detectedFlags.map(f => f.severity));

  // Secondary boost: sum of other flags (weighted down)
  const otherFlagsBoost = detectedFlags
    .filter(f => f.severity < maxSeverity)
    .reduce((sum, f) => sum + f.severity * 0.1, 0);

  return Math.min(1, maxSeverity + otherFlagsBoost);
}

/**
 * Determine urgency level from severity score
 */
export function getUrgencyLevel(score: number): 'low' | 'medium' | 'high' | 'emergency' {
  if (score >= SEVERITY_THRESHOLDS.emergency) return 'emergency';
  if (score >= SEVERITY_THRESHOLDS.high) return 'high';
  if (score >= SEVERITY_THRESHOLDS.medium) return 'medium';
  return 'low';
}
