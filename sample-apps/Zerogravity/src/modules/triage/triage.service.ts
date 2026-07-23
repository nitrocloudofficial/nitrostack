import { Injectable } from '@nitrostack/core';
import { DataService } from '../../shared/services/data.service.js';
import {
  AnalyzeSymptomsInput,
  SymptomAnalysisResult,
  ScoreUrgencyInput,
  UrgencyResult,
  CandidateCondition
} from './triage.types.js';
import {
  detectRedFlags,
  calculateSeverityScore,
  getUrgencyLevel,
  RED_FLAGS
} from './triage-rules.js';

@Injectable({ deps: [DataService] })
export class TriageService {
  constructor(private dataService: DataService) {}

  /**
   * Analyze patient symptoms to detect red flags and suggest candidate conditions
   */
  analyzeSymptoms(input: AnalyzeSymptomsInput): SymptomAnalysisResult {
    const { patientId, recordId, symptomDescription } = input;

    // Detect red flags from symptom text
    const detectedRedFlags = detectRedFlags(symptomDescription);

    // Calculate confidence score based on red flags
    const confidenceScore = calculateSeverityScore(detectedRedFlags);

    // Generate candidate conditions based on keywords and patterns
    const candidateConditions = this.generateCandidateConditions(
      symptomDescription,
      detectedRedFlags
    );

    const timestamp = new Date().toISOString();

    // Store preliminary triage result if recordId is provided
    if (recordId) {
      const predictedCondition = candidateConditions.length > 0
        ? candidateConditions[0].name
        : 'General Medical Evaluation Required';
      const urgencyLevel = getUrgencyLevel(confidenceScore);

      this.dataService.storeTriageResult({
        patientId,
        recordId,
        predictedCondition,
        urgencyLevel,
        detectedRedFlags: detectedRedFlags.map(flag => ({
          id: flag.id,
          description: flag.description,
          severity: flag.severity,
          category: flag.category
        })),
        confidenceScore,
        timestamp
      });
    }

    return {
      patientId,
      recordId,
      symptomDescription,
      detectedRedFlags,
      candidateConditions,
      confidenceScore,
      timestamp
    };
  }

  /**
   * Score urgency level based on symptom analysis
   */
  scoreUrgency(input: any): UrgencyResult {
    const { analysis, recordId } = input;

    // Calculate severity score from detected red flags
    const severityScore = calculateSeverityScore(analysis.detectedRedFlags);

    // Determine urgency level
    const urgencyLevel = getUrgencyLevel(severityScore);

    // Generate rationale
    const rationale = this.generateRationale(analysis.detectedRedFlags, urgencyLevel);

    // Determine if emergency care is advised
    const emergencyCareAdvised = urgencyLevel === 'emergency';

    // Generate recommended actions
    const recommendedActions = this.generateRecommendedActions(urgencyLevel, analysis.detectedRedFlags);

    // Determine predicted condition from candidate conditions
    const predictedCondition = analysis.candidateConditions.length > 0
      ? analysis.candidateConditions[0].name
      : 'General Medical Evaluation Required';

    // Store triage result if recordId is provided
    if (recordId) {
      this.dataService.storeTriageResult({
        patientId: analysis.patientId,
        recordId,
        predictedCondition,
        urgencyLevel,
        detectedRedFlags: analysis.detectedRedFlags.map((flag: any) => ({
          id: flag.id,
          description: flag.description,
          severity: flag.severity,
          category: flag.category
        })),
        confidenceScore: analysis.confidenceScore,
        timestamp: new Date().toISOString()
      });
    }

    return {
      recordId,
      urgencyLevel,
      severityScore,
      rationale,
      emergencyCareAdvised,
      recommendedActions,
      detectedRedFlags: analysis.detectedRedFlags.map((flag: any) => ({
        id: flag.id,
        description: flag.description,
        severity: flag.severity,
        category: flag.category
      }))
    };
  }

