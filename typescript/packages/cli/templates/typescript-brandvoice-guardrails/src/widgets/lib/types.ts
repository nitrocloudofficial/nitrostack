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

// Server types are imported as types only, so no server code is bundled into the widget.
import type { BrandVoiceSnapshot } from '../../modules/brandvoice/state/snapshot.js';
import type { Settings } from '../../modules/brandvoice/domain/types.js';
import type { PolicyImpact } from '../../modules/brandvoice/guardrails/policy-impact.js';

export type Snapshot = BrandVoiceSnapshot;
export type { PolicyImpact, Settings };

/** Calls a read-only tool and returns its result, or `null` if the call failed. */
export type Query = <T>(tool: string, args: Record<string, unknown>) => Promise<T | null>;

/** Calls a tool, shows the outcome and refreshes the dashboard. */
export type Action = (tool: string, args: Record<string, unknown>) => Promise<void>;

/** Fields the widget reads from any mutation, review or policy-edit result. */
export interface ToolOutcome {
  decision?: string;
  status?: string;
  reason?: string;
  executionError?: string;
  revision?: number;
  executed?: boolean;
}
