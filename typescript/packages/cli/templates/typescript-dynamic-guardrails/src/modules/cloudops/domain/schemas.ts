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
import {
  ENVIRONMENTS,
  HARD_LIMITS,
  MACHINE_TYPES,
  REGIONS,
  RESOURCE_TYPES,
} from './limits.js';

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const label = z.string().trim().min(1).max(100);
const quantity = z.number().int().positive().max(1024);

export const region = z.enum(REGIONS);
export const machine = z.enum(MACHINE_TYPES);
const environment = z.enum(ENVIRONMENTS);
const resourceType = z.enum(RESOURCE_TYPES);

/** Identifies an existing resource. Type and environment must match the stored record. */
const existingResource = { resourceId: label, resourceType, environment };

/** Shape shared by everything that creates compute capacity. */
const computeShape = {
  region,
  environment,
  machine,
  cpu: quantity,
  memory: quantity,
  gpu: z.number().int().min(0).max(32),
  count: quantity,
};

/** An IPv4/IPv6 address with an optional prefix length, e.g. `192.0.2.0/24`. */
const cidr = label.refine((value) => {
  const [ip, bits, extra] = value.split('/');
  const family = isIP(ip);
  return (
    !!family &&
    extra === undefined &&
    (bits === undefined || (/^\d+$/.test(bits) && Number(bits) <= (family === 4 ? 32 : 128)))
  );
}, 'Expected an IP address or CIDR range');

// ---------------------------------------------------------------------------
// Guarded operation inputs
// Strict objects reject unknown or misspelled arguments instead of silently dropping them.
// ---------------------------------------------------------------------------

export const operationInputs = {
  provision_instance: z.object({ ...computeShape, workload: label }).strict(),
  deploy_application: z.object({ ...computeShape, application: label, release: label }).strict(),
  scale_infrastructure: z.object({ ...existingResource, count: quantity }).strict(),
  create_database: z
    .object({
      name: label,
      engine: z.enum(['postgres', 'mysql']),
      region,
      environment,
      storage: quantity,
    })
    .strict(),
  modify_firewall_rules: z
    .object({
      resourceId: label,
      source: cidr,
      port: z.number().int().min(1).max(65535),
      protocol: z.enum(['tcp', 'udp']),
      action: z.enum(['allow', 'deny']),
    })
    .strict(),
  delete_resource: z.object({ ...existingResource, reason: label }).strict(),
};

// ---------------------------------------------------------------------------
// Read and administration inputs
// ---------------------------------------------------------------------------

export const noInput = z.object({}).strict();

export const resourceFilterInput = z
  .object({ resourceId: z.string().optional() })
  .strict();

/** A team's editable operating limits. Each value is capped by {@link HARD_LIMITS}. */
export const settingsSchema = z
  .object({
    cpu: z.number().int().min(1).max(HARD_LIMITS.vcpuPerInstance),
    gpu: z.number().int().min(0).max(HARD_LIMITS.gpusPerTeam),
    budget: z.number().int().min(0).max(HARD_LIMITS.monthlySpendUsd),
    regions: z.array(region).min(1).max(REGIONS.length),
    machines: z.array(machine).min(1).max(MACHINE_TYPES.length),
    deployment: quantity,
    reviewDeletion: z.boolean(),
  })
  .strict();

export const updatePolicyInput = z
  .object({ revision: z.number().int().positive(), settings: settingsSchema })
  .strict();

export const reviewApprovalInput = z
  .object({ id: z.string().uuid(), action: z.enum(['approve', 'reject']) })
  .strict();
