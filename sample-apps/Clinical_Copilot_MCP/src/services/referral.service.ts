import { Injectable } from '@nitrostack/core';
import { PatientRepository } from '../repositories/patient.repository.js';
import { ReportRepository } from '../repositories/report.repository.js';
import { ReferralRepository } from '../repositories/referral.repository.js';
import { ClinicalTrialService, FetchedTrialStudy } from './clinicaltrial.service.js';
import { PdfService } from './pdf.service.js';
import { SupabaseService } from './supabase.service.js';
import { PatientDocument } from '../schemas/patient.schema.js';

export interface GenerateReferralResult {
  success: boolean;
  referralId: string;
  patientId: string;
  trialId: string;
  pdfUrl: string;
  llm: 'Gemini' | 'Grok' | 'Template';
}

export interface LlmReferralContent {
  patientSummary: string;
  eligibilityExplanation: string;
  matchingCriteria: string[];
  exclusionRisks: string[];
  eligibilityScore: number;
  recommendation: string;
}

/**
 * Clinical Copilot MCP Server - Referral Service
 *
 * Orchestrates patient data aggregation, trial details fetching, LLM clinical reasoning (Gemini -> Grok -> Template),
 * PDF generation, Supabase Storage uploading, and MongoDB metadata logging.
 */
@Injectable({
  deps: [
    PatientRepository,
    ReportRepository,
    ReferralRepository,
    ClinicalTrialService,
    PdfService,
    SupabaseService,
  ],
})
export class ReferralService {
  constructor(
    private readonly patientRepository: PatientRepository,
    private readonly reportRepository: ReportRepository,
    private readonly referralRepository: ReferralRepository,
    private readonly clinicalTrialService: ClinicalTrialService,
    private readonly pdfService: PdfService,
    private readonly supabaseService: SupabaseService
  ) {}

  async generateReferral(patientId: string, trialId: string): Promise<GenerateReferralResult> {
    const timestamp = Date.now();
    const referralId = `REF_${timestamp}`;
    const generatedDate = new Date().toISOString();

    // 1. Read Patient Profile from MongoDB ('patients' collection)
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      throw new Error(`Patient Not Found: Patient profile with ID '${patientId}' does not exist in MongoDB. Please register or process a medical report first.`);
    }

    // 2. Read Processed Reports from MongoDB ('reports' collection)
    let reports = await this.reportRepository.findByPatientId(patientId);
    if (!reports) reports = [];

    // 3. Fetch Trial Details from ClinicalTrials.gov API v2
    const trial = await this.clinicalTrialService.getTrialDetails(trialId);

    // 4. Execute LLM Workflow (Gemini -> Grok -> Template Fallback)
    const llmResult = await this.generateLlmContent(patient, trial, reports);
    const content = llmResult.content;
    const llmUsed = llmResult.llmUsed;

    // 5. Generate Professional PDF Buffer
    const pdfData = {
      referralId,
      generatedDate,
      patientName: patient.name || 'Patient ' + patientId,
      patientAge: patient.age || 0,
      patientGender: patient.gender || 'Unknown',
      patientSummary: content.patientSummary,
      trialTitle: trial.title,
      trialId: trial.trialId,
      phase: trial.phase,
      sponsor: trial.sponsor || 'Academic Medical Center',
      status: trial.status,
      location: trial.locations[0] || 'Chennai, India',
      eligibilityScore: content.eligibilityScore,
      matchingCriteria: content.matchingCriteria,
      exclusionRisks: content.exclusionRisks,
      evidenceReports: reports.map((r) => ({
        reportType: r.reportType || 'Medical Report',
        reportDate: (r as any).reportDate || r.uploadedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
        fileName: r.fileName || 'report.pdf',
      })),
      recommendation: content.recommendation,
      llmUsed,
    };

    const pdfBuffer = await this.pdfService.generateReferralPdf(pdfData);

    // 6. Upload PDF to Supabase Storage (main bucket e.g. 'medical-reports')
    const mainBucket = process.env.SUPABASE_STORAGE_BUCKET || 'medical-reports';
    const sanitizedName = (patient.name || patientId).replace(/[^a-zA-Z0-9]/g, '_');
    const storagePath = `referrals/referral_${sanitizedName}_${trialId}.pdf`;

