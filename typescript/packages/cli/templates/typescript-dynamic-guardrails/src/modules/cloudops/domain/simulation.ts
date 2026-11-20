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

import type { Command, Resource } from './types.js';

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

/** Monthly USD price per compute unit: 2 × vCPU + RAM in GB + 10 × GPUs. */
export const computeUnitCost = (cpu: number, memory: number, gpu: number) =>
  cpu * 2 + memory + gpu * 10;

/** Monthly USD price of a database: $2 per GB of storage. */
export const databaseUnitCost = (storageGb: number) => storageGb * 2;

/** Total projected monthly spend for a set of resources. */
export const monthlyCost = (resources: Resource[]) =>
  resources.reduce((total, r) => total + r.unitCost * r.count, 0);

/** Total GPUs allocated across a set of resources. */
export const allocatedGpus = (resources: Resource[]) =>
  resources.reduce((total, r) => total + r.gpu * r.count, 0);

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export interface Projection {
  /** The full resource list as it would look after the command runs. */
  rows: Resource[];
  /** IDs of resources the command creates or changes. */
  affected: string[];
}

/**
 * Projects the effect of a command without touching the input list. Guardrails evaluate
 * the projection; only an allowed operation installs it as the team's new state.
 *
 * @param nextId Allocates an ID for each resource the command creates.
 */
export function simulate(resources: Resource[], command: Command, nextId: () => string): Projection {
  const rows = structuredClone(resources);
  const affected: string[] = [];

  const add = (row: Omit<Resource, 'id' | 'status' | 'firewall'>) => {
    const id = nextId();
    rows.push({ ...row, id, status: 'running', firewall: [] });
    affected.push(id);
  };

  switch (command.tool) {
    case 'provision_instance': {
      const a = command.args;
      const unitCost = computeUnitCost(a.cpu, a.memory, a.gpu);
      // Each instance is tracked as its own resource so it can be scaled or deleted alone.
      for (let i = 0; i < a.count; i++) {
        add({ ...a, name: a.workload, detail: a.workload, unitCost, type: 'instance', count: 1 });
      }
      break;
    }

    case 'deploy_application': {
      const a = command.args;
      add({
        ...a,
        name: a.application,
        detail: a.release,
        unitCost: computeUnitCost(a.cpu, a.memory, a.gpu),
        type: 'deployment',
      });
      break;
    }

    case 'create_database': {
      const a = command.args;
      add({
        ...a,
        type: 'database',
        machine: 'general',
        cpu: 1,
        memory: 2,
        gpu: 0,
        count: 1,
        detail: a.engine + ' · ' + a.storage + ' GB',
        unitCost: databaseUnitCost(a.storage),
      });
      break;
    }

    default: {
      // Operations on an existing resource.
      const a = command.args;
      const row = rows.find((r) => r.id === a.resourceId);
      const matches =
        !!row &&
        (!('resourceType' in a) || (row.type === a.resourceType && row.environment === a.environment));
      if (!row || !matches) throw new Error('Resource unavailable');
      affected.push(row.id);

      if (command.tool === 'scale_infrastructure') row.count = command.args.count;
      if (command.tool === 'delete_resource') rows.splice(rows.indexOf(row), 1);
      if (command.tool === 'modify_firewall_rules') {
        const rule = command.args;
        // Replace any existing rule for the same source, port and protocol.
        row.firewall = row.firewall.filter(
          (r) => r.source !== rule.source || r.port !== rule.port || r.protocol !== rule.protocol
        );
        row.firewall.push(rule);
      }
    }
  }

  return { rows, affected };
}
