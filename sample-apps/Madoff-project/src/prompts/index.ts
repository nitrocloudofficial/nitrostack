import { PromptDecorator as Prompt, ExecutionContext, Injectable } from '@nitrostack/core';
import { logger } from '../utils/logger.js';

export const FraudPromptsTemplates = {
  SYSTEM_INSTRUCTION: `You are an expert fraud investigator system. Your job is to analyze claims, metadata, and associated documents/images to determine the probability of fraud.
You must ALWAYS respond with valid JSON matching the exact schema requested. Do not include markdown formatting like \`\`\`json. Just the raw JSON object.`,
  
  ANALYSIS_PROMPT: (claimData: any, history: any[]) => `
Analyze the following claim data, historical transactions, and the attached document image.
Claim Data:
${JSON.stringify(claimData, null, 2)}

Historical Transactions:
${JSON.stringify(history, null, 2)}

Please provide a comprehensive fraud analysis. Identify any inconsistencies between the claim data and the attached document image. Look for signs of tampering, incorrect dates, mismatching names, or suspicious amounts.
`
};

@Injectable({ deps: [] })
export class FraudPrompts {
  @Prompt({
    name: 'fraud_investigation_workflow',
    description: 'Guidelines to orchestrate a live fraud investigation for a claim',
    arguments: [
      {
        name: 'claimId',
        description: 'The ID of the claim to investigate',
        required: true
      }
    ]
  })
  async getInvestigationPrompt(args: { claimId: string }, ctx: ExecutionContext) {
    logger.info(`Generating fraud investigation workflow prompt for claim: ${args.claimId}`);

    return {
      messages: [
        {
          role: 'user' as const,
          content: `Please run a fraud investigation workflow for claim ID: "${args.claimId}".
Follow this orchestration workflow:
1. Invoke the "analyze_claim" tool for the claim ID "${args.claimId}".
2. Inspect the analysis output. If the response indicates missing data, inconsistent customer profile, or KYC verification is needed, invoke the "execute_kyc" tool for the customer ID.
3. If the resulting aggregate risk score exceeds the threshold (e.g., >= 0.7) or recommendation is REJECT or ESCALATE, invoke the "freeze_account" tool to freeze the account.
4. Render the "FraudAlertPanel" widget to display the results and alert status to the user.
5. Provide a final summary of your investigation, explaining your findings and actions taken.`
        }
      ]
    };
  }
}
