/**
 * ThreatMatrix Gemini AI Integration Service
 * Provides Google Gemini Vision & text reasoning features.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger.js';
import { config } from './config.js';

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (config.geminiApiKey && config.geminiApiKey !== 'your_gemini_api_key_here') {
      this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
      logger.info('Gemini AI Service initialized successfully.');
    }
  }

  public isAvailable(): boolean {
    return this.genAI !== null;
  }

  /**
   * Perform image/OCR threat analysis on screenshot text or images
   */
  async analyzeImageText(imageInput: string): Promise<string | null> {
    if (!this.genAI) return null;

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent([
        `Perform cybersecurity threat analysis on this text extracted from a screenshot or image: "${imageInput}". Identify IoCs and evaluate threat severity.`
      ]);
      return result.response.text();
    } catch (e: any) {
      logger.warn('Gemini AI vision analysis error', { error: e.message });
      return null;
    }
  }
}
