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

import type { z } from '@nitrostack/core';
import type { operationInputs, settingsSchema } from './schemas.js';

export type Settings = z.infer<typeof settingsSchema>;

/** Name of a guarded infrastructure operation, e.g. `provision_instance`. */
export type Operation = keyof typeof operationInputs;

/** A validated operation request: the tool name paired with its parsed arguments. */
export type Command = {
  [K in Operation]: { tool: K; args: z.infer<(typeof operationInputs)[K]> };
}[Operation];

export type FirewallRule = z.infer<typeof operationInputs.modify_firewall_rules>;

export interface Resource {
  id: string;
  name: string;
  type: 'instance' | 'deployment' | 'database';
  region: string;
  environment: string;
  machine: string;
  cpu: number;
  gpu: number;
  memory: number;
  /** Instances behind this record. Deployments scale this as their replica count. */
  count: number;
  /** Monthly USD price of a single unit. */
  unitCost: number;
  status: string;
  detail: string;
  firewall: FirewallRule[];
}
