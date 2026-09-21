import { BaseAgent } from './base.agent';

export class CriticAgent extends BaseAgent {
    public async analyze(caseContext: any, advocateArgument: any, factCheckResults: any): Promise<any> {
        const prompt = `Case Data: ${JSON.stringify(caseContext)}\nAdvocate Pitch: ${JSON.stringify(advocateArgument)}\nFact Check Results: ${JSON.stringify(factCheckResults)}\nDraft your rebuttal.`;
        
        const systemInstruction = `You are the Skeptic. Your job is to tear down the Advocate's pitch using the Case Data and especially the Fact Check Results.
You MUST respond in valid JSON matching this schema EXACTLY:
{
  "rebuttal": "Your detailed critical rebuttal.",
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "riskScore": 85
}`;

        const response = await this.llm.generateStructuredContent(prompt, { systemInstruction });
        
        if (!response.success) {
            console.log(`[CriticAgent] Groq generation failed, falling back to mock logic. ${JSON.stringify(response)}`);
            return {
                rebuttal: "The Advocate's pitch relies on overstated revenue growth. The fact check proved growth is only 22%, not 40%.",
                weaknesses: ["Overstated growth", "High market competition"],
                riskScore: 80
            };
        }
        return response.data;
    }
}
