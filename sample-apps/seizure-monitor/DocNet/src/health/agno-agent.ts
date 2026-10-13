import 'dotenv/config';

export interface TriageTurn {
  question: string;
  answer: string;
}

export class AgnoHealthExpertAgent {
  private groqApiKey: string;
  private supabaseUrl: string;
  private supabaseKey: string;
  private modelName = 'llama-3.3-70b-versatile';

  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY || '';
    this.supabaseUrl = process.env.SUPABASE_URL || '';
    this.supabaseKey = process.env.SUPABASE_KEY || '';
  }

  private async callGroq(systemPrompt: string, userPrompt: string, jsonMode = true): Promise<string> {
    if (!this.groqApiKey) {
      throw new Error('GROQ_API_KEY is missing in environment.');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.groqApiKey}`
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API Error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as any;
    return data.choices?.[0]?.message?.content || '';
  }

  public async persistToSupabase(table: string, payload: Record<string, any>): Promise<any> {
    if (!this.supabaseUrl || !this.supabaseKey) {
      return null;
    }

    try {
      const endpoint = `${this.supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        return null;
      }

      return await res.json();
    } catch (err) {
      return null;
    }
  }

  public async evaluateTriageStep(
    initialSymptoms: string,
    history: TriageTurn[] = [],
    patientName: string = 'the patient'
  ): Promise<{
    isEmergency: boolean;
    emergencyReason?: string;
    isComplete: boolean;
    nextQuestion?: string;
    stepNumber: number;
  }> {
    const stepNumber = history.length + 1;

    const systemPrompt = `You are the Agno AI Health Expert Agent — an autonomous, senior medical triage specialist powered by Groq Llama 3.3.
Your objective: Conduct a dynamic, focused medical triage evaluation for ${patientName}.

CRITICAL RULES:
1. EMERGENCY RED-FLAG CHECK: First check if the user prompt or answers indicate immediate life-threatening symptoms (e.g. chest pain, severe uncontrolled bleeding, sudden numbness/paralysis, acute severe shortness of breath). If so, set "isEmergency": true and provide "emergencyReason".
2. RIGOROUS DYNAMIC QUESTIONING: If NOT an emergency, ask EXACTLY ONE focused follow-up question tailored specifically to the patient's previous responses. Do NOT repeat questions already answered. You MUST rigorously investigate the patient's past medical history, sedentary lifestyle/activity levels, and eating/lifestyle habits, in addition to the primary complaint.
3. CONSTRAINTS: Maximum 10 questions total. If stepNumber >= 10 or if you already have a very high clinical confidence about both the acute symptoms and their lifestyle/history, set "isComplete": true.

Return ONLY a JSON object with this exact schema:
{
  "isEmergency": boolean,
  "emergencyReason": string (or null),
  "isComplete": boolean,
  "nextQuestion": string (or null if emergency or complete)
}`;

    const contextStr = history.length > 0
      ? `Initial Symptoms: "${initialSymptoms}"\nPrevious Q&A Context:\n` +
        history.map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join('\n')
      : `Initial Symptoms: "${initialSymptoms}"`;

    const userPrompt = `Evaluate the current patient session (Step ${stepNumber} of 10):\n${contextStr}`;

    const raw = await this.callGroq(systemPrompt, userPrompt, true);
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = {
        isEmergency: false,
        isComplete: stepNumber >= 10,
        nextQuestion: `Can you describe the location and severity of your discomfort in more detail?`
      };
    }

    if (stepNumber >= 10 && !parsed.isEmergency) {
      parsed.isComplete = true;
      parsed.nextQuestion = null;
    }

    // Save turn log to Supabase
    this.persistToSupabase('triage_logs', {
      step_number: stepNumber,
      symptoms: initialSymptoms,
      history: history,
      llm_response: parsed,
      created_at: new Date().toISOString()
    });

    return {
      isEmergency: !!parsed.isEmergency,
      emergencyReason: parsed.emergencyReason || undefined,
      isComplete: !!parsed.isComplete,
      nextQuestion: parsed.nextQuestion || undefined,
      stepNumber
    };
  }

  public async generateClinicalSummary(
    symptoms: string,
    history: TriageTurn[],
    patientName: string = 'the patient'
  ): Promise<{
    specialty: string;
    severity: 'low' | 'moderate' | 'high' | 'emergency';
    summary: string;
    disclaimer: string;
    expertPost: string;
  }> {
    const systemPrompt = `You are the Agno AI Health Expert Agent.
Generate a comprehensive, professional clinical triage assessment post for ${patientName} based on the completed patient interview.

Return ONLY a JSON object with this exact schema:
{
  "specialty": string (e.g. "Orthopedics", "Internal Medicine", "Neurology", "Dermatology", "Pulmonology", "Cardiology"),
  "severity": "low" | "moderate" | "high" | "emergency",
  "summary": string (a concise 2-3 sentence clinical overview of symptoms and WHO-guided findings),
  "expertPost": string (a structured, detailed Health Expert Post formatted with bullet points covering: Clinical Observations, Potential Causes, Recommended Action Plan, and Doctor Specialist Referral),
  "disclaimer": "This is an AI triage estimation and does not constitute professional medical advice."
}`;

    const contextStr = `Initial Symptoms: "${symptoms}"\nFull Triage Interview:\n` +
      history.map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join('\n');

    const raw = await this.callGroq(systemPrompt, contextStr, true);
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = {
        specialty: 'Internal Medicine',
        severity: 'moderate',
        summary: `Patient presented with reported symptoms: "${symptoms}". Clinical triage completed.`,
        expertPost: `### Agno Health Expert Clinical Assessment\n\n- **Intake Symptoms:** ${symptoms}\n- **Clinical Evaluation:** Evaluated across ${history.length} triage turns.\n- **Recommendation:** Schedule consultation with a specialist.`,
        disclaimer: 'This is an AI triage estimation and does not constitute professional medical advice.'
      };
    }

    // Save episode to Supabase
    this.persistToSupabase('health_episodes', {
      symptoms: [symptoms, ...history.map(h => h.answer)],
      clinical_summary: parsed.summary,
      expert_post: parsed.expertPost,
      recommended_specialty: parsed.specialty,
      severity: parsed.severity,
      created_at: new Date().toISOString()
    });

    return {
      specialty: parsed.specialty || 'Internal Medicine',
      severity: parsed.severity || 'moderate',
      summary: parsed.summary || 'Clinical assessment completed.',
      disclaimer: parsed.disclaimer || 'This is an AI triage estimation and does not constitute professional medical advice.',
      expertPost: parsed.expertPost || parsed.summary
    };
  }
}
