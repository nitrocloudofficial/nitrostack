import { Injectable, ExecutionContext } from '@nitrostack/core';

@Injectable()
export class LlmOrchestratorService {
    private get apiKey(): string {
        return process.env.GEMINI_API_KEY || '';
    }

    async generateText(prompt: string, systemInstruction?: string): Promise<string> {
        if (!this.apiKey) {
            throw new Error('GEMINI_API_KEY is missing in .env environment variables.');
        }

        const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'];
        let lastError = '';

        for (const model of models) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
                const body: any = {
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: prompt }]
                        }
                    ]
                };

                if (systemInstruction) {
                    body.systemInstruction = {
                        parts: [{ text: systemInstruction }]
                    };
                }

                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                if (res.ok) {
                    const data = (await res.json()) as any;
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (text) return text;
                } else {
                    lastError = await res.text();
                }
            } catch (e: any) {
                lastError = e.message;
            }
        }

        throw new Error(`Gemini API Error: ${lastError}`);
    }

    async generateVision(base64Image: string, mimeType: string, prompt: string): Promise<string> {
        if (!this.apiKey) {
            throw new Error('GEMINI_API_KEY is missing in .env environment variables.');
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;

        const body = {
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            inlineData: {
                                mimeType: mimeType || 'image/jpeg',
                                data: base64Image
                            }
                        },
                        { text: prompt }
                    ]
                }
            ]
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini Vision API Error (${res.status}): ${errText}`);
        }

        const data = (await res.json()) as any;
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
}
