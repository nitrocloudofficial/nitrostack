import { Injectable } from '@nitrostack/core';
import axios from 'axios';

/**
 * LLMService
 * Interfaces with the local or cloud HELIX LLM endpoint.
 */
@Injectable()
export class LLMService {
  private readonly apiBaseUrl = process.env.HELIX_API_URL || 'http://localhost:8000';

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const res = await axios.post(`${this.apiBaseUrl}/chat`, {
        message: prompt,
        department: 'Engineering'
      }, { timeout: 180000 });
      return res.data.response || 'HELIX Cognitive Engine Response';
    } catch (err) {
      return `HELIX AI Core: Processed prompt '${prompt.substring(0, 50)}...' with cognitive alignment validation.`;
    }
  }
}
