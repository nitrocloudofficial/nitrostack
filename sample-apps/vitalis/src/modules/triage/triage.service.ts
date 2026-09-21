/**
 * TriageService — Rule-based symptom triage engine.
 * Embedded ruleset, deterministic computation, fail-safe defaults.
 */
import { Injectable } from '@nitrostack/core';
import { loadDataJson } from '../../data/load-json.js';

const redFlagData = loadDataJson('red-flag-rules.json') as {
  rules?: unknown;
  emergency_terms?: unknown;
};
const symptomMapData = loadDataJson('symptom-condition-map.json') as { mappings?: unknown };

function validateTriageData(): void {
  if (!Array.isArray(redFlagData.rules) || redFlagData.rules.length < 30) {
    throw new Error('[TriageService] Fatal: red-flag-rules.json must contain at least 30 rules.');
  }
  if (!Array.isArray(redFlagData.emergency_terms) || redFlagData.emergency_terms.length === 0) {
    throw new Error('[TriageService] Fatal: red-flag-rules.json must contain emergency terms.');
  }
  if (!Array.isArray(symptomMapData.mappings)) {
    throw new Error('[TriageService] Fatal: symptom-condition-map.json must contain mappings.');
  }
  for (const rule of redFlagData.rules as Array<Record<string, unknown>>) {
    if (
      typeof rule.id !== 'string' ||
      typeof rule.name !== 'string' ||
      !Array.isArray(rule.keywords) ||
      typeof rule.urgency_tier !== 'string' ||
      typeof rule.reason !== 'string'
    ) {
      throw new Error('[TriageService] Fatal: invalid rule shape in red-flag-rules.json.');
    }
  }
}

validateTriageData();

export type UrgencyTier = 'emergency' | 'urgent' | 'routine' | 'self_care';

export interface RedFlagMatch {
  flag: string;
  reason: string;
  urgency_tier: UrgencyTier;
  condition_name?: string;
  icd10?: string;
}

export interface PossibleCondition {
  name: string;
  likelihood_band: 'common' | 'possible' | 'rare';
  icd10?: string;
}

@Injectable({})
export class TriageService {
  private readonly rules: Array<{
    id: string;
    name: string;
    keywords: string[];
    urgency_tier: UrgencyTier;
    reason: string;
    icd10?: string;
    condition_name?: string;
  }> = redFlagData.rules as any;

  private readonly symptomMap: Array<{
    symptom: string;
    conditions: PossibleCondition[];
  }> = symptomMapData.mappings as any;

  /** Fast red flag check for emergency screening. */
  checkRedFlags(symptoms: string[]): {
    is_emergency: boolean;
    matched_red_flags: Array<{ flag: string; reason: string }>;
    recommended_action: string;
  } {
    try {
      const text = symptoms.join(' ').toLowerCase();
      const matched: Array<{ flag: string; reason: string }> = [];

      for (const rule of this.rules) {
        if (rule.urgency_tier === 'emergency') {
          const hit = rule.keywords.some((kw) => text.includes(kw.toLowerCase()));
          if (hit) {
            matched.push({ flag: rule.name, reason: rule.reason });
          }
        }
      }

      if (matched.length > 0) {
        return {
          is_emergency: true,
          matched_red_flags: matched,
          recommended_action:
            'Call emergency services (911 / 112 / 108) or go to the nearest emergency department immediately.',
        };
      }

      return {
        is_emergency: false,
        matched_red_flags: [],
        recommended_action: 'No immediate red-flag emergency criteria matched. Proceed with standard assessment.',
      };
    } catch {
      // Fail-safe posture: any engine error -> treat as emergency
      return {
        is_emergency: true,
        matched_red_flags: [
          {
            flag: 'System Evaluation Failure',
            reason: 'Triage ruleset engine encountered an unexpected error. Defaulting to safe emergency posture.',
          },
        ],
        recommended_action: 'Seek emergency care immediately or consult a medical provider.',
      };
    }
  }

