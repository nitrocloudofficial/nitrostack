import { GoogleGenAI } from '@google/genai';
import { config } from '../config/index.js';
import { AIServiceError, TimeoutError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { FraudDecision, FraudDecisionSchema } from '../schemas/fraud.js';
import { FraudPromptsTemplates } from '../prompts/index.js';
import { Injectable } from '@nitrostack/core';
import Groq from 'groq-sdk';

@Injectable({ deps: [] })
export class AIService {
  private ai: GoogleGenAI;
  private modelName: string;
  private groq: Groq | null = null;
  private groqModelName: string;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: config.gemini.apiKey || 'mock-key' });
    this.modelName = config.gemini.model;

    if (config.groq.apiKey) {
      this.groq = new Groq({ apiKey: config.groq.apiKey });
    }
    this.groqModelName = config.groq.model;
  }

  /**
   * Executes a prompt against the active AI provider with retries, structured JSON formatting, and timeout.
   * Expects structured data only (no filesystem pathways).
   */
  public async analyzeFraudWithRetries(
    input: {
      claim: any;
      image?: { data: string; mimeType: string };
      metadata?: any;
      history: any[];
    },
    retries = 3
  ): Promise<FraudDecision> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.debug(`AIService attempt ${attempt} of ${retries}`);
        return await this.analyzeFraud(input);
      } catch (error) {
        lastError = error as Error;
        logger.warn(`AIService attempt ${attempt} failed`, { error: lastError.message });
        if (error instanceof TimeoutError) {
          continue;
        }
        await new Promise(res => setTimeout(res, 500 * attempt));
      }
    }
    throw new AIServiceError(`AIService failed after ${retries} attempts: ${lastError?.message}`);
  }

  private async analyzeFraud(
    input: {
      claim: any;
      image?: { data: string; mimeType: string };
      metadata?: any;
      history: any[];
    }
  ): Promise<FraudDecision> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.app.timeout);

    try {
      const startTime = Date.now();
      
      // If Groq is configured, route request to Groq Cloud
      if (this.groq) {
        logger.info('Sending generation request to Groq model', { model: this.groqModelName });
        
        const messages: any[] = [
          {
            role: 'system',
            content: `${FraudPromptsTemplates.SYSTEM_INSTRUCTION}
You MUST respond with a JSON object containing exactly the following keys:
- "fraud_probability": (number between 0 and 1)
- "confidence": (number between 0 and 1)
- "reasoning": (array of strings explaining the logic)
- "red_flags": (array of strings identifying red flags)
- "missing_information": (array of strings identifying missing info)
- "recommendation": (string: 'APPROVE', 'REJECT', 'ESCALATE', or 'MANUAL_REVIEW')
- "summary": (string summarizing your findings)`
          }
        ];

        const userContent: any[] = [
          {
            type: 'text',
            text: FraudPromptsTemplates.ANALYSIS_PROMPT(input.claim, input.history)
          }
        ];

        if (input.image) {
          userContent.push({
            type: 'image_url',
            image_url: {
              url: `data:${input.image.mimeType};base64,${input.image.data}`
            }
          });
        }

        messages.push({
          role: 'user',
          content: userContent
        });

        // @ts-ignore - SDK parameters compile correctly
        const chatCompletion = await this.groq.chat.completions.create({
          messages,
          model: this.groqModelName,
          response_format: { type: 'json_object' }
        });

        const latency = Date.now() - startTime;
        logger.info('Groq API call completed', { latencyMs: latency, model: this.groqModelName });

        const text = chatCompletion.choices[0].message.content;
        if (!text) {
          throw new AIServiceError('Received empty response from Groq');
        }

        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          throw new AIServiceError('Failed to parse Groq response as JSON');
        }

        const validated = FraudDecisionSchema.safeParse(parsed);
        if (!validated.success) {
          logger.error('Invalid schema from Groq', { issues: validated.error.issues });
          throw new AIServiceError('Groq response did not match expected schema');
        }

        return validated.data;
      }

      // Default Gemini fallback flow
      const imageParts: Array<{ inlineData: { data: string; mimeType: string } }> = [];
      if (input.image) {
        imageParts.push({
          inlineData: {
            data: input.image.data,
            mimeType: input.image.mimeType
          }
        });
      }

      logger.info('Sending generation request to Gemini model', { model: this.modelName });
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: [
          ...imageParts,
          FraudPromptsTemplates.ANALYSIS_PROMPT(input.claim, input.history)
        ],
        config: {
          systemInstruction: FraudPromptsTemplates.SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: 0.1,
          // @ts-ignore - The genai SDK supports setting abort signal
          signal: controller.signal
        }
      });
      
      const latency = Date.now() - startTime;
      logger.info('Gemini API call completed', { latencyMs: latency, model: this.modelName });

      const text = response.text;
      if (!text) {
        throw new AIServiceError('Received empty response from Gemini');
      }

      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        throw new AIServiceError('Failed to parse Gemini response as JSON');
      }

      const validated = FraudDecisionSchema.safeParse(parsed);
      if (!validated.success) {
        logger.error('Invalid schema from Gemini', { issues: validated.error.issues });
        throw new AIServiceError('Gemini response did not match expected schema');
      }

      return validated.data;
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message.includes('abort')) {
        throw new TimeoutError('AI API call timed out');
      }
      
      const errMsg = error.message || '';
      if (
        errMsg.includes('RESOURCE_EXHAUSTED') || 
        errMsg.includes('429') || 
        error.status === 'RESOURCE_EXHAUSTED' || 
        error.status === 429
      ) {
        logger.warn('AI API quota exhausted (429). Falling back to safe mock FraudDecision schema.');
        return {
          fraud_probability: 0.85,
          confidence: 0.5,
          reasoning: ['AI API quota exceeded or exhausted; falling back to manual review.'],
          red_flags: ['AI_API_QUOTA_EXHAUSTED'],
          missing_information: [],
          recommendation: 'MANUAL_REVIEW',
          summary: 'Failsafe manual review triggered due to AI API rate limit / quota exhaustion.'
        };
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
