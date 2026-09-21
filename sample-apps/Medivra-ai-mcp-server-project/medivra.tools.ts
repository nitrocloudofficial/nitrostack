import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { MedivraGeminiService } from './medivra.gemini.service.js';

// ─── Input Schemas ─────────────────────────────────────────────────────────

const OcrDocumentSchema = z.object({
    fileBase64: z.string().describe('Base64-encoded bytes of the medical document image or PDF'),
    mimeType: z.string().describe('MIME type of the file, e.g. "image/jpeg" or "application/pdf"'),
});

const ParsePrescriptionSchema = z.object({
    ocrText: z.string().describe('Raw OCR text transcribed from the prescription document'),
    patientProfile: z
        .record(z.any())
        .optional()
        .describe('Known patient profile context to fill gaps (name, age, gender, etc.)'),
    fileName: z.string().optional().describe('Original file name, for reference'),
});

const ParseBloodReportSchema = z.object({
    ocrText: z.string().describe('Raw OCR text transcribed from the blood/lab report document'),
    patientProfile: z
        .record(z.any())
        .optional()
        .describe('Known patient profile context to fill gaps (name, age, gender, etc.)'),
    fileName: z.string().optional().describe('Original file name, for reference'),
});

const QueryHealthAssistantSchema = z.object({
    query: z.string().describe('Natural-language health question from the patient'),
    context: z
        .record(z.any())
        .optional()
        .describe('Live patient context: current medicines, recent prescriptions, blood report history, profile'),
    history: z
        .array(z.object({ sender: z.string(), text: z.string() }))
        .optional()
        .describe('Prior conversation turns, most recent last'),
});

// ─── Output schema instructions (mirrors server/index.js exactly) ─────────

const PRESCRIPTION_SCHEMA = `Return a strict JSON object exactly matching this shape (types described, fill with real extracted values):
{
  "patient": { "name": "string", "age": "number", "gender": "string", "phone": "string" },
  "doctor": { "name": "string", "qualification": "string", "regNo": "string", "hospital": "string" },
  "prescription": { "date": "YYYY-MM-DD", "diagnosis": "string", "clinical_notes": "string" },
  "medicines": [
    { "name": "string", "generic": "string", "strength": "string", "dosage": "string", "frequency": "string",
      "morning": "boolean", "afternoon": "boolean", "night": "boolean",
      "timing": "Before Food | After Food | With Milk", "duration": "string", "instructions": "string" }
  ],
  "notes": "string",
  "follow_up": "YYYY-MM-DD"
}`;

const BLOOD_REPORT_SCHEMA = `Return a strict JSON object exactly matching this shape (types described, fill with real extracted values). Evaluate every parameter's "status" (Normal | Low | High | Critical) by comparing "value" against "reference", adjusted for the patient's age/gender where relevant:
{
  "patient": { "name": "string", "age": "number", "gender": "string" },
  "laboratory": { "name": "string", "regNo": "string" },
  "report_date": "YYYY-MM-DD",
  "parameters": [
    { "name": "string", "value": "number", "unit": "string", "reference": "string", "status": "Normal | Low | High | Critical" }
  ],
  "summary": "string",
  "abnormal_findings": ["string"],
  "recommendations": ["string"],
  "risk_level": "Low | Moderate | High"
}`;

// Note: Using explicit deps for ESM compatibility (same pattern as the pizzaz template)
@Injectable({ deps: [MedivraGeminiService] })
export class MedivraTools {
    constructor(private readonly gemini: MedivraGeminiService) { }

    @Tool({
        name: 'ocr_medical_document',
        description: 'Run real vision OCR on a medical document (prescription or blood report) image/PDF and return the raw transcribed text. This is the first step before parse_prescription or parse_blood_report.',
        inputSchema: OcrDocumentSchema,
        examples: {
            request: { fileBase64: '<base64 bytes>', mimeType: 'image/jpeg' },
            response: { engine: 'Gemini Vision OCR', rawText: 'Dr. A. Sharma, MBBS...' },
        },
    })
    async ocrMedicalDocument(args: z.infer<typeof OcrDocumentSchema>, ctx: ExecutionContext) {
        const buffer = Buffer.from(args.fileBase64, 'base64');

        ctx.logger.info('Running OCR on medical document', { mimeType: args.mimeType, bytes: buffer.length });

        const result = await this.gemini.extractTextFromFile({ buffer, mimeType: args.mimeType });

        ctx.logger.info('OCR complete', { engine: result.engine, textLength: result.rawText.length });

        return result;
    }

