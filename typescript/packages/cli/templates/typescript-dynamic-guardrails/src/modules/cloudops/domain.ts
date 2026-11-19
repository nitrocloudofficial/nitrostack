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

import { isIP } from 'node:net';
import { z } from '@nitrostack/core';

const label = z.string().trim().min(1).max(100);
const qty = z.number().int().positive().max(1024);
export const region = z.enum(['Mumbai', 'Singapore']);
export const machine = z.enum(['general', 'accelerated']);
const environment = z.enum(['development', 'staging', 'production']);
const kind = z.enum(['instance', 'deployment', 'database']);
const target = { resourceId: label, resourceType: kind, environment };
const shape = {
  region,
  environment,
  machine,
  cpu: qty,
  memory: qty,
  gpu: z.number().int().min(0).max(32),
  count: qty,
};
const cidr = label.refine((value) => {
  const [ip, bits, extra] = value.split('/');
  const family = isIP(ip);
  return (
    !!family &&
    extra === undefined &&
    (bits === undefined || (/^\d+$/.test(bits) && Number(bits) <= (family === 4 ? 32 : 128)))
  );
}, 'Expected an IP address or CIDR range');

export const inputs = {
  provision_instance: z.object({ ...shape, workload: label }),
  deploy_application: z.object({ ...shape, application: label, release: label }),
  scale_infrastructure: z.object({ ...target, count: qty }),
  create_database: z.object({
    name: label,
    engine: z.enum(['postgres', 'mysql']),
    region,
    environment,
    storage: qty,
  }),
  modify_firewall_rules: z.object({
    resourceId: label,
    source: cidr,
    port: z.number().int().min(1).max(65535),
    protocol: z.enum(['tcp', 'udp']),
    action: z.enum(['allow', 'deny']),
  }),
  delete_resource: z.object({ ...target, reason: label }),
};
export type Operation = keyof typeof inputs;
export type Command = {
  [K in Operation]: { tool: K; args: z.infer<(typeof inputs)[K]> };
}[Operation];
export const settingsSchema = z
  .object({
    cpu: z.number().int().min(1).max(32),
    gpu: z.number().int().min(0).max(16),
    budget: z.number().int().min(0).max(5000),
    regions: z.array(region).min(1).max(2),
    machines: z.array(machine).min(1).max(2),
    deployment: qty,
    reviewDeletion: z.boolean(),
  })
  .strict();
export type Settings = z.infer<typeof settingsSchema>;
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
  count: number;
  unitCost: number;
  status: string;
  detail: string;
  firewall: Array<z.infer<typeof inputs.modify_firewall_rules>>;
}
export const cost = (resources: Resource[]) =>
  resources.reduce((n, r) => n + r.unitCost * r.count, 0);
export const gpus = (resources: Resource[]) => resources.reduce((n, r) => n + r.gpu * r.count, 0);

export function simulate(resources: Resource[], command: Command, nextId: () => string) {
  const rows = structuredClone(resources);
  const affected: string[] = [];
  function add(row: Omit<Resource, 'id' | 'status' | 'firewall'>) {
    const id = nextId();
    rows.push({ ...row, id, status: 'running', firewall: [] });
    affected.push(id);
  }
  switch (command.tool) {
    case 'provision_instance':
    case 'deploy_application': {
      const a = command.args;
      const deployment = 'application' in a;
      const base = {
        ...a,
        name: deployment ? a.application : a.workload,
        detail: deployment ? a.release : a.workload,
        unitCost: a.cpu * 2 + a.memory + a.gpu * 10,
      };
      if (deployment) add({ ...base, type: 'deployment' });
      else for (let i = 0; i < a.count; i++) add({ ...base, type: 'instance', count: 1 });
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
        unitCost: a.storage * 2,
      });
      break;
    }
    default: {
      const a = command.args;
      const row = rows.find((r) => r.id === a.resourceId);
      if (
        !row ||
        ('resourceType' in a && (row.type !== a.resourceType || row.environment !== a.environment))
      ) {
        throw new Error('Resource unavailable');
      }
      affected.push(row.id);
      if (command.tool === 'scale_infrastructure') row.count = command.args.count;
      if (command.tool === 'delete_resource') rows.splice(rows.indexOf(row), 1);
      if (command.tool === 'modify_firewall_rules') {
        const rule = command.args;
        row.firewall = row.firewall.filter(
          (r) => r.source !== rule.source || r.port !== rule.port || r.protocol !== rule.protocol
        );
        row.firewall.push(rule);
      }
    }
  }
  return { rows, affected };
}
