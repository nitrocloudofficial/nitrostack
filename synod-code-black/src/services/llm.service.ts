import Groq from 'groq-sdk';

export interface LlmResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LlmRequestOptions {
  model?: string; // defaults to llama-3.3-70b-versatile
  systemInstruction?: string;
  temperature?: number;
}

export class LlmService {
  private groq: Groq | null = null;
  private defaultModel = 'llama-3.3-70b-versatile';

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GROQ_API_KEY;
    if (key) {
      this.groq = new Groq({ apiKey: key });
    }
  }

  public async generateStructuredContent<T>(prompt: string, options: LlmRequestOptions): Promise<LlmResponse<T>> {
    if (!this.groq) {
      return { success: false, error: 'GROQ_API_KEY is not set.' };
    }
    try {
      const model = options.model || this.defaultModel;
      
      const response = await this.groq.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: options.systemInstruction || '' },
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature ?? 0.2,
        response_format: { type: 'json_object' }
      });

      const text = response.choices[0]?.message?.content;
      if (!text) {
        return { success: false, error: 'Model returned an empty text response.' };
      }

      let parsedData: T;
      try {
        parsedData = JSON.parse(text);
      } catch (e) {
        return { success: false, error: `Failed to parse model output as JSON.\nRaw Output: ${text}` };
      }

      return { success: true, data: parsedData };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error(`[LlmService Error] ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }
}
