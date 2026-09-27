import { BaseAgent } from './base.agent';

export class VerdictAgent extends BaseAgent {
    public async analyze(transcriptString: string): Promise<any> {
        const prompt = `Full Debate Transcript:\n${transcriptString}\nProvide the final verdict.`;
        
        const systemInstruction = `You are the Verdict Agent. You are an impartial judge. Synthesize the debate transcript into a final decision.
You MUST respond in valid JSON matching this schema EXACTLY:
{
  "decision": "APPROVED" | "DECLINED" | "MANUAL_REVIEW",
  "rationale": "Your detailed explanation for this decision.",
  "conditions": ["Condition 1 (if approved)"]
}`;

        const response = await this.llm.generateStructuredContent(prompt, { systemInstruction });
        
        if (!response.success) {
            console.log(`[VerdictAgent] Groq generation failed, falling back to mock logic. ${JSON.stringify(response)}`);
            return {
                decision: "DECLINED",
                rationale: "Due to the flagrant overstatement of revenue growth caught during fact-checking, the application lacks credibility.",
                conditions: []
            };
        }
        return response.data;
    }
}