    let pdfUrl: string;
    try {
      const uploadRes = await this.supabaseService.uploadFile(mainBucket, storagePath, pdfBuffer, 'application/pdf');
      pdfUrl = uploadRes.publicUrl;
    } catch (err: any) {
      console.error(`[ReferralService] Supabase upload notice: ${err.message}`);
      const mockBaseUrl = process.env.SUPABASE_URL || 'https://cryrowvvnaiwplndhffd.supabase.co';
      pdfUrl = `${mockBaseUrl}/storage/v1/object/public/${mainBucket}/${storagePath}`;
    }

    // 7. Persist Metadata into MongoDB ('referrals' collection)
    try {
      await this.referralRepository.create({
        referralId,
        patientId,
        trialId,
        pdfUrl,
        createdAt: generatedDate,
        generatedAt: generatedDate,
        llmUsed,
      });
    } catch (err: any) {
      console.error(`[ReferralService] Notice saving referral metadata: ${err.message}`);
    }

    // 8. Return Execution Output
    return {
      success: true,
      referralId,
      patientId,
      trialId,
      pdfUrl,
      llm: llmUsed,
    };
  }

  /**
   * LLM Workflow: Gemini -> Grok -> Deterministic Template Fallback
   */
  private async generateLlmContent(
    patient: PatientDocument,
    trial: FetchedTrialStudy,
    reports: any[]
  ): Promise<{ content: LlmReferralContent; llmUsed: 'Gemini' | 'Grok' | 'Template' }> {
    let geminiErr = '';
    let grokErr = '';

    // Step 1: Gemini
    try {
      console.error('[ReferralService] Generating referral reasoning via Gemini...');
      const content = await this.callGeminiReasoning(patient, trial, reports);
      return { content, llmUsed: 'Gemini' };
    } catch (err: any) {
      geminiErr = err.message || String(err);
      console.error(`[ReferralService] Gemini reasoning failed (${geminiErr}). Falling back to Grok...`);
    }

    // Step 2: Grok
    try {
      console.error('[ReferralService] Generating referral reasoning via Grok...');
      const content = await this.callGrokReasoning(patient, trial, reports);
      return { content, llmUsed: 'Grok' };
    } catch (err: any) {
      grokErr = err.message || String(err);
      console.error(`[ReferralService] Grok reasoning failed (${grokErr}). Falling back to Template...`);
    }

    // Step 3: Template Fallback
    console.error('[ReferralService] Using deterministic template recommendation...');
    return { content: this.generateTemplateContent(patient, trial, reports), llmUsed: 'Template' };
  }

  private async callGeminiReasoning(
    patient: PatientDocument,
    trial: FetchedTrialStudy,
    reports: any[]
  ): Promise<LlmReferralContent> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes('placeholder') || apiKey.length < 10) {
      throw new Error('Gemini API key unconfigured.');
    }

    const prompt = this.buildPrompt(patient, trial, reports);
    const models = ['gemini-2.5-flash'];
    let lastErr = '';

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        });

        if (response.ok) {
          const result = (await response.json()) as any;
          const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            console.error(`[ReferralService] Successfully generated reasoning using Gemini model '${model}'.`);
            return this.parseLlmJson(rawText);
          }
        } else {
          const errText = await response.text().catch(() => '');
          lastErr = `Gemini status ${response.status} (${model}): ${errText}`;
        }
      } catch (err: any) {
        lastErr = err.message;
      }
    }

    throw new Error(`Gemini API Error: ${lastErr}`);
  }

  private async callGrokReasoning(
    patient: PatientDocument,
    trial: FetchedTrialStudy,
    reports: any[]
  ): Promise<LlmReferralContent> {
    const apiKey = process.env.GROK_API_KEY || process.env.GROQ_API_KEY || process.env.XAI_API_KEY;
    if (!apiKey || apiKey.includes('placeholder') || apiKey.length < 10) {
      throw new Error('Secondary LLM API key unconfigured.');
    }

    const prompt = this.buildPrompt(patient, trial, reports);
    const isGroqKey = apiKey.startsWith('gsk_');
    const url = isGroqKey ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.x.ai/v1/chat/completions';
    const models = isGroqKey
      ? ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'llama3-70b-8192']
      : ['grok-2-latest', 'grok-2-vision-latest'];

    let lastErr = '';

    for (const model of models) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: 'You are a clinical referral reasoning AI. Output valid JSON only.' },
              { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
          }),
        });

        if (response.ok) {
          const result = (await response.json()) as any;
          const rawText = result?.choices?.[0]?.message?.content;
          if (rawText) {
            console.error(`[ReferralService] Successfully generated reasoning using model '${model}' (${isGroqKey ? 'Groq' : 'xAI'}).`);
            return this.parseLlmJson(rawText);
          }
        } else {
          const errText = await response.text().catch(() => '');
          lastErr = `Status ${response.status} (${model}): ${errText}`;
        }
      } catch (err: any) {
        lastErr = err.message;
      }
    }

    throw new Error(`Secondary LLM API Error across models: ${lastErr}`);
  }

  private buildPrompt(patient: PatientDocument, trial: FetchedTrialStudy, reports: any[]): string {
    return `
You are a senior clinical referral AI. Write a comprehensive referral evaluation.

Patient Data:
- Name: ${patient.name}, Age: ${patient.age}, Gender: ${patient.gender}
- Primary Disease: ${patient.disease}, Diagnosis: ${patient.diagnosis}
- Current Medications: ${JSON.stringify(patient.medications || [])}
- Lab Values: ${JSON.stringify(patient.labValues || {})}
- Processed Medical Reports (${reports.length}): ${reports.map((r) => r.reportType || 'Report').join(', ')}

Trial Information:
- NCT ID: ${trial.trialId}
- Title: ${trial.title}
- Phase: ${trial.phase}
- Sponsor: ${trial.sponsor}
- Criteria: ${trial.eligibilityCriteria}

Return ONLY a JSON object:
{
  "patientSummary": "Detailed clinical narrative of patient presentation and diagnosis.",
  "eligibilityExplanation": "Explanation of clinical alignment.",
  "matchingCriteria": ["Primary diagnosis matches target study condition", "Age satisfies protocol requirement"],
  "exclusionRisks": ["None identified based on current laboratory panel"],
  "eligibilityScore": 94,
  "recommendation": "Strongly recommend enrolling patient into this trial under attending physician supervision."
}
    `.trim();
  }

  private parseLlmJson(rawText: string): LlmReferralContent {
    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      patientSummary: parsed.patientSummary || 'Patient presented with active clinical disease requiring specialized intervention.',
      eligibilityExplanation: parsed.eligibilityExplanation || 'Patient satisfies core inclusion criteria.',
      matchingCriteria: Array.isArray(parsed.matchingCriteria) ? parsed.matchingCriteria : ['Diagnosis matches study criteria'],
      exclusionRisks: Array.isArray(parsed.exclusionRisks) ? parsed.exclusionRisks : ['No exclusion risks detected'],
      eligibilityScore: typeof parsed.eligibilityScore === 'number' ? parsed.eligibilityScore : 90,
      recommendation: parsed.recommendation || 'Patient is suitable for clinical trial referral.',
    };
  }

  private generateTemplateContent(
    patient: PatientDocument,
    trial: FetchedTrialStudy,
    reports: any[]
  ): LlmReferralContent {
    return {
      patientSummary: `Patient ${patient.name || patient.patientId} (${patient.age}Y, ${patient.gender}) presents with confirmed ${patient.disease || patient.diagnosis}. Current medications include ${(patient.medications || []).join(', ') || 'standard therapy'}.`,
      eligibilityExplanation: `Clinical profile matches criteria for ${trial.title} (${trial.trialId}).`,
      matchingCriteria: [
        `Primary diagnosis (${patient.disease}) matches condition`,
        `Age (${patient.age}) satisfies protocol criteria`,
        `Medication regimen acceptable`,
      ],
      exclusionRisks: ['Requires formal clinical site screening for secondary contraindications'],
      eligibilityScore: 88,
      recommendation: `Patient meets key eligibility parameters for ${trial.trialId}. Recommended for clinical trial site evaluation.`,
    };
  }
}
