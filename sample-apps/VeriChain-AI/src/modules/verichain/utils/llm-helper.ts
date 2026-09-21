import { getSetting } from '../database/db-helpers.js';

export async function callLlm(systemPrompt: string, userPrompt: string, jsonMode: boolean = false): Promise<string | null> {
    let apiKey = process.env.OPENAI_API_KEY;
    let apiBase = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
    let model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    // If not in env, check DB settings
    try {
        const dbKey = await getSetting('openai_api_key');
        if (dbKey) apiKey = dbKey;
        
        const dbBase = await getSetting('openai_api_base');
        if (dbBase) apiBase = dbBase;
        
        const dbModel = await getSetting('openai_model');
        if (dbModel) model = dbModel;
    } catch (err) {
        console.error('Failed to load API settings from DB:', err);
    }

    if (!apiKey || apiKey.trim() === '') {
        console.warn('OPENAI_API_KEY is not configured. Falling back to heuristic mode.');
        return null;
    }

    try {
        const url = `${apiBase.replace(/\/$/, '')}/chat/completions`;
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        };

        const data: any = {
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.1
        };

        if (jsonMode) {
            data.response_format = { type: 'json_object' };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 200) {
            const result: any = await response.json();
            return result.choices[0].message.content;
        } else {
            const text = await response.text();
            console.warn(`LLM API returned status ${response.status}: ${text}`);
            return null;
        }
    } catch (err) {
        console.error('LLM call failed:', err);
        return null;
    }
}