  /** Full symptom assessment. */
  assessSymptoms(params: {
    symptoms: string[];
    age: number;
    age_months?: number;
    sex: 'male' | 'female' | 'other';
    duration_hours?: number;
    severity?: number;
  }): {
    urgency_tier: UrgencyTier;
    red_flags: Array<{ flag: string; reason: string }>;
    possible_conditions: PossibleCondition[];
    guidance: string;
    follow_up_questions: string[];
    recommended_timeframe: string;
  } {
    try {
      const { symptoms, duration_hours = 0, severity = 5 } = params;
      const text = symptoms.join(' ').toLowerCase();

      const matchedFlags: RedFlagMatch[] = [];

      for (const rule of this.rules) {
        const hit = rule.keywords.some((kw) => text.includes(kw.toLowerCase()));
        if (hit) {
          matchedFlags.push({
            flag: rule.name,
            reason: rule.reason,
            urgency_tier: rule.urgency_tier,
            condition_name: rule.condition_name,
            icd10: rule.icd10,
          });
        }
      }

      // Use explicit months when provided; otherwise accept decimal age in years
      // so the infant safety branch is reachable through the MCP schema.
      const isInfantUnderThreeMonths =
        params.age_months !== undefined ? params.age_months < 3 : params.age <= 0.25;
      if (isInfantUnderThreeMonths && text.includes('fever')) {
        matchedFlags.push({
          flag: 'Infant Fever (< 3 Months)',
          reason: 'High risk of serious occult bacterial infection in infants under 3 months.',
          urgency_tier: 'emergency',
          condition_name: 'Serious Infant Infection',
        });
      }

      // Determine Urgency Tier
      let tier: UrgencyTier = 'self_care';

      const hasEmergency = matchedFlags.some((f) => f.urgency_tier === 'emergency');
      const urgentCount = matchedFlags.filter((f) => f.urgency_tier === 'urgent').length;
      const routineCount = matchedFlags.filter((f) => f.urgency_tier === 'routine').length;

      if (hasEmergency) {
        tier = 'emergency';
      } else if (urgentCount >= 1 || severity >= 7 || (duration_hours >= 72 && severity >= 5)) {
        tier = 'urgent';
      } else if (routineCount >= 1 || duration_hours >= 48) {
        tier = 'routine';
      } else {
        tier = 'self_care';
      }

      // Find possible candidate conditions
      const possibleConditions: PossibleCondition[] = [];
      for (const s of symptoms) {
        const sLow = s.toLowerCase();
        const mapping = this.symptomMap.find((m) => sLow.includes(m.symptom) || m.symptom.includes(sLow));
        if (mapping) {
          for (const c of mapping.conditions) {
            if (!possibleConditions.some((pc) => pc.name === c.name)) {
              possibleConditions.push(c);
            }
          }
        }
      }

      // Add candidates from matched rules as well as the symptom map. This
      // keeps rule-driven emergency findings visible even when a symptom has
      // no separate map entry.
      for (const match of matchedFlags) {
        if (match.condition_name && !possibleConditions.some((condition) => condition.name === match.condition_name)) {
          possibleConditions.push({
            name: match.condition_name,
            likelihood_band: 'possible',
            icd10: match.icd10,
          });
        }
      }

      // Guidance & Timeframe per tier
      let guidance = '';
      let recommendedTimeframe = '';
      const followUpQuestions: string[] = [];

      switch (tier) {
        case 'emergency':
          guidance =
            'Red-flag symptoms detected. Immediate clinical evaluation is required. Do not drive yourself; call emergency services.';
          recommendedTimeframe = 'Immediate (Call 911 / 112 / 108)';
          followUpQuestions.push(
            'Are you currently accompanied by someone who can assist you?',
            'Has your level of consciousness or breathing changed in the last 10 minutes?',
          );
          break;
        case 'urgent':
          guidance =
            'Your symptoms warrant evaluation by a healthcare provider today. Consider visiting an urgent care clinic or requesting a same-day appointment.';
          recommendedTimeframe = 'Same-day evaluation (Within 12-24 hours)';
          followUpQuestions.push(
            'Are symptoms progressively worsening?',
            'Do you have any underlying chronic conditions such as diabetes or immunosuppression?',
          );
          break;
        case 'routine':
          guidance =
            'Symptoms do not appear immediately critical but should be evaluated by your primary care physician within a few days.';
          recommendedTimeframe = 'Within 3-5 days';
          followUpQuestions.push(
            'Have you tried any over-the-counter remedies, and did they provide relief?',
            'Have you experienced similar episodes in the past?',
          );
          break;
        case 'self_care':
          guidance =
            'Symptoms appear consistent with a mild, self-limiting condition. Focus on hydration, rest, and monitoring for escalation.';
          recommendedTimeframe = 'Self-care at home; seek care if symptoms persist > 7 days or worsen';
          followUpQuestions.push(
            'Are you able to stay hydrated and maintain oral intake?',
            'Do you know what red-flag symptoms to watch for that would require medical evaluation?',
          );
          break;
      }

      return {
        urgency_tier: tier,
        red_flags: matchedFlags.map((m) => ({ flag: m.flag, reason: m.reason })),
        possible_conditions: possibleConditions,
        guidance,
        follow_up_questions: followUpQuestions,
        recommended_timeframe: recommendedTimeframe,
      };
    } catch {
      // Fail-safe default: return urgent posture on error
      return {
        urgency_tier: 'urgent',
        red_flags: [
          {
            flag: 'Assessment Error',
            reason: 'Triage engine encountered an internal evaluation error. Defaulting to safe urgent recommendation.',
          },
        ],
        possible_conditions: [],
        guidance: 'An error occurred during symptom assessment. Please consult a qualified clinician for evaluation.',
        follow_up_questions: ['Would you like to search for local urgent care facilities?'],
        recommended_timeframe: 'Same-day clinical evaluation recommended.',
      };
    }
  }

