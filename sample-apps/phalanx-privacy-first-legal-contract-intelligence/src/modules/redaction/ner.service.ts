import { Injectable, defaultLogger } from '@nitrostack/core';

export interface NerResult {
  text: string;
  label: string;
}

/**
 * Service to call an external Named Entity Recognition (NER) model (e.g., via NVIDIA NIM).
 * This acts as the primary intelligence pass for the RedactionService.
 */
@Injectable()
export class NerClientService {
  private readonly model: string;
  private readonly apiKey: string | undefined;

  constructor() {
    this.model = process.env.NVIDIA_GLINER_MODEL || 'nvidia/gliner-pii';
    this.apiKey = process.env.NVIDIA_GLINER_API_KEY;
  }

  get available(): boolean {
    return !!this.apiKey;
  }

  /**
   * Pass text to the GLiNER endpoint to extract entities matching the given labels.
   */
  async extractEntities(text: string, labels: string[]): Promise<NerResult[]> {
    if (!this.apiKey || labels.length === 0) return [];

    try {
      const payload = {
        model: this.model,
        messages: [{ role: 'user', content: text }],
        labels: labels,
        threshold: 0.4,
        chunk_length: 384,
        overlap: 128,
        flat_ner: false
      };

      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json() as any;
      const content = responseData.choices?.[0]?.message?.content;
      if (!content) return [];

      const parsed = JSON.parse(content);
      
      // GLiNER returns { entities: [{ text, label, score }] }
      return (parsed.entities || []).map((ent: any) => ({
        text: ent.text,
        label: ent.label
      }));
    } catch (error) {
      defaultLogger.warn('[ner] External GLiNER extraction failed, falling back to heuristics', { error: (error as Error).message });
      return [];
    }
  }
}

