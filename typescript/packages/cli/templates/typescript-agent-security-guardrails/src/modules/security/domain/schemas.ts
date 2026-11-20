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

import { z } from '@nitrostack/core';
import { SECURITY_HARD_LIMITS as cap } from './security-policy.js';
const label = z.string().trim().min(1).max(100);
const destination = z.enum(['internal', 'approved_external', 'unapproved_external']);
const workspaceType = z.enum(['research', 'development', 'response']);
const environment = z.enum(['development', 'staging', 'production']);
const workspaceId = label;
const size = z.number().int().nonnegative().safe();
const transfer = { workspaceId, destination, outboundMb: size };
export const operationInputs = {
  create_workspace: z.object({ name: label, workspaceType, environment }).strict(),
  run_outbound_job: z.object({ ...transfer, durationMinutes: size.positive() }).strict(),
  export_data: z.object(transfer).strict(),
  publish_artifact: z.object({ workspaceId, destination, name: label }).strict(),
  change_workspace_access: z
    .object({ workspaceId, access: z.enum(['restricted', 'team']) })
    .strict(),
  delete_workspace: z.object({ workspaceId }).strict(),
};
export const noInput = z.object({}).strict();
export const settingsSchema = z
  .object({
    outboundMb: size.max(cap.outboundMb),
    durationMinutes: size.max(cap.durationMinutes),
    concurrentJobs: size.max(cap.concurrentJobs),
    publicationCount: size.max(cap.publicationCount),
    destinations: z.array(destination).min(1).max(3),
    environments: z.array(environment).min(1).max(3),
    workspaceTypes: z.array(workspaceType).min(1).max(3),
    externalPublishing: z.enum(['review', 'deny']),
    reviewDeletion: z.boolean(),
  })
  .strict();
export const updatePolicyInput = z
  .object({ revision: z.number().int().positive(), settings: settingsSchema })
  .strict();

export const rollbackPolicyInput = z
  .object({ revision: z.number().int().positive(), target: z.number().int().positive() })
  .strict();

export const simulatePolicyInput = z.object({ settings: settingsSchema }).strict();

export const reviewApprovalInput = z
  .object({ id: z.string().uuid(), action: z.enum(['approve', 'reject']) })
  .strict();
