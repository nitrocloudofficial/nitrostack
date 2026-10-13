import dotenv from 'dotenv';
dotenv.config();

export async function queryLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  // Use FOCUSOPS_LLM_PROVIDER to avoid NitroStack internal env conflicts
  const provider = (
    process.env.FOCUSOPS_LLM_PROVIDER ||
    process.env.LLM_PROVIDER ||
    'gemini'
  ).toLowerCase();

  // Resolve API Key
  let apiKey = process.env.FOCUSOPS_LLM_API_KEY || process.env.LLM_API_KEY || '';
  if (!apiKey) {
    if (provider === 'gemini') {
      apiKey = process.env.GEMINI_API_KEY || '';
    } else if (provider === 'grok' || provider === 'xai') {
      apiKey = process.env.XAI_API_KEY || '';
    } else if (provider === 'openai' || provider === 'openrouter') {
      apiKey = process.env.OPENAI_API_KEY || '';
    }
  }

  if (!apiKey || apiKey.startsWith('AQ.your-') || apiKey.startsWith('your-')) {
    throw new Error(`API Key for provider "${provider}" is not configured in .env`);
  }

  // Resolve Model Name
  let model = process.env.FOCUSOPS_LLM_MODEL || process.env.LLM_MODEL || '';
  if (!model) {
    if (provider === 'gemini') {
      model = 'gemini-2.0-flash';
    } else if (provider === 'grok' || provider === 'xai') {
      model = 'grok-3-mini';
    } else if (provider === 'openai') {
      model = 'gpt-4o-mini';
    } else if (provider === 'openrouter') {
      model = 'google/gemini-2.0-flash:free';
    }
  }

  // ─── Gemini ─────────────────────────────────────────────────────────────────
  if (provider === 'gemini') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.2 }
        })
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }
    const data = await res.json() as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  }

  // ─── OpenAI / OpenRouter / Grok / xAI ───────────────────────────────────────
  // Determine endpoint:
  //  - OpenRouter keys start with "sk-or-v1-"
  //  - Grok/xAI keys start with "xai-"
  //  - Standard OpenAI keys start with "sk-"
  let endpoint: string;
  if (apiKey.startsWith('sk-or-v1-') || provider === 'openrouter') {
    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  } else if (apiKey.startsWith('xai-') || provider === 'grok' || provider === 'xai') {
    endpoint = 'https://api.x.ai/v1/chat/completions';
  } else {
    endpoint = 'https://api.openai.com/v1/chat/completions';
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  // OpenRouter requires these extra headers
  if (endpoint.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://focusops.app';
    headers['X-Title'] = 'FocusOps Priority Agent';
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 800
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${provider.toUpperCase()} API error ${res.status}: ${errText}`);
  }
  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content?.trim() || '';
}
