import { Injectable } from '@nitrostack/core';

@Injectable()
export class LLMService {
  async analyze(prompt: string): Promise<string> {
    return `Analysis for: ${prompt}`;
  }
}
