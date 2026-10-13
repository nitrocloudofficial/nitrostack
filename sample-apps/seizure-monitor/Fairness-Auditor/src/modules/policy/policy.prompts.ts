import { PromptDecorator as Prompt , Injectable } from '@nitrostack/core';
import { PolicyService } from './policy.service.js';

@Injectable()
export class PolicyPrompts {
  constructor(private policyService: PolicyService) {}

  @Prompt({
    name: 'describe_target_policy',
    description: 'Explain, in plain English, exactly what the currently active policy changes and why',
  })
  async describeTargetPolicy() {
    const policy = await this.policyService.getActive();
    return `Explain this mitigation policy to a non-technical judge: it redacts ` +
      `${JSON.stringify(policy.redact_fields)} and applies threshold adjustments ` +
      `${JSON.stringify(policy.group_adjustments)}. Rationale on record: "${policy.rationale}".`;
  }
}