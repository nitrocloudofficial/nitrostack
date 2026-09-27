// src/agents/planner/gemini.service.ts

import { GoogleGenAI } from "@google/genai";

export class GeminiService {

    private ai: GoogleGenAI;

    constructor() {

        this.ai = new GoogleGenAI({

            apiKey: process.env.GEMINI_API_KEY!

        });

    }

    async generate(prompt: string): Promise<string> {
        const models = [
            "gemini-2.5-flash",
            "gemini-3.5-flash"
        ];

    for (const model of models) {

        try {

            const response =
                await this.ai.models.generateContent({

                    model,

                    contents: prompt

                });

            return response.text ?? "";

        } catch (err) {

            console.log(`${model} failed`);

        }

    }

    throw new Error("All Gemini models failed.");

}

}