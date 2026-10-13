import { Injectable } from '@nitrostack/core';
import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

/**
 * Real Gemini AI integration for the Medivra MCP server — vision OCR,
 * structured JSON extraction, and RAG-style chat.
 *
 * This is a direct TypeScript port of the working logic in
 * `server/gemini.js` from the existing Express backend, so the MCP tools
 * behave identically to the already-proven web app.
 */
@Injectable()
export class MedivraGeminiService {
    private client: GoogleGenerativeAI | null = null;

    // Google renames/retires Gemini model IDs frequently. Instead of
    // hardcoding one name, try a short list of current candidates in order
    // and fall back automatically if one is deprecated (404) or over quota (429).
    private readonly MODEL_CANDIDATES = [
        'gemini-3.6-flash',
        'gemini-3.5-flash-lite',
        'gemini-flash-latest',
        'gemini-2.5-flash',
    ];

    private getClient(): GoogleGenerativeAI {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not configured (set it in this project\'s .env).');
        }
        if (!this.client) {
            this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        }
        return this.client;
    }

    private isRetryableModelError(err: unknown): boolean {
        const msg = String((err as Error)?.message || err);
        return msg.includes('404') || msg.includes('429') || /not found|no longer available|quota|RESOURCE_EXHAUSTED/i.test(msg);
    }

    private async withModelFallback<T>(
        genAI: GoogleGenerativeAI,
        modelConfig: Record<string, unknown>,
        task: (model: GenerativeModel) => Promise<T>
    ): Promise<T> {
        let lastErr: unknown;
        for (const modelName of this.MODEL_CANDIDATES) {
            try {
                const model = genAI.getGenerativeModel({ ...modelConfig, model: modelName });
                return await task(model);
            } catch (err) {
                lastErr = err;
                if (!this.isRetryableModelError(err)) throw err;
                // otherwise try the next candidate model
            }
        }
        throw lastErr;
    }

    private extractJson(rawText: string): Record<string, unknown> {
        const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end === -1) {
            throw new Error('Model did not return a parseable JSON object.');
        }
        return JSON.parse(cleaned.slice(start, end + 1));
    }

    /**
     * Vision OCR: send the actual file bytes to Gemini and get back the raw
     * text it can read from the image/PDF. Real OCR — output depends
     * entirely on what is actually in the file.
     */
    async extractTextFromFile({ buffer, mimeType }: { buffer: Buffer; mimeType: string }) {
        const genAI = this.getClient();

        const result = await this.withModelFallback(genAI, {}, (model) =>
            model.generateContent([
                {
                    inlineData: {
                        data: buffer.toString('base64'),
                        mimeType,
                    },
                },
                {
                    text: 'You are an OCR engine. Transcribe ALL visible text from this medical document image/PDF exactly as written, preserving line breaks and structure (patient details, doctor details, diagnosis, medicine table, lab values, etc). Do not summarize, do not translate, do not add commentary — output only the raw transcribed text.',
                },
            ])
        );

        const rawText = result.response.text().trim();
        return { engine: 'Gemini Vision OCR', rawText };
    }

    /**
     * Structured extraction: turn (possibly user-edited) OCR text into
     * strict JSON matching the given schema description, grounded only in
     * that text.
     */
    async parseStructuredJson({
        ocrText,
        schemaInstructions,
        patientProfile,
        fileName,
    }: {
        ocrText: string;
        schemaInstructions: string;
        patientProfile?: Record<string, unknown>;
        fileName?: string;
    }) {
        const genAI = this.getClient();

        const prompt = `You are a clinical data extraction engine. Extract structured data ONLY from the OCR text provided below. Do not invent information that is not present — if a field is genuinely missing from the text, use a sensible empty value ("", 0, or null) rather than fabricating it. Known patient profile context (use only to fill in gaps, and prefer values explicitly present in the OCR text over this if they conflict): ${JSON.stringify(patientProfile || {})}.

Source file name: ${fileName}

${schemaInstructions}

OCR TEXT TO EXTRACT FROM:
"""
${ocrText}
"""

Return ONLY the JSON object, no markdown fences, no commentary.`;

        const result = await this.withModelFallback(
            genAI,
            { generationConfig: { responseMimeType: 'application/json' } },
            (model) => model.generateContent(prompt)
        );
        const text = result.response.text();
        return this.extractJson(text);
    }

    /**
     * Conversational RAG: answer a natural-language query grounded in the
     * patient's live medical context (medicines, prescriptions, blood
     * reports, profile).
     */
    async answerAgenticQuery({
        query,
        context,
        history,
    }: {
        query: string;
        context?: Record<string, unknown>;
        history?: Array<{ sender: string; text: string }>;
    }) {
        const genAI = this.getClient();

        const systemPreamble = `You are MEDIVRA AI's Agentic Healthcare Coordinator, made up of two specialist agents:
- Health Coordinator CEO Agent: medicine schedules, dosage safety, food/drug interactions, daily adherence.
- Medical Report Analysis Agent: lab value interpretation, longitudinal trend comparison across blood reports, risk scoring.

Pick whichever agent persona fits the question best and answer AS that agent (prefix your reply with "Health Coordinator CEO Agent:" or "Medical Report Analysis Agent:" as appropriate).

Ground every answer in the LIVE PATIENT CONTEXT below — reference actual medicine names, doses, and lab values from it rather than generic examples. If the context doesn't contain something needed to answer, say so plainly instead of making it up. Always include a brief safety note to consult a licensed doctor for any diagnosis or treatment change. Keep answers concise (3-6 sentences).

LIVE PATIENT CONTEXT (JSON):
${JSON.stringify(context, null, 2)}`;

        const result = await this.withModelFallback(genAI, {}, async (model) => {
            const chat = model.startChat({
                history: [
                    { role: 'user', parts: [{ text: systemPreamble }] },
                    { role: 'model', parts: [{ text: 'Understood. I will answer strictly grounded in this patient\'s live context, as the appropriate agent persona.' }] },
                    ...(Array.isArray(history)
                        ? history.slice(-10).map((m) => ({
                              role: m.sender === 'user' ? 'user' : 'model',
                              parts: [{ text: m.text }],
                          }))
                        : []),
                ],
            });
            return chat.sendMessage(query);
        });

        return result.response.text().trim();
    }
}
