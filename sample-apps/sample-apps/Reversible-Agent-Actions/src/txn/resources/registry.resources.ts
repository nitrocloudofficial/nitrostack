import { Injectable, ResourceDecorator as Resource } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { CompensatorRegistry } from '../services/registry.service.js';

const TAXONOMY_MARKDOWN = `# Reversibility Taxonomy

## CLEAN
Full restoration. After rollback, no observable trace that the action occurred.
Compensator: call the declared inverse tool.
Examples: create_account → delete_account, grant_api_key → revoke_api_key

## RESTORATIVE
Prior state recoverable, but only if it was captured before the write.
Compensator: write back the captured prior value.
CRITICAL: if prior state was not captured, this becomes TERMINAL.
Examples: update_tier (prior tier captured), update_contact_field

## TOMBSTONED
State reversible, but the reversal is itself visible to third parties.
A "message deleted" marker persists; recipients can see a deletion occurred.
Compensator: call the inverse; flag residual visibility.
Examples: post_message → delete_message

## MITIGABLE
Cannot be undone. Can only be counteracted by a further forward action.
Compensator: execute a distinct counteracting action (refund, retraction).
Examples: send_email → retraction email, capture_payment → refund

## TERMINAL
Irreversible by any means. The transaction can never fully roll back past this step.
No compensator exists. Human must act based on manualInstruction.
Examples: issue_payout, send_sms, fire_webhook
`;

/** Exposes the compensator registry and reversibility taxonomy as MCP resources. */
@Injectable({ deps: [CompensatorRegistry] })
export class RegistryResources {
  constructor(private readonly registry: CompensatorRegistry) {}

  @Resource({
    uri: 'registry://compensators',
    name: 'Compensator Registry',
    description:
      'Every registered tool with its reversibility class, inverse, and manual instruction if irreversible. Read this before planning a multi-step operation.',
    mimeType: 'application/json',
    annotations: { audience: ['assistant'], priority: 0.9 },
  })
  async getCompensators(uri: string, _ctx: ExecutionContext) {
    const all = this.registry.all();
    const coverage = this.registry.coverage();
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ coverage, compensators: all }, null, 2),
        },
      ],
    };
  }

  @Resource({
    uri: 'registry://taxonomy',
    name: 'Reversibility Taxonomy',
    description:
      'The five reversibility classes: CLEAN, RESTORATIVE, TOMBSTONED, MITIGABLE, TERMINAL. Read this to understand what each class means before interpreting a rollback report.',
    mimeType: 'text/markdown',
    annotations: { audience: ['assistant'], priority: 0.8 },
  })
  async getTaxonomy(uri: string) {
    return { contents: [{ uri, mimeType: 'text/markdown', text: TAXONOMY_MARKDOWN }] };
  }
}