    @Tool({
        name: 'parse_prescription',
        description: 'Extract structured patient, doctor, and medicine data from OCR text of a prescription. Grounded strictly in the provided OCR text — does not fabricate missing fields.',
        inputSchema: ParsePrescriptionSchema,
        examples: {
            request: { ocrText: 'Dr. A. Sharma, MBBS... Paracetamol 500mg twice daily...', fileName: 'prescription.jpg' },
            response: {
                patient: { name: 'Ravi Kumar', age: 34, gender: 'Male', phone: '' },
                doctor: { name: 'Dr. A. Sharma', qualification: 'MBBS', regNo: '', hospital: '' },
                prescription: { date: '2026-07-20', diagnosis: 'Viral fever', clinical_notes: '' },
                medicines: [
                    { name: 'Paracetamol', generic: 'Paracetamol', strength: '500mg', dosage: '1 tablet', frequency: 'Twice daily', morning: true, afternoon: false, night: true, timing: 'After Food', duration: '5 days', instructions: '' },
                ],
                notes: '',
                follow_up: '',
            },
        },
    })
    async parsePrescription(args: z.infer<typeof ParsePrescriptionSchema>, ctx: ExecutionContext) {
        if (!args.ocrText.trim()) {
            throw new Error('ocrText is required and cannot be empty.');
        }

        ctx.logger.info('Parsing prescription', { fileName: args.fileName });

        const json = await this.gemini.parseStructuredJson({
            ocrText: args.ocrText,
            schemaInstructions: PRESCRIPTION_SCHEMA,
            patientProfile: args.patientProfile,
            fileName: args.fileName || 'prescription',
        });

        ctx.logger.info('Prescription parsed successfully');

        return json;
    }

    @Tool({
        name: 'parse_blood_report',
        description: 'Extract structured lab parameters, statuses, and risk assessment from OCR text of a blood/lab report. Grounded strictly in the provided OCR text.',
        inputSchema: ParseBloodReportSchema,
        examples: {
            request: { ocrText: 'Hemoglobin: 10.2 g/dL (Ref: 13-17)...', fileName: 'blood_report.pdf' },
            response: {
                patient: { name: 'Ravi Kumar', age: 34, gender: 'Male' },
                laboratory: { name: 'City Diagnostics', regNo: '' },
                report_date: '2026-07-20',
                parameters: [
                    { name: 'Hemoglobin', value: 10.2, unit: 'g/dL', reference: '13-17', status: 'Low' },
                ],
                summary: 'Mild anemia indicated by low hemoglobin.',
                abnormal_findings: ['Low hemoglobin'],
                recommendations: ['Consult a physician regarding iron levels'],
                risk_level: 'Moderate',
            },
        },
    })
    async parseBloodReport(args: z.infer<typeof ParseBloodReportSchema>, ctx: ExecutionContext) {
        if (!args.ocrText.trim()) {
            throw new Error('ocrText is required and cannot be empty.');
        }

        ctx.logger.info('Parsing blood report', { fileName: args.fileName });

        const json = await this.gemini.parseStructuredJson({
            ocrText: args.ocrText,
            schemaInstructions: BLOOD_REPORT_SCHEMA,
            patientProfile: args.patientProfile,
            fileName: args.fileName || 'blood_report',
        });

        ctx.logger.info('Blood report parsed successfully');

        return json;
    }

    @Tool({
        name: 'query_health_assistant',
        description: 'Ask a natural-language health question, answered by MEDIVRA AI\'s agentic healthcare coordinator, grounded in the live patient context (medicines, prescriptions, blood report history).',
        inputSchema: QueryHealthAssistantSchema,
        examples: {
            request: { query: 'Is it safe to take my BP medicine with paracetamol?', context: { medicines: ['Amlodipine 5mg'] } },
            response: { answer: 'Health Coordinator CEO Agent: Based on your current medicines...' },
        },
    })
    async queryHealthAssistant(args: z.infer<typeof QueryHealthAssistantSchema>, ctx: ExecutionContext) {
        if (!args.query.trim()) {
            throw new Error('query is required and cannot be empty.');
        }

        ctx.logger.info('Querying health assistant', { queryLength: args.query.length });

        const answer = await this.gemini.answerAgenticQuery({
            query: args.query,
            context: args.context || {},
            history: args.history,
        });

        ctx.logger.info('Health assistant answered');

        return { answer };
    }
}
