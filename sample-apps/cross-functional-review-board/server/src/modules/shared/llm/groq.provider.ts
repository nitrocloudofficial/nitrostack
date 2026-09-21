import { LLMProvider, LLMGenerateOptions } from './llm.interface.js';

export class GroqProvider implements LLMProvider {
  name = 'Groq (Llama 3.3)';

  async generate(system: string, user: string, options?: LLMGenerateOptions): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not configured');
    }

    // Active, high-speed valid models on Groq
    const candidateModels = [
      process.env.GROQ_MODEL,
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant'
    ].filter((m): m is string => Boolean(m));

    const modelsToTry = [...new Set(candidateModels)];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user }
            ],
            temperature: options?.temperature ?? 0.1,
            max_tokens: options?.maxTokens ?? 1500,
            response_format: options?.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined
          })
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          const content = data.choices?.[0]?.message?.content;
          if (content) return content;
        }

        const errText = await response.text();
        lastError = new Error(`Groq API error (${response.status}): ${errText}`);

        if (response.status === 429) {
          console.warn(`[GroqProvider] Rate limit on ${modelName}. Trying next model...`);
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        if (response.status === 400 || response.status === 404) {
          console.warn(`[GroqProvider] Model ${modelName} unavailable/decommissioned. Skipping...`);
          continue;
        }

        throw lastError;
      } catch (err: any) {
        lastError = err;
        const msg = (err?.message || String(err)).toLowerCase();
        if (msg.includes('429') || msg.includes('rate limit')) {
          console.warn(`[GroqProvider] Rate limit exception on ${modelName}. Trying next model...`);
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        if (msg.includes('decommissioned') || msg.includes('not found') || msg.includes('400')) {
          console.warn(`[GroqProvider] Skipping decommissioned/invalid model ${modelName}...`);
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error('All Groq model fallbacks exhausted.');
  }
}
