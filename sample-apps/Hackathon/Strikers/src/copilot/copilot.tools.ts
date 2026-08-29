import { z } from 'zod';
import { ToolDecorator as Tool, ResourceDecorator as Resource, PromptDecorator as Prompt, Widget, ExecutionContext, Injectable } from '@nitrostack/core';

// ─── Symptom-to-specialty lookup table ────────────────────────────────────────
// Maps keyword groups → specialty + urgency tier (1=routine, 4=emergency)
const SYMPTOM_MAP: Array<{ keywords: string[]; specialty: string; urgency: 1 | 2 | 3 | 4 }> = [
  { keywords: ['chest pain', 'heart attack', 'heart', 'palpitation', 'irregular heartbeat'], specialty: 'Cardiologist', urgency: 4 },
  { keywords: ['stroke', 'paralysis', 'face drooping', 'arm weakness', 'speech difficulty'], specialty: 'Neurologist', urgency: 4 },
  { keywords: ['can\'t breathe', 'shortness of breath', 'wheezing', 'asthma', 'breathlessness', 'coughing blood'], specialty: 'Pulmonologist', urgency: 4 },
  { keywords: ['seizure', 'fits', 'unconscious', 'fainting', 'blackout', 'epilepsy', 'headache', 'migraine', 'dizziness'], specialty: 'Neurologist', urgency: 3 },
  { keywords: ['abdominal pain', 'stomach pain', 'nausea', 'vomiting', 'diarrhea', 'constipation', 'bloating', 'jaundice', 'liver'], specialty: 'Gastroenterologist', urgency: 2 },
  { keywords: ['skin', 'rash', 'itching', 'eczema', 'acne', 'psoriasis', 'hives', 'lesion', 'mole'], specialty: 'Dermatologist', urgency: 1 },
  { keywords: ['bone', 'joint', 'knee', 'back pain', 'fracture', 'shoulder', 'hip', 'arthritis', 'sprain'], specialty: 'Orthopaedic Surgeon', urgency: 2 },
  { keywords: ['eye', 'vision', 'blurry', 'cataract', 'glaucoma', 'red eye'], specialty: 'Ophthalmologist', urgency: 2 },
  { keywords: ['ear', 'hearing', 'nose', 'throat', 'tonsil', 'sinus', 'snoring', 'ent'], specialty: 'ENT Specialist', urgency: 1 },
  { keywords: ['diabetes', 'thyroid', 'hormones', 'fatigue', 'weight gain', 'hair loss', 'excessive thirst'], specialty: 'Endocrinologist', urgency: 2 },
  { keywords: ['cancer', 'tumor', 'lump', 'chemotherapy', 'oncology'], specialty: 'Oncologist', urgency: 3 },
  { keywords: ['kidney', 'renal', 'urine', 'dialysis', 'edema'], specialty: 'Nephrologist', urgency: 3 },
  { keywords: ['depression', 'anxiety', 'mental health', 'insomnia', 'stress', 'panic attack', 'bipolar'], specialty: 'Psychiatrist', urgency: 2 },
  { keywords: ['pregnancy', 'gynecology', 'menstruation', 'periods', 'fertility', 'ovarian', 'uterus'], specialty: 'Gynaecologist', urgency: 2 },
  { keywords: ['child', 'infant', 'toddler', 'paediatric', 'baby', 'fever in child'], specialty: 'Paediatrician', urgency: 2 },
  { keywords: ['urology', 'prostate', 'urinary', 'bladder', 'testicular'], specialty: 'Urologist', urgency: 2 },
  { keywords: ['fever', 'flu', 'cold', 'infection', 'viral', 'weakness', 'fatigue', 'general'], specialty: 'General Physician', urgency: 1 },
];

const URGENCY_LABELS: Record<number, string> = {
  1: 'Routine — schedule within a week',
  2: 'Moderate — schedule within 2–3 days',
  3: 'Urgent — seek care today',
  4: 'Emergency — call 102/108 immediately',
};

const RISK_LABELS: Record<number, string> = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' };

// ─── Inputs ───────────────────────────────────────────────────────────────────
const healthAssistantInput = z.object({
  symptoms: z.string().min(2).max(500).describe('The symptoms described by the patient.'),
  age: z.number().int().min(0).max(130).optional().describe('Patient age in years (optional).'),
  severity: z.number().int().min(1).max(10).optional().describe('Self-reported severity on a scale of 1–10 (optional).'),
});

const reportEmergencyInput = z.object({
  emergencyType: z.string().min(1).max(200).describe('The detected emergency phrase or condition (e.g., "chest pain").'),
});

