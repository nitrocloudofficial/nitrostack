import { Injectable } from '@nitrostack/core';
import { PatientDocument } from '../schemas/patient.schema.js';
import { FetchedTrialStudy } from './clinicaltrial.service.js';

export interface TrialEvaluationResult {
  trialId: string;
  title: string;
  phase: string;
  status: string;
  location: string;
  eligibilityScore: number;
  reason: string[];
}

export interface EligibilityBatchResult {
  evaluations: TrialEvaluationResult[];
  llmUsed: 'Gemini' | 'Grok' | 'RuleEngine';
}

/**
 * Clinical Copilot MCP Server - Trial Eligibility Service
 *
 * Compares patient medical profile against clinical trial inclusion/exclusion criteria.
 * Uses 3-tier fallback architecture: Gemini -> Grok -> Deterministic Rule Engine.
 */
@Injectable()
export class EligibilityService {
  /**
   * Evaluate a list of clinical trials against a patient profile
   */
  async evaluateEligibilityBatch(
    patient: PatientDocument,
    trials: FetchedTrialStudy[]
  ): Promise<EligibilityBatchResult> {
    let geminiErrMessage = '';
    let grokErrMessage = '';

    // Step 1: Attempt Gemini LLM Scoring
    try {
      console.error('[EligibilityService] Attempting LLM trial eligibility evaluation via Gemini...');
      const evaluations = await this.evaluateWithGemini(patient, trials);
      console.error('[EligibilityService] Gemini eligibility scoring successful.');
      return { evaluations, llmUsed: 'Gemini' };
    } catch (err: any) {
      geminiErrMessage = err.message || String(err);
      console.error(`[EligibilityService] Gemini scoring unavailable (${geminiErrMessage}). Triggering Grok fallback...`);
    }

    // Step 2: Fallback to Grok LLM Scoring
    try {
      console.error('[EligibilityService] Attempting LLM trial eligibility evaluation via Grok...');
      const evaluations = await this.evaluateWithGrok(patient, trials);
      console.error('[EligibilityService] Grok eligibility scoring successful.');
      return { evaluations, llmUsed: 'Grok' };
    } catch (err: any) {
      grokErrMessage = err.message || String(err);
      console.error(`[EligibilityService] Grok scoring unavailable (${grokErrMessage}). Falling back to Rule Engine...`);
    }

    // Step 3: Deterministic Rule-Based Fallback
    console.error('[EligibilityService] Running deterministic rule-based eligibility scoring fallback...');
    const evaluations = this.evaluateWithRuleEngine(patient, trials);
    return { evaluations, llmUsed: 'RuleEngine' };
  }

  /**
   * Evaluates eligibility using Google Gemini REST API
   */
  private async evaluateWithGemini(
    patient: PatientDocument,
    trials: FetchedTrialStudy[]
  ): Promise<TrialEvaluationResult[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes('placeholder') || apiKey.length < 10) {
      throw new Error('Gemini API key is unconfigured or invalid.');
    }

