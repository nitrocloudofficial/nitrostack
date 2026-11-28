/**
 * Copyright 2025 Nitrostack Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { JsonPolicyEvaluator, type Policy } from '@nitrostack/core/guardrails';
import type { RecordedDecision } from '../state/team-state.js';
import { toOutcome, type Outcome } from './guarded-operation.js';

/** A recent request whose outcome would change under the draft policy. */
export interface ChangedDecision {
  attempt: string;
  time: string;
  actor: string;
  tool: string;
  current: { decision: Outcome; reason: string };
  draft: { decision: Outcome; reason: string };
}

export interface PolicyImpact {
  /** Number of recent requests re-evaluated. */
  sampled: number;
  /** Requests whose outcome would change, newest first. */
  changed: ChangedDecision[];
  /** Count of changed requests per transition, e.g. `{ "ALLOW→REQUIRE_APPROVAL": 3 }`. */
  summary: Record<string, number>;
  /** Pending approvals that saving would invalidate (every save starts a new revision). */
  pendingApprovals: number;
}

const evaluator = new JsonPolicyEvaluator();

/**
 * Re-evaluates recent requests against the current and the draft policy and reports the
 * ones whose outcome would change. Both policies see the same facts, judged as new
 * requests (no approval in hand), so the result only reflects the policy difference.
 */
export function policyImpact(
  current: Policy,
  draft: Policy,
  decisions: RecordedDecision[],
  pendingApprovals: number
): PolicyImpact {
  const changed: ChangedDecision[] = [];
  const summary: Record<string, number> = {};

  for (const recorded of decisions) {
    const facts = { ...recorded.facts, authorizedReview: false };
    const before = evaluator.evaluate(current, facts);
    const after = evaluator.evaluate(draft, facts);
    const from = toOutcome(before);
    const to = toOutcome(after);
    if (from === to && before.reasonCode === after.reasonCode) continue;

    const { attempt, time, actor, tool } = recorded;
    changed.unshift({
      attempt,
      time,
      actor,
      tool,
      current: { decision: from, reason: before.reasonCode },
      draft: { decision: to, reason: after.reasonCode },
    });
    const key = from + '→' + to;
    summary[key] = (summary[key] ?? 0) + 1;
  }

  return { sampled: decisions.length, changed, summary, pendingApprovals };
}