// ─── Class ────────────────────────────────────────────────────────────────────
@Injectable()
export class CopilotTools {
  @Tool({
    name: 'health-assistant',
    title: 'Health Assistant Copilot',
    description:
      'Assess patient symptoms, estimate urgency, classify risk severity, and recommend the correct medical specialty. Covers 17+ specialties. NEVER diagnoses diseases — only triages.',
    inputSchema: healthAssistantInput,
    invocation: { invoking: 'Analyzing symptoms…', invoked: 'Triage analysis complete' },
    metadata: { category: 'copilot', tags: ['symptoms', 'triage', 'ai', 'health'] },
  })
  async healthAssistant(input: z.infer<typeof healthAssistantInput>, ctx: ExecutionContext) {
    ctx.logger.info('health-assistant invoked', { symptoms: input.symptoms.slice(0, 80) });

    const lower = input.symptoms.toLowerCase();

    // Match all symptoms in priority order (highest urgency first)
    const matches = SYMPTOM_MAP
      .filter(entry => entry.keywords.some(kw => lower.includes(kw)))
      .sort((a, b) => b.urgency - a.urgency);

    const primary = matches[0] ?? { specialty: 'General Physician', urgency: 1 as const };

    // Risk score: base from urgency + age and severity modifiers
    let riskScore = primary.urgency;
    if (typeof input.severity === 'number' && input.severity >= 7) riskScore = Math.min(4, riskScore + 1) as 1 | 2 | 3 | 4;
    if (typeof input.age === 'number' && (input.age < 5 || input.age > 65)) riskScore = Math.min(4, riskScore + 1) as 1 | 2 | 3 | 4;

    const isEmergency = riskScore >= 4;

    const followUpQuestions = [
      'How long have you been experiencing this?',
      'How severe is it on a scale of 1–10?',
      ...(typeof input.age === 'undefined' ? ['Could you share your age and gender?'] : []),
      'Do you have any existing medical conditions (diabetes, hypertension, etc.)?',
      'Are you currently on any medications or have any known allergies?',
      ...(isEmergency ? ['Are you currently alone? Is there someone who can take you to the hospital now?'] : []),
    ];

    return {
      symptoms: input.symptoms,
      recommendedSpecialty: primary.specialty,
      urgencyLevel: URGENCY_LABELS[riskScore],
      riskRating: RISK_LABELS[riskScore],
      riskScore,
      isEmergency,
      additionalSpecialties: matches.slice(1, 3).map(m => m.specialty),
      followUpQuestions,
      reasoning: `Symptom keywords matched: ${matches.map(m => m.specialty).join(', ')}. ${typeof input.age === 'number' ? `Age ${input.age} considered.` : ''} ${typeof input.severity === 'number' ? `Reported severity ${input.severity}/10.` : ''}`,
      disclaimer: '⚠️ This is an AI-powered triage assessment for demo purposes only — NOT a medical diagnosis. Always consult a qualified medical practitioner.',
      summary: isEmergency
        ? `🚨 HIGH URGENCY: "${input.symptoms.slice(0, 60)}" suggests an emergency. Please call 102/108 immediately and use report-emergency to trigger the emergency protocol.`
        : `Triage complete. A ${primary.specialty} is recommended. Risk rating: ${RISK_LABELS[riskScore]}. ${URGENCY_LABELS[riskScore]}.`,
      nextStep: isEmergency
        ? 'IMMEDIATELY call report-emergency with the detected condition. Do not proceed to normal booking.'
        : `Offer to call search-doctors for "${primary.specialty}" and gather the follow-up information above.`,
    };
  }

