import { Injectable } from '@nitrostack/core';
import { LlmOrchestratorService } from './llm-orchestrator.service.js';

@Injectable()
export class PersonalShopperAgentService {
    constructor(private readonly llm: LlmOrchestratorService) { }

    async curateTop3Recommendations(candidates: any[], fitProfile: any): Promise<any[]> {
        const topCandidates = candidates.slice(0, 10);
        const systemInstruction = `
      You are the ShoeFit Personal Shopper AI. Select the Top 3 best shoes from the candidates list.
      Provide a personalized human-readable justification for each choice based on foot dimensions (${fitProfile.foot?.foot_length}mm x ${fitProfile.foot?.forefoot_width}mm).
    `;

        const prompt = `
      Candidates: ${JSON.stringify(topCandidates.map(c => ({ brand: c.shoe.brand, model: c.shoe.model, price: c.shoe.price_inr })))}
      User Profile: ${JSON.stringify(fitProfile)}

      Return a JSON array of the top 3 items with custom justification string added to each.
    `;

        try {
            const response = await this.llm.generateText(prompt, systemInstruction);
            const match = response.match(/\[[\s\S]*\]/);
            if (match) {
                const curated = JSON.parse(match[0]);
                return curated.slice(0, 3);
            }
        } catch {
            // Fallback to TOPSIS top 3
        }

        return topCandidates.slice(0, 3);
    }
}
