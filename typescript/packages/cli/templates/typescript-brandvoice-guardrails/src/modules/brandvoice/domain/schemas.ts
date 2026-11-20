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
import {
  AUDIENCES,
  CHANNELS,
  HARD_LIMITS,
  MESSAGE_TYPES,
  OFFICIAL_POST_MODES,
  VOICES,
} from './limits.js';

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const label = z.string().trim().min(1).max(100);
const text = z.string().trim().min(1).max(2000);
const people = z.number().int().positive().max(10_000_000);

export const channel = z.enum(CHANNELS);
export const voice = z.enum(VOICES);
const audience = z.enum(AUDIENCES);
/** Audiences a post or campaign can address. Replies are always `direct`. */
const broadcast = z.enum(['public', 'official']);
const messageType = z.enum(MESSAGE_TYPES);

/** Identifies an existing message. Type and audience must match the stored record. */
const existingMessage = { messageId: label, messageType, audience };

// ---------------------------------------------------------------------------
// Guarded operation inputs
// Strict objects reject unknown or misspelled arguments instead of silently dropping them.
// There is deliberately no `voice` argument: the server measures the voice from the text.
// ---------------------------------------------------------------------------

export const operationInputs = {
  send_reply: z.object({ channel, customer: label, text }).strict(),
  publish_post: z.object({ channel, audience: broadcast, title: label, followers: people, text }).strict(),
  schedule_campaign: z
    .object({ name: label, channel, audience: broadcast, recipients: people, text })
    .strict(),
  boost_message: z.object({ ...existingMessage, reach: people }).strict(),
  edit_message: z.object({ messageId: label, text }).strict(),
  retract_message: z.object({ ...existingMessage, reason: label }).strict(),
};

// ---------------------------------------------------------------------------
// Read and administration inputs
// ---------------------------------------------------------------------------

export const noInput = z.object({}).strict();

export const scoreDraftInput = z.object({ text }).strict();

/** A team's editable voice policy. Each value is capped by {@link HARD_LIMITS}. */
export const settingsSchema = z
  .object({
    slang: z.number().int().min(0).max(HARD_LIMITS.slangScale),
    reach: z.number().int().min(0).max(HARD_LIMITS.totalReach),
    campaign: z.number().int().min(1).max(HARD_LIMITS.campaignRecipients),
    channels: z.array(channel).min(1).max(CHANNELS.length),
    voices: z.array(voice).min(1).max(VOICES.length),
    audiences: z.array(audience).min(1).max(AUDIENCES.length),
    officialPosts: z.enum(OFFICIAL_POST_MODES),
    reviewRetraction: z.boolean(),
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
