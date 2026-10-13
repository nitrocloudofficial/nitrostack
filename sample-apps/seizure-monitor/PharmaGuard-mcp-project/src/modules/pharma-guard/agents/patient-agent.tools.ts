/**
 * 🏥 Patient Agent
 * Responsible for patient data management: loading profiles,
 * ingesting new records from file uploads or unstructured text.
 * 
 * Tools: get_patient_profile, ingest_patient_record
 */
import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { loadPatients, inMemoryPatients, incrementPatientCounter, callGemini } from '../shared-utils.js';

export class PatientAgent {

  // ==========================================================================
  // get_patient_profile
  // ==========================================================================
  @Tool({
    name: 'get_patient_profile',
    description: 'Retrieves full clinical profile for a patient: demographics, lab results, allergies, diagnoses, current medications, and herbal remedies',
    inputSchema: z.object({
      patientId: z.string().describe('Patient ID (e.g. P001, P002, P003)')
    }),
    examples: {
      request: { patientId: 'P001' },
      response: {
        id: 'P001',
        name: 'Mr. Sharma',
        age: 65,
        diagnoses: ['Hypertension', 'Sinusitis'],
        allergies: ['Penicillin'],
        currentMedications: [{ name: 'Lisinopril', dosage: '10mg', frequency: 'daily' }],
        herbalRemedies: ['Ashwagandha', 'Triphala']
      }
    }
  })
  async getPatientProfile(input: { patientId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching patient profile', { patientId: input.patientId });

    // Check in-memory store first (LLM-extracted patients)
    if (inMemoryPatients.has(input.patientId)) {
      ctx.logger.info('Found patient in memory (extracted from unstructured data)', { patientId: input.patientId });
      return inMemoryPatients.get(input.patientId);
    }

    // Fall back to demo patients from JSON file
    const patients = loadPatients();
    const patient = patients.find((p: any) => p.id === input.patientId);

    if (!patient) {
      const demoIds = patients.map((p: any) => p.id);
      const memoryIds = Array.from(inMemoryPatients.keys());
      const allIds = [...demoIds, ...memoryIds];
      throw new Error(`Patient not found: ${input.patientId}. Available IDs: ${allIds.join(', ')}`);
    }

    return patient;
  }

  // ==========================================================================
  // ingest_patient_record (File Upload / Text → Structured Patient JSON)
  // ==========================================================================
  @Tool({
    name: 'ingest_patient_record',
    description: `Upload a patient record file (.txt, .csv, .pdf, .docx) or paste unstructured clinical text to extract a structured patient profile. The file is decoded, text is extracted, and Gemini LLM converts it into the same JSON format used by all PharmaGuard safety tools. The patient is stored in memory with an assigned ID for immediate use in safety checks. Supported formats: plain text, CSV, PDF (text-based), DOCX.`,
    inputSchema: z.object({
      file_name: z.string().optional().describe('Name of the uploaded file (e.g., "patient_record.txt")'),
      file_type: z.string().optional().describe('MIME type of the uploaded file (e.g., "text/plain", "text/csv", "application/pdf")'),
      file_content: z.string().optional().describe('Base64-encoded file content (provided automatically by NitroStack Studio when a file is attached)'),
      clinicalText: z.string().optional().describe('Alternative: raw clinical text instead of a file upload'),
      patientId: z.string().optional().describe('Optional custom patient ID. If not provided, one will be auto-generated (P100, P101, etc.)'),
    }),
    examples: {
      request: {
        file_name: 'patient_record.txt',
        file_type: 'text/plain',
        file_content: 'UGF0aWVudDogTXJzLiBBbml0YSBEZXNhaSwgNDUteWVhci1vbGQgZmVtYWxlLCB3ZWlnaGluZyA2MiBrZy4=',
      },
      response: {
        success: true,
        patientId: 'P100',
        fileName: 'patient_record.txt',
        extractedProfile: { id: 'P100', name: 'Mrs. Anita Desai', age: 45, sex: 'female' },
        source: 'file_upload → llm_extraction',
      },
    },
  })
  async ingestPatientRecord(input: { file_name?: string; file_type?: string; file_content?: string; clinicalText?: string; patientId?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Ingesting patient record', {
      fileName: input.file_name,
      fileType: input.file_type,
      hasFileContent: !!input.file_content,
      hasText: !!input.clinicalText,
    });

    // Step 1: Extract text from file or use raw clinicalText
    let extractedText = '';

    if (input.file_content) {
      ctx.logger.info('Decoding uploaded file', { fileName: input.file_name, fileType: input.file_type });

      let buffer: Buffer;
      const b64 = input.file_content;
      const dataUrlMatch = b64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (dataUrlMatch && dataUrlMatch.length === 3) {
        buffer = Buffer.from(dataUrlMatch[2], 'base64');
      } else {
        buffer = Buffer.from(b64, 'base64');
      }

      const mimeType = input.file_type || '';
      const fileName = (input.file_name || '').toLowerCase();

      if (mimeType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.csv')) {
        extractedText = buffer.toString('utf-8');
      } else if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
        const rawText = buffer.toString('utf-8', 0, Math.min(buffer.length, 500000));
        const textChunks = rawText.match(/[A-Za-z0-9\s.,;:!?()\-\/'"@#$%&*+=\[\]{}|\\^~`]{4,}/g) || [];
        extractedText = textChunks.join(' ').replace(/\s+/g, ' ').trim();
        if (extractedText.length < 50) {
          extractedText = `[PDF file uploaded: ${input.file_name}. The PDF may be image-based. Raw content length: ${buffer.length} bytes.]`;
        }
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
        const rawText = buffer.toString('utf-8', 0, Math.min(buffer.length, 500000));
        const xmlTextMatches = rawText.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
        extractedText = xmlTextMatches.map(match => match.replace(/<[^>]+>/g, '')).join(' ').replace(/\s+/g, ' ').trim();
        if (extractedText.length < 50) {
          const textChunks = rawText.match(/[A-Za-z0-9\s.,;:!?()\-\/'"]{6,}/g) || [];
          extractedText = textChunks.join(' ').replace(/\s+/g, ' ').trim();
        }
      } else {
        extractedText = buffer.toString('utf-8');
      }
    } else if (input.clinicalText) {
      extractedText = input.clinicalText;
    } else {
      throw new Error('No input provided. Either attach a file (.txt, .csv, .pdf, .docx) or provide clinicalText.');
    }

    if (extractedText.trim().length < 10) {
      throw new Error('Could not extract meaningful text from the input.');
    }

    const assignedId = input.patientId || `P${incrementPatientCounter()}`;

    const prompt = `You are a clinical data extraction system. Extract a structured patient profile from the following unstructured clinical text.

RETURN ONLY a valid JSON object with this exact schema (no markdown, no explanation):
{
  "id": "${assignedId}",
  "name": "<patient full name or 'Unknown' if not found>",
  "age": <number or 0 if unknown>,
  "weightKg": <number or 70 as default>,
  "sex": "<male|female|unknown>",
  "pregnancyStatus": "<pregnant_trimester1|pregnant_trimester2|pregnant_trimester3|not_pregnant|not_applicable>",
  "labResults": {
    "creatinineClearance_mLmin": <number or 90 as default>,
    "liverEnzymesALT_UL": <number or 30 as default>
  },
  "diagnoses": ["<diagnosis1>", "<diagnosis2>"],
  "allergies": ["<allergy1>", "<allergy2>"],
  "currentMedications": [
    { "name": "<drug>", "dosage": "<dose>", "frequency": "<freq>" }
  ],
  "herbalRemedies": ["<herb1>", "<herb2>"]
}

Extraction rules:
- Extract ALL medications mentioned with their dosages and frequencies
- Extract ALL allergies mentioned
- Extract ALL diagnoses/conditions mentioned
- Extract any Ayurvedic/herbal remedies (Ashwagandha, Triphala, Guggul, Tulsi, Brahmi, Arjuna, Neem, etc.) into herbalRemedies
- If creatinine clearance is not directly stated but serum creatinine is given, estimate CrCl using Cockcroft-Gault formula
- If pregnancy status is not mentioned, use "not_applicable" for males and "not_pregnant" for females
- Use reasonable clinical defaults for missing lab values
- Normalize drug names to their common generic names

CLINICAL TEXT:
${extractedText}

JSON ONLY:`;

    const response = await callGemini(prompt);
    let extractedProfile: any;

    if (response) {
      try {
        const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        extractedProfile = JSON.parse(cleaned);
        extractedProfile.id = assignedId;
      } catch (parseError) {
        ctx.logger.error('Failed to parse LLM extraction response', { response });
        extractedProfile = null;
      }
    }

    // Fallback: basic regex extraction
    if (!extractedProfile) {
      ctx.logger.warn('LLM unavailable or failed, using basic text extraction');
      const text = extractedText;
      const nameMatch = text.match(/(?:patient|name|pt)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
      const ageMatch = text.match(/(\d{1,3})[-\s]*(?:year|yr|y\/o|yo)/i);
      const weightMatch = text.match(/(\d{2,3})\s*kg/i);
      const sexMatch = text.match(/\b(male|female|man|woman)\b/i);
      const allergyMatch = text.match(/allerg(?:y|ies)[:\s]+([^.\n]+)/i);
      const diagnosisMatch = text.match(/diagnos(?:is|es|ed)[:\s]+([^.\n]+)/i);
      const crclMatch = text.match(/(?:creatinine clearance|CrCl|GFR)[:\s]*(\d+)/i);

      const sex = sexMatch ? (sexMatch[1].toLowerCase().includes('female') || sexMatch[1].toLowerCase().includes('woman') ? 'female' : 'male') : 'unknown';

      extractedProfile = {
        id: assignedId,
        name: nameMatch?.[1] || 'Unknown Patient',
        age: ageMatch ? parseInt(ageMatch[1]) : 0,
        weightKg: weightMatch ? parseInt(weightMatch[1]) : 70,
        sex,
        pregnancyStatus: sex === 'male' ? 'not_applicable' : 'not_pregnant',
        labResults: { creatinineClearance_mLmin: crclMatch ? parseInt(crclMatch[1]) : 90, liverEnzymesALT_UL: 30 },
        diagnoses: diagnosisMatch ? diagnosisMatch[1].split(/[,;]/).map((d: string) => d.trim()).filter(Boolean) : [],
        allergies: allergyMatch ? allergyMatch[1].split(/[,;]/).map((a: string) => a.trim()).filter(Boolean) : [],
        currentMedications: [],
        herbalRemedies: [],
        _extractionSource: 'basic_regex_fallback',
      };
    }

    // Store in memory
    inMemoryPatients.set(assignedId, extractedProfile);

    return {
      success: true,
      patientId: assignedId,
      fileName: input.file_name || null,
      fileType: input.file_type || null,
      extractedTextLength: extractedText.length,
      extractedProfile,
      source: input.file_content
        ? (response ? 'file_upload → llm_extraction' : 'file_upload → regex_fallback')
        : (response ? 'text_input → llm_extraction' : 'text_input → regex_fallback'),
      message: `Patient ${extractedProfile.name} (${assignedId}) has been registered. You can now run safety checks using this patient ID.`,
      availableNextSteps: [
        `get_patient_profile with patientId: "${assignedId}"`,
        `check_drug_drug_interaction with the patient's current medications`,
        `Full safety workflow via the medication_safety_check prompt`,
      ],
    };
  }
}
