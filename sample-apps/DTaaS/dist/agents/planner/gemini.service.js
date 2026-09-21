// src/agents/planner/gemini.service.ts
import { GoogleGenAI } from "@google/genai";
export class GeminiService {
    ai;
    constructor() {
        this.ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        });
    }
    async generate(prompt) {
        const response = await this.ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        return response.text ?? "";
    }
}
//# sourceMappingURL=gemini.service.js.map