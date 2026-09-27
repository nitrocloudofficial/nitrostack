import { BaseAgent } from './base.agent';

export class AdvocateAgent extends BaseAgent {
    public async analyze(caseContext: any): Promise<any> {
        const prompt = `Analyze this case data and pitch it favorably:\n${JSON.stringify(caseContext)}`;
        
        const systemInstruction = `You are the Advocate. Your job is to construct the most compelling, optimistic argument for approving this case.
You MUST respond in valid JSON matching this schema EXACTLY:
{
  "argument": "Your detailed pitch.",
  "strengths": ["Strength 1", "Strength 2"],
  "claimsToVerify": [
    { "claimType": "revenue_growth_percentage", "claimedValue": 40 }
  ]
}`;

        const response = await this.llm.generateStructuredContent(prompt, { systemInstruction });
        
        if (!response.success) {
            console.log(`[AdvocateAgent] Groq generation failed, falling back to mock logic. ${JSON.stringify(response)}`);
            return {
                argument: "The applicant has strong historical performance and a clear expansion plan.",
                strengths: ["12 years vintage", "Claimed 40% growth"],
                claimsToVerify: [{ claimType: "revenue_growth_percentage", claimedValue: 40 }]
            };
        }
        return response.data;
    }
}
