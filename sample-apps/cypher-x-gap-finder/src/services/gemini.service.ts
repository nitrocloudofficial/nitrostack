import { Injectable } from '@nitrostack/core';
import { GoogleGenAI } from '@google/genai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

@Injectable({ deps: [] })
export class GeminiService {
    private ai: GoogleGenAI | null = null;
    private defaultModel = 'gemini-1.5-flash';
    private apiKey: string | undefined;

    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        if (this.apiKey) {
            this.ai = new GoogleGenAI({ apiKey: this.apiKey });
        } else {
            console.warn('[GeminiService] Warning: GEMINI_API_KEY is not defined in the environment. Falling back to structured mock generation.');
        }
    }

    /**
     * Generates structured output using a Zod schema with built-in retry backoff.
     */
    async generateStructuredOutput<T>(
        prompt: string,
        schema: z.ZodSchema<T>,
        options?: { model?: string }
    ): Promise<T> {
        const model = options?.model || this.defaultModel;
        const startTime = Date.now();

        if (!this.ai || !this.apiKey) {
            console.warn('[GeminiService] No API key configured. Generating simulated structured response.');
            return this.getSimulatedResponse(schema);
        }
        
        const rawJsonSchema = zodToJsonSchema(schema as any);
        const cleanSchema = { ...rawJsonSchema };
        delete (cleanSchema as any).$schema;
        delete (cleanSchema as any).additionalProperties;
        
        console.error('[GeminiService] [START] Request Details:', {
            model,
            promptSnippet: prompt.length > 200 ? prompt.substring(0, 200) + '...' : prompt,
            schemaType: schema.constructor.name
        });

        let responseText = '';
        let attempt = 0;
        const maxAttempts = 3;
        // Optimized base delay for transient rate limits
        let baseDelay = 50;

        while (attempt < maxAttempts) {
            attempt++;
            try {
                const apiStart = Date.now();
                const response = await this.ai.models.generateContent({
                    model,
                    contents: prompt,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: cleanSchema as any,
                    }
                });
                
                const apiDuration = Date.now() - apiStart;
                responseText = response.text || '';
                
                console.error(`[GeminiService] [API Response] Received in ${apiDuration}ms (Attempt ${attempt}/${maxAttempts}):`, {
                    textSnippet: responseText.substring(0, 150) + '...'
                });
                break; // Break loop if successful
            } catch (error: any) {
                const is429 = error.message?.includes('429') || error.status === 429 || error.statusCode === 429;
                const isQuotaExceeded = error.message?.includes('Quota exceeded') || error.message?.includes('RESOURCE_EXHAUSTED');
                
                // If it is a daily quota exhaustion, fail fast immediately to prevent UI blocking
                if (is429 && !isQuotaExceeded && attempt < maxAttempts) {
                    const delay = baseDelay * Math.pow(2, attempt);
                    console.warn(`[GeminiService] HTTP 429 Rate Limited. Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    continue;
                }
                
                const executionTime = Date.now() - startTime;
                console.error(`[GeminiService] [Failure] API Exception after ${attempt} attempts (${executionTime}ms):`, {
                    message: error.message,
                    status: error.status,
                    stack: error.stack
                });
                throw error; // Preserve original error root cause
            }
        }

        if (!responseText) {
            throw new Error('[GeminiService] Empty response text received from Gemini API.');
        }

        // JSON Parsing Diagnostic Block
        let parsed: any;
        try {
            parsed = JSON.parse(responseText);
        } catch (jsonErr: any) {
            const executionTime = Date.now() - startTime;
            console.error('[GeminiService] [Failure] JSON Parsing Diagnostic failed:', {
                rawText: responseText,
                parseErrorMessage: jsonErr.message,
                executionTimeMs: executionTime
            });
            throw new Error(`[GeminiService] Raw text is not valid JSON: ${jsonErr.message}. Raw: ${responseText}`);
        }

        // Schema Validation Diagnostic Block
        const parseResult = schema.safeParse(parsed);
        if (!parseResult.success) {
            const executionTime = Date.now() - startTime;
            const issuesSummary = parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
            console.error('[GeminiService] [Failure] Schema Validation Diagnostic failed:', {
                issues: parseResult.error.issues,
                issuesSummary,
                parsedObject: parsed,
                executionTimeMs: executionTime
            });
            throw parseResult.error; // Keep original ZodError stack trace and details
        }

        const totalExecutionTime = Date.now() - startTime;
        console.error(`[GeminiService] [END] Successfully executed and validated in ${totalExecutionTime}ms`);
        return parseResult.data;
    }

    private getSimulatedResponse<T>(schema: z.ZodSchema<T>): T {
        const sample: any = {};
        const shape = (schema as any).shape;
        
        if (shape) {
            for (const key of Object.keys(shape)) {
                const field = shape[key];
                if (field instanceof z.ZodArray) {
                    sample[key] = [];
                } else if (field instanceof z.ZodNumber) {
                    sample[key] = 85;
                } else if (field instanceof z.ZodObject) {
                    sample[key] = {};
                } else {
                    sample[key] = `Simulated ${key}`;
                }
            }
        }
        return sample as T;
    }
}