  /** Care pathway options mapping. */
  getCareOptions(urgencyTier: UrgencyTier, condition?: string) {
    const optionsMap: Record<
      UrgencyTier,
      Array<{ type: string; timeframe: string; preparation: string[] }>
    > = {
      emergency: [
        {
          type: 'Emergency Department / 911 Call',
          timeframe: 'Immediate',
          preparation: [
            'Do not drive yourself if experiencing severe pain, shortness of breath, or dizziness.',
            'Gather current medication list or bottle if readily available.',
            'Notify emergency contacts immediately.',
          ],
        },
      ],
      urgent: [
        {
          type: 'Urgent Care Center',
          timeframe: 'Same day (within 4-12 hours)',
          preparation: [
            'Bring photo ID and insurance card if available.',
            'Document when symptoms started and any fever readings.',
            'Bring a list of all active medications and allergies.',
          ],
        },
        {
          type: 'Same-Day Primary Care Appointment',
          timeframe: 'Same day',
          preparation: ['Call clinic office directly and describe urgency level.'],
        },
      ],
      routine: [
        {
          type: 'Primary Care Physician (PCP)',
          timeframe: 'Within 2-5 days',
          preparation: [
            'Keep a daily log of symptom frequency and severity.',
            'Note any triggering or relieving factors.',
            'Prepare a list of questions for your doctor.',
          ],
        },
      ],
      self_care: [
        {
          type: 'Home Self-Care & OTC Support',
          timeframe: '1-7 days self-monitoring',
          preparation: [
            'Ensure adequate rest and fluid intake.',
            'Use OTC symptomatic medications strictly according to package guidelines.',
            'Monitor for red-flag escalation triggers (fever > 39.4°C, severe pain, shortness of breath).',
          ],
        },
      ],
    };

    const escalationCriteria = [
      'Development of acute chest pain or pressure',
      'Sudden onset of severe shortness of breath or noisy breathing',
      'Inability to keep fluids down for > 24 hours',
      'Confusion, lethargy, or extreme dizziness upon standing',
      'Fever > 39.4°C (103°F) that does not respond to antipyretics',
    ];

    return {
      care_options: optionsMap[urgencyTier] ?? optionsMap.urgent,
      escalation_criteria: escalationCriteria,
      condition_context: condition ?? null,
    };
  }
}
