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
import type { CloudOpsSnapshot } from '../../modules/cloudops/state/snapshot.js';
import type { Settings } from '../../modules/cloudops/domain/types.js';

export type Snapshot = CloudOpsSnapshot;
export type { Settings };

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
