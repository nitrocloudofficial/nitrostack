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

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/** Whole US dollars, e.g. `$1,200`. */
export const money = (value: number) => usd.format(value);

/** Local date and time for an ISO timestamp. */
export const dateTime = (iso: string) => new Date(iso).toLocaleString();

/** Newest first, without mutating the input. */
export const newestFirst = <T>(items: T[]) => items.slice().reverse();

/** One-line status message for a tool result, e.g. `REQUIRE_APPROVAL · outboundMb-review`. */
export function describeOutcome(result: {
  decision?: string;
  status?: string;
  reason?: string;
  executionError?: string;
  revision?: number;
}) {
  return [
    result.decision ?? result.status ?? 'Saved',
    result.reason,
    result.executionError,
    result.revision && 'revision ' + result.revision,
  ]
    .filter(Boolean)
    .join(' · ');
}
