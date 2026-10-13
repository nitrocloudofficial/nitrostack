/**
 * SentinelPay AI — `policy://{policyId}` MCP Resource
 * Source: Technical Specification §6 (canonical resource: policy://payment-policy)
 *
 * Read-only view of the deterministic policy configuration itself
 * (thresholds and review flags) — not the per-case policy *evaluation*,
 * which is `evaluatePolicy`'s tool output. There is deliberately no write
 * path here: the agent can read policy, never modify it (§12.2, §21.2).
 */

import { fixtureRepository } from "../services/fixtures.js";
import { assertSlugId, readResource } from "./resource-runtime.js";

export const POLICY_RESOURCE_URI_TEMPLATE = "policy://{policyId}";

export function readPolicyResource(policyId: string) {
  return readResource(
    POLICY_RESOURCE_URI_TEMPLATE,
    "policyId",
    policyId,
    (id) => {
      const policy = fixtureRepository.getPolicy(id);
      return policy ?? { error: { code: "NOT_FOUND", message: `Policy "${id}" was not found.` } };
    },
    assertSlugId
  );
}

export const policyResource = {
  uriTemplate: POLICY_RESOURCE_URI_TEMPLATE,
  description: "Read-only contextual view of a deterministic payment policy configuration.",
  read: readPolicyResource,
};
