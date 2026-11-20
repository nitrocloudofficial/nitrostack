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

import type { CallToolResponse } from '@nitrostack/widgets';

/**
 * Extracts the structured payload from a tool response, or throws with the server's error
 * message. Handles hosts that return `structuredContent` and hosts that return JSON text.
 */
export function parseToolResult(response: CallToolResponse) {
  const text = response.result ?? (response as { content?: { text: string }[] }).content?.[0]?.text;
  if (response.isError) throw new Error(text || 'Tool call failed');

  const structured = response.structuredContent;
  if (structured && typeof structured === 'object') {
    if ('content' in structured && typeof structured.content === 'string') {
      throw new Error(structured.content);
    }
    return structured;
  }

  if (!text) throw new Error('The server returned an empty result');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text);
  }
}
