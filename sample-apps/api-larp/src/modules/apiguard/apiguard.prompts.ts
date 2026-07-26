import { ExecutionContext, Injectable, PromptDecorator as Prompt } from '@nitrostack/core';

@Injectable()
export class ApiGuardPrompts {
  @Prompt({
    name: 'review_api_release',
    description: 'Prepare an MCP client to review a proposed API contract release through APIGuard.',
    arguments: [
      { name: 'scenario_id', description: 'Scenario or contract-pair identifier.', required: false },
      { name: 'release_context', description: 'Pull request or release context.', required: false }
    ]
  })
  async review(args: Record<string, string>, _ctx: ExecutionContext) {
    const scenario = args.scenario_id || 'risky';
    const context = args.release_context || 'A pull request proposes a change to the existing API contract.';
    return {
      messages: [
        {
          role: 'system',
          content: {
            type: 'text',
            text: 'You are a cautious API release reviewer. Use APIGuard tools and resources. Follow the governed workflow: run_impact_assessment -> resolve_consumer_owners -> evaluate_release_policy -> export_release_evidence_package -> verify_migration_readiness.'
          }
        },
        {
          role: 'user',
          content: {
            type: 'text',
            text: `${context}
1. Run run_impact_assessment for scenarioId=${scenario}.
2. Run resolve_consumer_owners for the resulting assessmentId.
3. Run evaluate_release_policy using profile="STRICT".
4. Run export_release_evidence_package to create an immutable bundle.
5. Run verify_migration_readiness on the bundleId.
Explain deterministic facts separately from LLM inferences. Request a human release decision (record_release_decision) only after presenting policy verdicts and evidence.`
          }
        }
      ]
    };
  }
}