  @Tool({
    name: 'report-emergency',
    title: 'Emergency Protocol',
    description:
      'Trigger IMMEDIATELY for emergency phrases: "chest pain", "heart attack", "stroke", "can\'t breathe", "seizure", "unconscious", "heavy bleeding". Activates emergency protocol and directs the patient to emergency services.',
    inputSchema: reportEmergencyInput,
    invocation: { invoking: 'Triggering emergency protocol…', invoked: 'Emergency protocol active' },
    metadata: { category: 'copilot', tags: ['emergency', 'critical', 'protocol'] },
  })
  @Widget({
    route: 'emergency',
    prefersBorder: false,
  })
  async reportEmergency(input: z.infer<typeof reportEmergencyInput>, ctx: ExecutionContext) {
    ctx.logger.warn?.('Emergency detected!', { emergencyType: input.emergencyType });

    const incidentId = `INC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;

    return {
      incidentId,
      emergencyType: input.emergencyType,
      emergencyNumbers: { ambulance: '102', nationalEmergency: '108', police: '100' },
      immediateActions: [
        '1. Call 102 or 108 for an ambulance immediately.',
        '2. Stay on the line with emergency services.',
        '3. Do not give food or water to the patient.',
        '4. Keep the patient still and comfortable.',
        '5. Unlock the front door for the ambulance crew.',
      ],
      hospitalSearchTip: 'Ask the AI to run bed-status to find the nearest ICU with availability.',
      warningNote: 'This is a demo simulation. In production, this would page the on-call emergency team and auto-reserve a trauma bay.',
      action: 'Do NOT continue normal appointment booking until the user confirms they are safe.',
      summary: `🚨 EMERGENCY PROTOCOL TRIGGERED [${incidentId}] for "${input.emergencyType}". Call 102/108 immediately.`,
    };
  }

  @Resource({
    uri: 'hospital://guidelines/triage',
    name: 'Hospital Triage Guidelines',
    description: 'Standard 5-level Emergency Severity Index (ESI) triage guidelines.',
    mimeType: 'text/plain',
  })
  async getTriageGuidelines(ctx: ExecutionContext) {
    return [
      'ESI Level 1 — Resuscitation: Immediate life-saving intervention required. (e.g., cardiac arrest, airway obstruction)',
      'ESI Level 2 — Emergent: High risk; should not wait. Seen within 15 minutes. (e.g., chest pain, stroke)',
      'ESI Level 3 — Urgent: Requires 2+ resources; seen within 30–60 minutes. (e.g., abdominal pain, fracture)',
      'ESI Level 4 — Less Urgent: One resource needed; seen within 1–2 hours. (e.g., earache, minor laceration)',
      'ESI Level 5 — Non-Urgent: No resources needed; seen within 2–4 hours. (e.g., medication refill, minor rash)',
    ].join('\n');
  }

  @Resource({
    uri: 'hospital://guidelines/disclaimer',
    name: 'AI Medical Disclaimer',
    description: 'Standard disclaimer for AI-generated health guidance in the ArogyaAI platform.',
    mimeType: 'text/plain',
  })
  async getMedicalDisclaimer(ctx: ExecutionContext) {
    return 'ArogyaAI OS is a demonstration platform using synthetic data. All health assessments are for informational purposes only and do NOT constitute medical advice, diagnosis, or treatment. Future production deployment would require FHIR R4 / HL7 v2 integration with certified EHR/HIS systems and regulatory approval.';
  }

  @Prompt({
    name: 'triage_assistant',
    description: 'System prompt for a specialized triage assistant. Instructs the AI to gather age, symptoms, severity, and duration before recommending a specialist.',
    arguments: [
      { name: 'specialty', description: 'The required medical specialty focus', required: true },
    ],
  })
  async getTriagePrompt(args: { specialty: string }, ctx: ExecutionContext) {
    return {
      messages: [
        {
          role: 'system',
          content: `You are an expert ${args.specialty} triage assistant embedded in ArogyaAI OS, an AI-powered hospital intelligence platform.

Your role:
1. Evaluate symptoms carefully and empathetically.
2. Ask follow-up questions in order: Age → Gender → Duration → Severity (1-10) → Existing conditions → Current medications.
3. DO NOT diagnose diseases or prescribe treatments.
4. DO NOT recommend specific brand-name drugs.
5. Classify urgency: Routine / Moderate / Urgent / Emergency.
6. If Emergency, IMMEDIATELY call the report-emergency tool.
7. If safe to proceed, use search-doctors to find a ${args.specialty} and guide the patient through booking.

Always end triage messages with: "⚠️ This is an AI triage aid — not a medical diagnosis."`,
        },
      ],
    };
  }

  @Prompt({
    name: 'booking_assistant',
    description: 'System prompt for the end-to-end booking assistant. Guides the patient from symptoms to confirmed appointment.',
    arguments: [],
  })
  async getBookingPrompt(args: {}, ctx: ExecutionContext) {
    return {
      messages: [
        {
          role: 'system',
          content: `You are ArogyaAI, an intelligent hospital assistant. You help patients navigate the healthcare system end-to-end.

Typical workflow:
1. Listen to the patient's concern.
2. Run health-assistant to classify symptoms and urgency.
3. Run search-doctors with the recommended specialty and city.
4. Run compare-slots for the top 2–3 doctors.
5. Collect patient name and phone, then run book-appointment.
6. Run get-appointment to show the confirmation widget.

Rules:
- If you detect emergency keywords, immediately run report-emergency.
- Never claim a doctor "will contact the patient" — this is a demo environment.
- All booking data is synthetic and safe to share.`,
        },
      ],
    };
  }
}
