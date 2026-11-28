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
import type { AUDIENCES, CHANNELS, MESSAGE_TYPES, VOICES } from './limits.js';
import type { operationInputs, settingsSchema } from './schemas.js';

export type Settings = z.infer<typeof settingsSchema>;

/** Name of a guarded messaging operation, e.g. `send_reply`. */
export type Operation = keyof typeof operationInputs;

/** A validated operation request: the tool name paired with its parsed arguments. */
export type Command = {
  [K in Operation]: { tool: K; args: z.infer<(typeof operationInputs)[K]> };
}[Operation];

export type Voice = (typeof VOICES)[number];

/** What the tone scorer measured in a piece of text. */
export interface ToneScore {
  voice: Voice;
  /** 0–10: distinct slang terms found. */
  slang: number;
  /** Profanity terms found. Any is blocked by the floor. */
  profanity: number;
  /** True if the text makes a refund, legal or compensation promise. */
  promise: boolean;
  /** The slang terms that were matched, for explanations. */
  terms: string[];
}

export interface Message extends Omit<ToneScore, 'terms'> {
  id: string;
  name: string;
  type: (typeof MESSAGE_TYPES)[number];
  channel: (typeof CHANNELS)[number];
  audience: (typeof AUDIENCES)[number];
  text: string;
  /** People this message reaches. Boosts change it. */
  reach: number;
  status: string;
  detail: string;
  /** Earlier versions of the text, oldest first. */
  previous: string[];
}
