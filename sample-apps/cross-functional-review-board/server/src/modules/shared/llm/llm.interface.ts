export interface LLMGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  responseMimeType?: string;
}

export interface LLMProvider {
  name: string;
  generate(system: string, user: string, options?: LLMGenerateOptions): Promise<string>;
}