  /**
   * Generate candidate conditions based on symptom keywords
   */
  private generateCandidateConditions(
    symptomText: string,
    redFlags: any[]
  ): CandidateCondition[] {
    const lowerText = symptomText.toLowerCase();
    const conditions: CandidateCondition[] = [];

    // Cardiac conditions
    if (
      lowerText.includes('chest pain') ||
      lowerText.includes('palpitations') ||
      lowerText.includes('heart racing')
    ) {
      conditions.push({
        name: 'Acute Coronary Syndrome / Myocardial Infarction',
        specialty: 'Cardiology',
        confidence: 0.9,
        reasoning: 'Chest pain and palpitations are classic cardiac symptoms'
      });
    }

    // Respiratory conditions
    if (
      lowerText.includes('shortness of breath') ||
      lowerText.includes('difficulty breathing') ||
      lowerText.includes('wheezing')
    ) {
      conditions.push({
        name: 'Acute Respiratory Distress / Asthma / Pneumonia',
        specialty: 'Pulmonology',
        confidence: 0.85,
        reasoning: 'Respiratory symptoms indicate pulmonary involvement'
      });
    }

    // Neurological conditions
    if (
      lowerText.includes('numbness') ||
      lowerText.includes('weakness') ||
      lowerText.includes('paralysis')
    ) {
      conditions.push({
        name: 'Stroke / Transient Ischemic Attack',
        specialty: 'Neurology',
        confidence: 0.88,
        reasoning: 'Sudden numbness/weakness are stroke warning signs'
      });
    }

    if (lowerText.includes('severe headache') || lowerText.includes('worst headache')) {
      conditions.push({
        name: 'Subarachnoid Hemorrhage / Meningitis',
        specialty: 'Neurology',
        confidence: 0.8,
        reasoning: 'Severe headache can indicate serious neurological condition'
      });
    }

    // Gastrointestinal conditions
    if (
      lowerText.includes('severe abdominal pain') ||
      lowerText.includes('acute abdomen')
    ) {
      conditions.push({
        name: 'Acute Abdomen / Appendicitis / Peritonitis',
        specialty: 'Gastroenterology',
        confidence: 0.75,
        reasoning: 'Severe abdominal pain requires urgent evaluation'
      });
    }

    // Allergic/Anaphylaxis
    if (
      lowerText.includes('anaphylaxis') ||
      lowerText.includes('severe allergic') ||
      lowerText.includes('throat swelling')
    ) {
      conditions.push({
        name: 'Anaphylaxis / Severe Allergic Reaction',
        specialty: 'Emergency Medicine',
        confidence: 0.95,
        reasoning: 'Anaphylaxis is a life-threatening emergency'
      });
    }

    // Infectious conditions
    if (lowerText.includes('high fever') || lowerText.includes('stiff neck')) {
      conditions.push({
        name: 'Meningitis / Sepsis',
        specialty: 'Infectious Disease',
        confidence: 0.8,
        reasoning: 'Fever with stiff neck suggests meningitis'
      });
    }

    // Trauma
    if (
      lowerText.includes('head injury') ||
      lowerText.includes('head trauma') ||
      lowerText.includes('hit head')
    ) {
      conditions.push({
        name: 'Traumatic Brain Injury / Intracranial Hemorrhage',
        specialty: 'Neurology',
        confidence: 0.85,
        reasoning: 'Head trauma requires neurological assessment'
      });
    }

    // If no specific conditions matched, return generic assessment
    if (conditions.length === 0) {
      conditions.push({
        name: 'General Medical Evaluation Required',
        specialty: 'Internal Medicine',
        confidence: 0.5,
        reasoning: 'Symptoms require further evaluation by primary care'
      });
    }

    return conditions;
  }

  /**
   * Generate human-readable rationale for urgency level
   */
  private generateRationale(redFlags: any[], urgencyLevel: string): string {
    if (urgencyLevel === 'emergency') {
      const flagDescriptions = redFlags
        .slice(0, 3)
        .map(f => f.description)
        .join(', ');
      return `EMERGENCY: Critical red flags detected (${flagDescriptions}). Patient requires immediate emergency medical attention.`;
    }

    if (urgencyLevel === 'high') {
      const flagDescriptions = redFlags
        .slice(0, 2)
        .map(f => f.description)
        .join(', ');
      return `HIGH URGENCY: Serious symptoms detected (${flagDescriptions}). Patient should seek urgent medical evaluation today.`;
    }

    if (urgencyLevel === 'medium') {
      return 'MEDIUM URGENCY: Patient should schedule a medical appointment within 24-48 hours for evaluation.';
    }

    return 'LOW URGENCY: Symptoms appear mild. Patient should monitor and contact primary care if symptoms worsen.';
  }

  /**
   * Generate recommended actions based on urgency level
   */
  private generateRecommendedActions(
    urgencyLevel: string,
    redFlags: any[]
  ): string[] {
    const actions: string[] = [];

    if (urgencyLevel === 'emergency') {
      actions.push('Call 911 or go to the nearest emergency room immediately');
      actions.push('Do not drive yourself; use ambulance or have someone drive you');
      actions.push('Inform emergency staff of all detected red flags');
      return actions;
    }

    if (urgencyLevel === 'high') {
      actions.push('Seek urgent care or emergency department evaluation today');
      actions.push('Contact your primary care physician immediately');
      actions.push('Do not delay seeking medical attention');
      return actions;
    }

    if (urgencyLevel === 'medium') {
      actions.push('Schedule an appointment with your primary care physician');
      actions.push('Monitor symptoms closely');
      actions.push('Seek immediate care if symptoms worsen or new red flags appear');
      return actions;
    }

    actions.push('Monitor symptoms');
    actions.push('Rest and maintain hydration');
    actions.push('Contact primary care if symptoms persist or worsen');
    return actions;
  }
}
