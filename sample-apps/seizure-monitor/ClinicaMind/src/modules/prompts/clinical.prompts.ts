import { PromptDecorator as Prompt, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable()
export class ClinicalPromptsService {

  @Prompt({
    name: 'clinical_reasoning',
    description: 'System prompt template for clinical reasoning, chief complaint synthesis, and diagnostic evaluation.',
    arguments: [
      { name: 'patientId', description: 'Target Patient ID', required: true },
      { name: 'transcript', description: 'Consultation transcript text', required: true }
    ]
  })
  async getClinicalReasoningPrompt(args: { patientId: string; transcript: string }, ctx: ExecutionContext) {
    return {
      messages: [
        {
          role: 'system',
          content: `You are an expert Clinical Intelligence AI Assistant. Analyze the following patient consultation transcript for patient ID ${args.patientId}. Extract subjective symptoms, objective signs, risk indicators, and form a structured diagnostic reasoning outline.`
        },
        {
          role: 'user',
          content: `Consultation Transcript:\n"${args.transcript}"`
        }
      ]
    };
  }

  @Prompt({
    name: 'medication_safety',
    description: 'Prompt template for evaluating drug interactions, renal dosing, and contraindications.',
    arguments: [
      { name: 'medications', description: 'Comma-separated medication names', required: true },
      { name: 'allergies', description: 'Documented allergies', required: false }
    ]
  })
  async getMedicationSafetyPrompt(args: { medications: string; allergies?: string }, ctx: ExecutionContext) {
    return {
      messages: [
        {
          role: 'system',
          content: `You are a Clinical Pharmacologist AI. Conduct a medication safety review for the following regimen. Identify any severe drug-drug interactions, allergy risks, or dosing contraindications.`
        },
        {
          role: 'user',
          content: `Medications: ${args.medications}\nKnown Allergies: ${args.allergies || 'None documented'}`
        }
      ]
    };
  }

  @Prompt({
    name: 'differential_diagnosis',
    description: 'Prompt template for generating ranked differential diagnoses with ICD-10 codes and rationale.',
    arguments: [
      { name: 'symptoms', description: 'Patient presented symptoms', required: true }
    ]
  })
  async getDifferentialDiagnosisPrompt(args: { symptoms: string }, ctx: ExecutionContext) {
    return {
      messages: [
        {
          role: 'system',
          content: `You are a Senior Attending Physician AI. Synthesize a ranked differential diagnosis list based on the presented clinical symptoms. Provide ICD-10 codes, probability tiers, and clinical reasoning for each.`
        },
        {
          role: 'user',
          content: `Patient Symptoms: ${args.symptoms}`
        }
      ]
    };
  }

  @Prompt({
    name: 'followup_recommendation',
    description: 'Prompt template for synthesizing outpatient care plans and follow-up clinical protocols.',
    arguments: [
      { name: 'diagnosis', description: 'Confirmed or suspected diagnosis', required: true },
      { name: 'riskLevel', description: 'Patient assessed risk category', required: false }
    ]
  })
  async getFollowupRecommendationPrompt(args: { diagnosis: string; riskLevel?: string }, ctx: ExecutionContext) {
    return {
      messages: [
        {
          role: 'system',
          content: `You are a Clinical Care Plan Specialist. Formulate evidence-based outpatient follow-up recommendations, diagnostic re-evaluations, and safety net instructions.`
        },
        {
          role: 'user',
          content: `Diagnosis: ${args.diagnosis}\nRisk Level: ${args.riskLevel || 'Moderate'}`
        }
      ]
    };
  }

  @Prompt({
    name: 'research_summary',
    description: 'Prompt template for summarizing PubMed literature and clinical trial evidence.',
    arguments: [
      { name: 'topic', description: 'Medical research topic or drug comparison', required: true }
    ]
  })
  async getResearchSummaryPrompt(args: { topic: string }, ctx: ExecutionContext) {
    return {
      messages: [
        {
          role: 'system',
          content: `You are a Biomedical Literature Specialist AI. Summarize key findings from clinical trials and peer-reviewed journal articles regarding the requested clinical topic.`
        },
        {
          role: 'user',
          content: `Research Topic: ${args.topic}`
        }
      ]
    };
  }

  @Prompt({
    name: 'emr_report_generation',
    description: 'Prompt template for generating standardized EMR SOAP notes and discharge documentation.',
    arguments: [
      { name: 'patientId', description: 'Patient EHR ID', required: true },
      { name: 'notes', description: 'Raw clinical observations', required: true }
    ]
  })
  async getEmrReportPrompt(args: { patientId: string; notes: string }, ctx: ExecutionContext) {
    return {
      messages: [
        {
          role: 'system',
          content: `You are a Medical Documentation Specialist AI. Format the raw clinical observations for patient ${args.patientId} into a standard EMR SOAP note (Subjective, Objective, Assessment, Plan).`
        },
        {
          role: 'user',
          content: `Clinical Observations:\n${args.notes}`
        }
      ]
    };
  }
}
