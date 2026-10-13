import { Pipe, PipeInterface, ArgumentMetadata, Injectable } from '@nitrostack/core';
import { PolicyService } from './policy.service.js';

/**
 * DynamicFieldSanitizerPipe
 *
 * Redacts proxy fields (zip_code, applicant_name, etc.) from loan application
 * input before the tool handler runs, driven by the currently active
 * mitigation_policy row from Postgres.
 *
 * Applied to evaluate_loan_application via @UsePipes(DynamicFieldSanitizerPipe)
 * in a coordinated live edit with Person A (see Section 9 of the workplan).
 */
@Injectable()
@Pipe()
export class DynamicFieldSanitizerPipe implements PipeInterface<unknown, unknown> {
  constructor(private policyService: PolicyService) {}

  async transform(value: unknown, _metadata: ArgumentMetadata): Promise<unknown> {
    const policy = await this.policyService.getActive();

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return value;
    }

    const input = value as Record<string, unknown>;
    const result: Record<string, unknown> = { ...input };

    for (const field of policy.redact_fields ?? []) {
      if (field in result) {
        result[field] = policy.neutral_value ?? 'REDACTED';
      }
    }

    return result;
  }
}
