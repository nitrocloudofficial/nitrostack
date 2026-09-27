import { Module, PromptDecorator as Prompt, Injectable } from '@nitrostack/core';

@Injectable()
export class PromptsController {
  @Prompt({
    name: 'run-claimshield-triage',
    description: 'Instructs the AI agent to run the strict triage flow for a new incident.',
    arguments: [
      {
        name: 'description',
        description: 'Description of the incident',
        required: true
      },
      {
        name: 'currentTime',
        description: 'The current exact ISO timestamp (pass this from your system clock)',
        required: true
      }
    ]
  })
  runTriage(args: { description: string; currentTime: string }) {
    return {
      messages: [
        {
          role: 'system',
          content: {
            type: 'text',
            text: `You are a strict, highly concise ClaimShield Assistant. You MUST execute tools in the exact order below. Do NOT write long generic advice paragraphs. Keep responses to the point.
            
If the user says an incident "just happened", you MUST use the provided currentTime (${args.currentTime}) for incidentDate and incidentTime. Do NOT invent fake times.`
          }
        },
        {
          role: 'user',
          content: {
            type: 'text',
            text: `User Incident: "${args.description}"
            
Follow this EXACT workflow:
1. INVOKE 'create_incident'. (Use the exact facts from the user. Date is ${args.currentTime} if "just happened").
2. INVOKE 'assess_urgency'.
3. INVOKE 'get_required_documents'.
4. DELEGATE OR INVOKE 'query_standard_repair_costs' to verify if the user's damage estimate is fraudulent or accurate. (Only output findings from verified data).
5. INVOKE 'evaluate_claim_readiness'.
6. DELEGATE OR INVOKE 'query_irda_regulations' to pull verified legal facts for any blockers found. (Never hallucinate regulations).
7. OUTPUT a short summary of the readiness score, verified fraud check, and verified legal blockers.
8. INVOKE 'create_action_plan' (with userApproved: true) and SHOW me the exact action checklist.
9. ONLY IF the risk score is > 30, ASK ME EXACTLY: "Would you like me to generate a formal appeal letter citing specific regulations?". If I say yes, invoke 'generate_appeal_letter'.`
          }
        }
      ]
    };
  }

  @Prompt({
    name: 'agent-legal-research',
    description: 'Specialized agent prompt that forces the AI to only use verified legal databases.',
  })
  runLegalAgent() {
    return {
      messages: [
        {
          role: 'system',
          content: {
            type: 'text',
            text: `You are the Legal Research Agent. You MUST NOT use your own knowledge to invent laws or IRDA clauses. You may ONLY use the 'query_irda_regulations' tool. If the tool returns an error, output EXACTLY: "No verified regulation found". Do not guess.`
          }
        }
      ]
    };
  }

  @Prompt({
    name: 'agent-fraud-estimator',
    description: 'Specialized agent prompt that forces the AI to verify repair costs.',
  })
  runFraudAgent() {
    return {
      messages: [
        {
          role: 'system',
          content: {
            type: 'text',
            text: `You are the Fraud & Cost Agent. You MUST NOT use your own knowledge for market rates. You must ONLY use the 'query_standard_repair_costs' tool. Compare the user's estimated damage against the verified data. Flag any discrepancies over 20%.`
          }
        }
      ]
    };
  }
}

@Module({
  name: 'PromptsModule',
  controllers: [PromptsController]
})
export class PromptsModule {}
