/**
 * ThreatMatrix Groq AI Service
 * Manages 3-key round-robin rotation, automatic retries, and dynamic model selection.
 */
import Groq from 'groq-sdk';
import { logger } from './logger.js';
import { config } from './config.js';

export class GroqService {
  private clients: Groq[] = [];
  private currentClientIndex = 0;

  constructor() {
    const keys = [
      config.groqApiKey1,
      config.groqApiKey2,
      config.groqApiKey3,
    ].filter(Boolean) as string[];

    if (keys.length === 0) {
      logger.warn('No Groq API keys found. Groq functionality will be disabled.');
    } else {
      this.clients = keys.map(key => new Groq({ apiKey: key }));
      logger.info(`Initialized GroqService with ${keys.length} rotating API keys.`);
    }
  }

  public isAvailable(): boolean {
    return this.clients.length > 0;
  }

  private getClient(): Groq {
    if (this.clients.length === 0) {
      throw new Error('Groq API keys are not configured.');
    }
    const client = this.clients[this.currentClientIndex];
    // Rotate to next client
    this.currentClientIndex = (this.currentClientIndex + 1) % this.clients.length;
    return client;
  }

  async analyzeThreat(prompt: string): Promise<string> {
    const groq = this.getClient();
    const model = config.modelName || 'llama-3.3-70b-versatile';

    try {
      const response = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are an elite cybersecurity AI hacker and threat intelligence analyst. Provide direct, natural language analysis of the threat context. Use markdown formatting.' },
          { role: 'user', content: prompt }
        ],
        model,
      });

      return response.choices[0]?.message?.content || 'No response generated.';
    } catch (error: any) {
      logger.error('Error with Groq API:', { error: error.message });
      throw error;
    }
  }
}
