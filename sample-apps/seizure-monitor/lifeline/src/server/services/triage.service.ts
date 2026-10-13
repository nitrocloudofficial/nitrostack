import { Injectable } from '@nitrostack/core';
import { SymptomTriageInput, SymptomTriageResult, EmergencyAssessment, SeverityLevel } from '../interfaces/index.js';
import { InvalidSymptomsError } from '../shared/app-error.js';
import { CAPABILITIES } from '../shared/constants.js';

interface TriageRule {
  department: string;
  severity: SeverityLevel;
  keywords: string[];
}

const BASE_CONFIDENCE_BY_SEVERITY: Record<SeverityLevel, number> = {
  Critical: 0.75,
  Severe: 0.65,
  Moderate: 0.55,
  Mild: 0.5,
};

const SEVERITY_RANK: Record<SeverityLevel, number> = {
  Critical: 3,
  Severe: 2,
  Moderate: 1,
  Mild: 0,
};

/**
 * Deterministic, rule-based emergency classifier. Each rule is a bank of
 * clinical keywords mapped to a department + severity; the rule with the
 * most keyword matches wins (ties broken by severity, then rule order).
 */
const TRIAGE_RULES: TriageRule[] = [
  {
    department: CAPABILITIES.CARDIAC_CATH_LAB,
    severity: 'Critical',
    keywords: [
      'chest pain',
      'crushing pain',
      'heart attack',
      'cardiac arrest',
      'tightness in chest',
      'left arm pain',
      'palpitations',
    ],
  },
  {
    department: CAPABILITIES.TRAUMA_LEVEL_1,
    severity: 'Critical',
    keywords: [
      'severe bleeding',
      'gunshot',
      'stabbed',
      'stab wound',
      'unconscious',
      'not breathing',
      'major accident',
      'car accident',
      'amputation',
      'severe trauma',
      'fell from height',
      'head injury',
    ],
  },
  {
    department: CAPABILITIES.STROKE_CENTER,
    severity: 'Critical',
    keywords: [
      'stroke',
      'face drooping',
      'slurred speech',
      'cannot speak',
      "can't speak",
      'sudden numbness',
      'sudden weakness',
      'sudden vision loss',
    ],
  },
  {
    department: CAPABILITIES.PEDIATRIC_ICU,
    severity: 'Severe',
    keywords: [
      'infant seizure',
      'baby not breathing',
      'child high fever',
      'newborn unresponsive',
      'infant unresponsive',
      'child difficulty breathing',
      'baby blue lips',
      'child seizure',
    ],
  },
  {
    department: CAPABILITIES.GENERAL_ER,
    severity: 'Moderate',
    keywords: ['fever', 'vomiting', 'abdominal pain', 'fracture', 'sprain', 'laceration', 'dizziness', 'persistent cough'],
  },
  {
    department: CAPABILITIES.GENERAL_ER,
    severity: 'Mild',
    keywords: ['minor cut', 'mild headache', 'common cold', 'sore throat', 'mild fever', 'rash'],
  },
];

const DEFAULT_ASSESSMENT: Omit<EmergencyAssessment, 'assessed_at'> = {
  severity: 'Moderate',
  requiredDepartment: CAPABILITIES.GENERAL_ER,
  confidence: 0.4,
  reasoning: 'No specific clinical keywords detected; routing to General ER for full evaluation.',
  matched_keywords: [],
};

@Injectable()
export class TriageService {
  triage(input: SymptomTriageInput): SymptomTriageResult {
    const symptomsText = input.symptoms?.trim();
    if (!symptomsText) {
      throw new InvalidSymptomsError();
    }

    const assessment = this.assess(symptomsText);
    return {
      severity: assessment.severity,
      requiredDepartment: assessment.requiredDepartment,
      confidence: assessment.confidence,
      reasoning: assessment.reasoning,
    };
  }

  private assess(symptomsText: string): EmergencyAssessment {
    const normalized = symptomsText.toLowerCase();

    let best: { rule: TriageRule; matches: string[] } | null = null;

    for (const rule of TRIAGE_RULES) {
      const matches = rule.keywords.filter((keyword) => normalized.includes(keyword));
      if (matches.length === 0) continue;

      if (
        !best ||
        matches.length > best.matches.length ||
        (matches.length === best.matches.length && SEVERITY_RANK[rule.severity] > SEVERITY_RANK[best.rule.severity])
      ) {
        best = { rule, matches };
      }
    }

    if (!best) {
      return { ...DEFAULT_ASSESSMENT, assessed_at: new Date().toISOString() };
    }

    const { rule, matches } = best;
    const confidence = Math.min(0.95, BASE_CONFIDENCE_BY_SEVERITY[rule.severity] + 0.08 * (matches.length - 1));

    return {
      severity: rule.severity,
      requiredDepartment: rule.department,
      confidence: Math.round(confidence * 100) / 100,
      reasoning: `Matched keyword(s): "${matches.join('", "')}" → classified as ${rule.severity} severity, routed to ${rule.department}.`,
      matched_keywords: matches,
      assessed_at: new Date().toISOString(),
    };
  }
}
