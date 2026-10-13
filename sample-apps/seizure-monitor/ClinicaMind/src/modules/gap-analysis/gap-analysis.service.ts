import { Injectable } from '@nitrostack/core';

export interface GapAnalysisResult {
  missingRiskFactors: string[];
  suggestedQuestions: string[];
  clinicalRationale: string;
}

@Injectable({ deps: [] })
export class GapAnalysisService {
  analyzeGaps(symptoms: string[], historyConditions: string[] = []): GapAnalysisResult {
    const sLower = symptoms.map((s) => s.toLowerCase());
    const missing: string[] = [];
    const questions: string[] = [];

    if (sLower.some((s) => s.includes('chest pain') || s.includes('cough'))) {
      missing.push('Smoking & Tobacco History');
      questions.push('Have you ever smoked or been exposed to occupational lung irritants?');

      missing.push('Recent Travel & Exposure');
      questions.push('Have you traveled outside the country or been exposed to sick individuals recently?');

      missing.push('Onset & Sputum Production');
      questions.push('Is the cough productive of colored sputum or accompanied by shortness of breath?');
    } else if (sLower.some((s) => s.includes('headache') || s.includes('runny nose'))) {
      missing.push('Duration of Symptoms');
      questions.push('How many days have you experienced these symptoms?');

      missing.push('Fever spikes');
      questions.push('Have you measured your body temperature at home?');
    } else {
      missing.push('Comprehensive ROS (Review of Systems)');
      questions.push('Are there any other associated symptoms such as chills, fatigue, or weight loss?');
    }

    return {
      missingRiskFactors: missing,
      suggestedQuestions: questions,
      clinicalRationale: 'Identifying missing clinical risk factors prevents diagnostic bias and ensures thorough documentation for risk stratification.'
    };
  }
}
