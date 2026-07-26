import { Injectable } from '@nitrostack/core';
import { LlmOrchestratorService } from './llm-orchestrator.service.js';

@Injectable()
export class PodiatristAgentService {
    constructor(private readonly llm: LlmOrchestratorService) { }

    async conductDiagnosticChat(history: Array<{ role: string; text: string }>, latestMessage: string): Promise<{
        next_question: string;
        is_complete: boolean;
        biomechanical_profile?: {
            arch_type: 'flat_feet' | 'neutral' | 'high_arch';
            pronation: 'overpronation' | 'neutral' | 'underpronation';
            knee_alignment: 'caves_in' | 'straight';
            pain_points: string[];
            stability_need: 'high' | 'medium' | 'low';
        };
    }> {
        const systemInstruction = `
      You are Dr. ShoeFit, an AI Podiatrist. You conduct an adaptive diagnostic interview to understand foot biomechanics.
      Ask ONE clarifying question at a time about arch height, knee squat alignment, or ankle pain.
      When you have gathered enough information, output a final JSON object.
    `;

        const prompt = `
      Conversation History:
      ${JSON.stringify(history)}

      User's Latest Response: "${latestMessage}"

      Return a JSON response:
      {
        "next_question": "string question to ask user (or empty if complete)",
        "is_complete": boolean,
        "biomechanical_profile": { ... } // include only if is_complete is true
      }
    `;

        try {
            const res = await this.llm.generateText(prompt, systemInstruction);
            const match = res.match(/\{[\s\S]*\}/);
            if (match) return JSON.parse(match[0]);
        } catch {
            // Fallback
        }

        return {
            next_question: 'Do your knees cave inward during a single-leg squat?',
            is_complete: false,
        };
    }
}
