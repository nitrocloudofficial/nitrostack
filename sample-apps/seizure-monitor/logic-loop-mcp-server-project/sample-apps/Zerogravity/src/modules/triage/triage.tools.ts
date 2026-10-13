import { ToolDecorator as Tool, ExecutionContext, z, Injectable, Widget } from '@nitrostack/core';
import { TriageService } from './triage.service.js';
import {
  AnalyzeSymptomsInput,
  SymptomAnalysisResult,
  ScoreUrgencyInput,
  UrgencyResult
} from './triage.types.js';

@Injectable({ deps: [TriageService] })
export class TriageTools {
  constructor(private triageService: TriageService) {}

  /**
   * Analyze patient symptoms to detect red flags and suggest candidate conditions
   */
  @Tool({
    name: 'analyze-symptoms',
    description: 'Analyze patient symptoms to detect red flags, candidate conditions, and confidence score. Takes patient ID and free-text symptom description.',
    inputSchema: z.object({
      patientId: z.string().describe('The unique ID of the patient'),
      recordId: z.string().optional().describe('The intake record ID (optional, for linking to visit summary)'),
      symptomDescription: z.string().describe('Free-text description of the patient\'s symptoms')
    }),
    examples: {
      request: {
        patientId: 'patient-001',
        recordId: 'intake-001',
        symptomDescription: 'I have severe chest pain and shortness of breath'
      },
      response: {
        patientId: 'patient-001',
        recordId: 'intake-001',
        symptomDescription: 'I have severe chest pain and shortness of breath',
        detectedRedFlags: [
          {
            id: 'chest-pain',
            keywords: ['chest pain', 'chest discomfort'],
            severity: 0.95,
            category: 'cardiac',
            description: 'Chest pain or discomfort (potential cardiac event)'
          },
          {
            id: 'difficulty-breathing',
            keywords: ['difficulty breathing', 'shortness of breath'],
            severity: 0.95,
            category: 'respiratory',
            description: 'Difficulty breathing or severe shortness of breath'
          }
        ],
        candidateConditions: [
          {
            name: 'Acute Coronary Syndrome / Myocardial Infarction',
            specialty: 'Cardiology',
            confidence: 0.9,
            reasoning: 'Chest pain and palpitations are classic cardiac symptoms'
          }
        ],
        confidenceScore: 0.95,
        timestamp: '2026-07-17T13:00:00.000Z'
      }
    }
  })
  @Widget({ route: 'symptom-analysis' })
  async analyzeSymptoms(
    input: AnalyzeSymptomsInput,
    context: ExecutionContext
  ): Promise<SymptomAnalysisResult> {
    context.logger.info(`Analyzing symptoms for patient ${input.patientId}`);
    const result = this.triageService.analyzeSymptoms(input);
    return result;
  }

  /**
   * Score urgency level based on symptom analysis results
   */
  @Tool({
    name: 'score-urgency',
    description: 'Score urgency level (low/medium/high/emergency) based on symptom analysis. Returns a clear rules-engine rationale with red flag severity weights.',
    inputSchema: z.object({
      recordId: z.string().optional().describe('The intake record ID (optional, for linking to visit summary)'),
      analysis: z.object({
        patientId: z.string(),
        symptomDescription: z.string(),
        detectedRedFlags: z.array(
          z.object({
            id: z.string(),
            keywords: z.array(z.string()),
            severity: z.number(),
            category: z.string(),
            description: z.string()
          })
        ),
        candidateConditions: z.array(
          z.object({
            name: z.string(),
            specialty: z.string(),
            confidence: z.number(),
            reasoning: z.string()
          })
        ),
        confidenceScore: z.number(),
        timestamp: z.string()
      }).describe('The symptom analysis result from analyze-symptoms tool')
    }),
    examples: {
      request: {
        recordId: 'intake-001',
        analysis: {
          patientId: 'patient-001',
          recordId: 'intake-001',
          symptomDescription: 'I have severe chest pain and shortness of breath',
          detectedRedFlags: [
            {
              id: 'chest-pain',
              keywords: ['chest pain'],
              severity: 0.95,
              category: 'cardiac',
              description: 'Chest pain or discomfort'
            }
          ],
          candidateConditions: [
            {
              name: 'Acute Coronary Syndrome',
              specialty: 'Cardiology',
              confidence: 0.9,
              reasoning: 'Chest pain is a classic cardiac symptom'
            }
          ],
          confidenceScore: 0.95,
          timestamp: '2026-07-17T13:00:00.000Z'
        }
      },
      response: {
        urgencyLevel: 'emergency',
        severityScore: 0.95,
        rationale: 'EMERGENCY: Critical red flags detected (Chest pain or discomfort, Difficulty breathing). Patient requires immediate emergency medical attention.',
        emergencyCareAdvised: true,
        recommendedActions: [
          'Call 911 or go to the nearest emergency room immediately',
          'Do not drive yourself; use ambulance or have someone drive you',
          'Inform emergency staff of all detected red flags'
        ],
        detectedRedFlags: [
          {
            id: 'chest-pain',
            description: 'Chest pain or discomfort (potential cardiac event)',
            severity: 0.95,
            category: 'cardiac'
          }
        ]
      }
    }
  })
  @Widget({ route: 'urgency-score' })
  async scoreUrgency(
    input: ScoreUrgencyInput,
    context: ExecutionContext
  ): Promise<UrgencyResult> {
    context.logger.info(`Scoring urgency for patient ${input.analysis.patientId}`);
    const result = this.triageService.scoreUrgency(input);
    return result;
  }
}
