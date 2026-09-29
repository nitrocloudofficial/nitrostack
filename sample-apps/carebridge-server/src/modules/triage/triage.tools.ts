import { ToolDecorator as Tool, Widget, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { MongoService } from '../../data/mongo.service.js';
import { DETERMINISTIC_RED_FLAGS, TriageEvaluationResult, TriageQuestion } from './triage.types.js';

/**
 * Helper to check if a red flag keyword is present and NOT negated in the input text.
 * E.g., "no chest pain", "denies shortness of breath", "without dizziness" will NOT trigger.
 */
export function isKeywordTriggered(text: string, keyword: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  let searchPos = 0;
  while (searchPos < lowerText.length) {
    const foundIdx = lowerText.indexOf(lowerKeyword, searchPos);
    if (foundIdx === -1) return false;

    // Check preceding 35 chars for negation words
    const prefix = lowerText.slice(Math.max(0, foundIdx - 35), foundIdx);
    const negationPattern = /\b(no|not|without|denies|denied|absence of|negative for|free of|rules out|ruled out)\b[\w\s,]{0,25}$/i;

    if (!negationPattern.test(prefix)) {
      return true;
    }

    searchPos = foundIdx + lowerKeyword.length;
  }

  return false;
}

/**
 * Triage AI Tools Provider
 * Person 2 Lead
 * MongoDB Vector Search & Clinical Knowledge Base Integrated
 */
@Injectable()
export class TriageTools {
  constructor(private mongoService: MongoService = new MongoService()) {}

  @Tool({
    name: 'search_clinical_knowledge',
    description: 'Performs semantic vector and keyword search over medical clinical guidelines, SNOMED-CT triage rules, and evidence-backed protocols stored in MongoDB Atlas.',
    inputSchema: z.object({
      query: z.string().describe('Symptom, condition, or medical phrase to search, e.g., "crushing chest pain" or "fatigue with low hemoglobin"'),
    }),
  })
  async searchClinicalKnowledge(
    input: { query: string },
    _context: ExecutionContext
  ) {
    const guidelines = await this.mongoService.searchClinicalKnowledge(input.query);
    return {
      status: 'success',
      query: input.query,
      resultsCount: guidelines.length,
      guidelines,
    };
  }

  @Tool({
    name: 'check_red_flags',
    description: 'Screens user reported symptoms against deterministic medical red-flag safety rules to identify emergency or urgent conditions. This is a deterministic check — the LLM cannot override results.',
    inputSchema: z.object({
      symptoms: z.array(z.string()).describe('List of symptoms reported by the patient'),
      notes: z.string().optional().describe('Additional contextual notes or clinical remarks'),
    }),
  })
  @Widget('triage-result')
  async checkRedFlags(
    input: { symptoms: string[]; notes?: string },
    _context: ExecutionContext
  ): Promise<TriageEvaluationResult> {
    const safeSymptoms = Array.isArray(input.symptoms) ? input.symptoms : [];
    const safeNotes    = typeof input.notes === 'string' ? input.notes : '';

    const MAX_LEN = 2000;
    const symptomText = safeSymptoms
      .map(s => (typeof s === 'string' ? s.slice(0, MAX_LEN) : ''))
      .join(' ')
      .toLowerCase()
      + (safeNotes ? ' ' + safeNotes.slice(0, MAX_LEN).toLowerCase() : '');

    const matchedRedFlags: string[] = [];
    let isEmergency = false;
    let isUrgent = false;

    // Deterministic red-flag check — fixed keyword matching with negation handling
    for (const rule of DETERMINISTIC_RED_FLAGS) {
      for (const keyword of rule.triggerKeywords) {
        if (isKeywordTriggered(symptomText, keyword)) {
          matchedRedFlags.push(`${rule.id}: ${keyword} (${rule.category})`);
          if (rule.category === 'Emergency') isEmergency = true;
          if (rule.category === 'Urgent') isUrgent = true;
        }
      }
    }

    const isRedFlagTriggered = matchedRedFlags.length > 0;

    const urgency: TriageEvaluationResult['urgency'] = isEmergency
      ? 'Emergency'
      : isUrgent
      ? 'Urgent'
      : 'Routine evaluation';

    const recommendedAction = isEmergency
      ? 'Call emergency medical services immediately (911/112).'
      : isUrgent
      ? 'Seek same-day clinical evaluation at an urgent care center or clinic.'
      : 'Schedule a routine appointment with your primary care provider within 48-72 hours.';

    const escalationFactors: string[] = isRedFlagTriggered
      ? matchedRedFlags
      : ['Persistent fatigue lasting > 7 days', 'Concomitant drop in baseline activity'];

    return {
      urgency,
      isRedFlagTriggered,
      matchedRedFlags,
      escalationFactors,
      recommendedAction,
      disclaimer: 'DISCLAIMER: CareBridge AI provides medical triage and care navigation guidance only. This output does NOT constitute a definitive medical diagnosis. Always consult a qualified healthcare professional.'
    };
  }

  @Tool({
    name: 'start_triage',
    description: 'Initiates adaptive triage conversation flow and evaluates urgency category with escalation factors.',
    inputSchema: z.object({
      symptoms: z.array(z.string()).describe('Initial list of symptoms'),
      answers: z.record(z.string()).optional().describe('Map of question IDs to patient responses'),
    }),
  })
  @Widget('triage-result')
  async startTriage(
    input: { symptoms: string[]; answers?: Record<string, string> },
    _context: ExecutionContext
  ) {
    const safeSymptoms = Array.isArray(input.symptoms) ? input.symptoms.filter(s => typeof s === 'string' && s.trim().length > 0) : [];

    const followUpQuestions: TriageQuestion[] = [];

    if (!input.answers || Object.keys(input.answers).length === 0) {
      followUpQuestions.push(
        {
          id: 'Q1',
          questionText: 'How long have you been experiencing these symptoms?',
          options: ['Less than 24 hours', '1-3 days', '4-7 days', 'More than a week'],
        },
        {
          id: 'Q2',
          questionText: 'Are you experiencing any shortness of breath, chest pressure, or lightheadedness?',
          options: ['Yes, severe', 'Yes, mild', 'No'],
        },
        {
          id: 'Q3',
          questionText: 'Has fatigue been affecting your ability to carry out daily activities?',
          options: ['Not at all', 'Mildly', 'Moderately', 'Severely'],
        }
      );
    }

    const symptomText = safeSymptoms.join(' ').toLowerCase();

    let urgency: 'Emergency' | 'Urgent' | 'Routine evaluation' | 'Monitor/self-care' = 'Routine evaluation';
    if (isKeywordTriggered(symptomText, 'chest pain') || isKeywordTriggered(symptomText, 'fainting') || isKeywordTriggered(symptomText, 'unable to breathe')) {
      urgency = 'Emergency';
    } else if (isKeywordTriggered(symptomText, 'severe shortness of breath') || (isKeywordTriggered(symptomText, 'dizziness') && isKeywordTriggered(symptomText, 'severe'))) {
      urgency = 'Urgent';
    }

    if (safeSymptoms.length === 0) {
      return {
        triageStatus: 'awaiting_symptoms',
        currentUrgency: 'Monitor/self-care' as const,
        reportedSymptoms: [],
        followUpQuestions: [{
          id: 'Q0',
          questionText: 'Please describe your main health concern or symptom.',
          options: ['Fatigue / tiredness', 'Chest discomfort', 'Shortness of breath', 'Dizziness', 'Other'],
        }],
        escalationFactors: [],
        disclaimer: 'DISCLAIMER: CareBridge AI provides medical triage and care navigation guidance only. This output does NOT constitute a definitive medical diagnosis.',
      };
    }

    return {
      triageStatus: 'in_progress',
      currentUrgency: urgency,
      reportedSymptoms: safeSymptoms,
      followUpQuestions,
      escalationFactors: [
        'Fatigue reported combined with sleep reduction',
        'Heart rate elevation during rest (+12 bpm)',
      ],
      disclaimer: 'DISCLAIMER: CareBridge AI provides medical triage and care navigation guidance only. This output does NOT constitute a definitive medical diagnosis.',
    };
  }
}
