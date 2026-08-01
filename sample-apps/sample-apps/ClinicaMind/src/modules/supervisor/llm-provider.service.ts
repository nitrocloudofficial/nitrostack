import { Injectable } from '@nitrostack/core';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmCompletionOptions {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
}

@Injectable({ deps: [] })
export class LlmProviderService {
  private getProvider(): 'gemini' | 'openai' | 'anthropic' | 'ollama' {
    const envProvider = (process.env.LLM_PROVIDER || '').toLowerCase();
    if (envProvider === 'openai' || envProvider === 'anthropic' || envProvider === 'ollama' || envProvider === 'gemini') {
      return envProvider as any;
    }
    // Auto-detect based on available keys
    if (process.env.GEMINI_API_KEY) return 'gemini';
    if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your_openai')) return 'openai';
    if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
    if (process.env.OLLAMA_BASE_URL) return 'ollama';

    // Default to gemini if GEMINI_API_KEY or fallback key exists, else error out safely
    return 'gemini';
  }

  async generateCompletion(options: LlmCompletionOptions): Promise<{ text: string; provider: string; model: string }> {
    const provider = this.getProvider();
    const temperature = options.temperature ?? 0.2;

    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error(`LLM Error: Provider 'gemini' is selected, but GEMINI_API_KEY is missing in environment variables.`);
      }

      const systemMsg = options.messages.find((m) => m.role === 'system')?.content || '';
      const userMsgs = options.messages.filter((m) => m.role !== 'system');

      const contents = userMsgs.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
          contents,
          generationConfig: { temperature, maxOutputTokens: options.maxTokens || 1024 }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API Error (${response.status}): ${errText}`);
      }

      const json = (await response.json()) as any;
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error(`Gemini API returned an empty completion structure.`);
      }

      return { text, provider: 'Google Gemini', model: 'gemini-1.5-flash' };
    }

    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey.includes('your_openai')) {
        throw new Error(`LLM Error: Provider 'openai' selected, but OPENAI_API_KEY is missing or unconfigured.`);
      }

      const url = 'https://api.openai.com/v1/chat/completions';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: options.messages,
          temperature,
          max_tokens: options.maxTokens || 1024
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
      }

      const json = (await response.json()) as any;
      const text = json?.choices?.[0]?.message?.content;
      return { text: text || 'No completion returned.', provider: 'OpenAI', model: process.env.OPENAI_MODEL || 'gpt-4o' };
    }

    if (provider === 'anthropic') {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error(`LLM Error: Provider 'anthropic' selected, but ANTHROPIC_API_KEY is missing.`);
      }

      const systemMsg = options.messages.find((m) => m.role === 'system')?.content || '';
      const userMsgs = options.messages.filter((m) => m.role !== 'system');

      const url = 'https://api.anthropic.com/v1/messages';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          system: systemMsg,
          messages: userMsgs.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: options.maxTokens || 1024,
          temperature
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Anthropic API Error (${response.status}): ${errText}`);
      }

      const json = (await response.json()) as any;
      const text = json?.content?.[0]?.text;
      return { text: text || 'No completion returned.', provider: 'Anthropic Claude', model: 'claude-3-5-sonnet' };
    }

    if (provider === 'ollama') {
      const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const url = `${baseUrl}/api/generate`;

      const promptText = options.messages.map((m) => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n\n');

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || 'llama3',
          prompt: promptText,
          stream: false
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ollama Error (${response.status}): ${errText}`);
      }

      const json = (await response.json()) as any;
      return { text: json?.response || '', provider: 'Local Ollama', model: process.env.OLLAMA_MODEL || 'llama3' };
    }

    throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}