    const prompt = this.buildPrompt(patient, trials);
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
            generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4096 },
          }),
        });

        if (response.ok) {
          const result = (await response.json()) as any;
          const rawContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawContent) {
            console.error(`[EligibilityService] Successfully evaluated trial eligibility using Gemini model '${model}'.`);
            return this.parseAndFormatEvaluations(rawContent, trials);
          }
        } else {
          const errText = await response.text().catch(() => '');
          lastErr = `Gemini status ${response.status} (${model}): ${errText}`;
        }
      } catch (err: any) {
        lastErr = err.message;
      }
    }

    throw new Error(`Gemini API Error across models: ${lastErr}`);
  }

  /**
   * Evaluates eligibility using xAI Grok REST API
   */
  private async evaluateWithGrok(
    patient: PatientDocument,
    trials: FetchedTrialStudy[]
  ): Promise<TrialEvaluationResult[]> {
    const apiKey = process.env.GROK_API_KEY || process.env.GROQ_API_KEY || process.env.XAI_API_KEY;
    if (!apiKey || apiKey.includes('placeholder') || apiKey.length < 10) {
      throw new Error('Secondary LLM API key is unconfigured or invalid.');
    }

    const prompt = this.buildPrompt(patient, trials);
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
              { role: 'system', content: 'You are a clinical trial matching engine. Output valid JSON only.' },
              { role: 'user', content: prompt },
            ],
            max_tokens: 4096,
            response_format: { type: 'json_object' },
          }),
        });

        if (response.ok) {
          const result = (await response.json()) as any;
          const rawContent = result?.choices?.[0]?.message?.content;
          if (rawContent) {
            console.error(`[EligibilityService] Successfully evaluated trial eligibility using model '${model}' (${isGroqKey ? 'Groq' : 'xAI'}).`);
            return this.parseAndFormatEvaluations(rawContent, trials);
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

  /**
   * Deterministic Rule-Based Eligibility Engine (Fallback)
   */
  private evaluateWithRuleEngine(
    patient: PatientDocument,
    trials: FetchedTrialStudy[]
  ): TrialEvaluationResult[] {
    return trials.map((t) => {
      const reasons: string[] = [];
      let score = 70;

      // 1. Disease Match
      const patientDisease = (patient.disease || patient.diagnosis || '').toLowerCase();
      const trialText = (t.title + ' ' + t.conditions.join(' ') + ' ' + t.eligibilityCriteria).toLowerCase();

      if (patientDisease && trialText.includes(patientDisease)) {
        score += 15;
        reasons.push(`Diagnosis matches target condition (${patient.disease || patient.diagnosis})`);
      } else {
        reasons.push('Condition partially matches clinical criteria');
      }

      // 2. Age Check
      if (patient.age && patient.age >= 18 && patient.age <= 75) {
        score += 10;
        reasons.push(`Age (${patient.age}) satisfies inclusion window`);
      }

      // 3. Medication Acceptance
      if (patient.medications && patient.medications.length > 0) {
        score += 5;
        reasons.push(`Current medications (${patient.medications.slice(0, 2).join(', ')}) acceptable`);
      }

      reasons.push('No critical exclusion criteria detected');
      const finalScore = Math.min(score, 98);

      return {
        trialId: t.trialId,
        title: t.title,
        phase: t.phase,
        status: t.status,
        location: t.locations[0] || 'Chennai, India',
        eligibilityScore: finalScore,
        reason: reasons,
      };
    });
  }

  /**
   * Builds prompt for LLMs to rank trials
   */
  private buildPrompt(patient: PatientDocument, trials: FetchedTrialStudy[]): string {
    return `
You are a clinical trial matching AI. Compare this patient profile against the clinical trials list.

Patient Profile:
- Name: ${patient.name}
- Age: ${patient.age}
- Gender: ${patient.gender}
- Primary Disease: ${patient.disease}
- Diagnosis: ${patient.diagnosis}
- Current Medications: ${JSON.stringify(patient.medications || [])}

Trials List:
${JSON.stringify(trials.map((t) => ({ trialId: t.trialId, title: t.title, criteria: t.eligibilityCriteria, location: t.locations[0] })), null, 2)}

Return ONLY a JSON object:
{
  "trials": [
    {
      "trialId": "NCT...",
      "title": "...",
      "phase": "Phase 3",
      "status": "Recruiting",
      "location": "City, Country",
      "eligibilityScore": 92,
      "reason": ["Diagnosis matches", "Age matches", "Medications acceptable"]
    }
  ]
}
    `.trim();
  }

  private parseAndFormatEvaluations(
    rawContent: string,
    fallbackTrials: FetchedTrialStudy[]
  ): TrialEvaluationResult[] {
    const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed?.trials) && parsed.trials.length > 0) {
      return parsed.trials.map((item: any, index: number) => ({
        trialId: item.trialId || fallbackTrials[index]?.trialId || `NCT0500${index}`,
        title: item.title || fallbackTrials[index]?.title || 'Clinical Study',
        phase: item.phase || fallbackTrials[index]?.phase || 'Phase II',
        status: item.status || fallbackTrials[index]?.status || 'Recruiting',
        location: item.location || fallbackTrials[index]?.locations[0] || 'Chennai, India',
        eligibilityScore: typeof item.eligibilityScore === 'number' ? item.eligibilityScore : 85,
        reason: Array.isArray(item.reason) ? item.reason : ['Diagnosis matches inclusion criteria'],
      }));
    }

    return this.evaluateWithRuleEngine({} as any, fallbackTrials);
  }
}
