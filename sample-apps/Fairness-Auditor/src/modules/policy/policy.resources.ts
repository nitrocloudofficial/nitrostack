import { ResourceDecorator as Resource , Injectable } from '@nitrostack/core';
import { PolicyService } from './policy.service.js';

@Injectable()
export class PolicyResources {
  constructor(private policyService: PolicyService) {}

  @Resource({
    uri: 'policy://active',
    name: 'Active Mitigation Policy',
    description: 'The exact redact_fields + group_adjustments policy currently live on this target',
    mimeType: 'application/json',
  })
  async getActivePolicy() {
    return this.policyService.getActive();
  }

  @Resource({
    uri: 'policy://history',
    name: 'Policy History',
    description: 'Every mitigation_policy ever applied to this target, most recent first',
    mimeType: 'application/json',
  })
  async getPolicyHistory() {
    return this.policyService.getHistory();
  }
}