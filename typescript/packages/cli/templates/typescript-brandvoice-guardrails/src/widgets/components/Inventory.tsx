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

import { count } from '../lib/format.js';
import type { Snapshot } from '../lib/types.js';

/** Every message the team has sent, with its measured voice, reach and earlier versions. */
export function Inventory({ data }: { data: Snapshot }) {
  return (
    <section>
      <h2>Messages</h2>
      {data.resources.map((m) => (
        <details key={m.id}>
          <summary>
            <strong>{m.name}</strong> {m.channel} · {m.voice} · {m.status} · reach {count(m.reach)}
          </summary>
          <p>
            {m.id} · {m.type} · {m.audience} · {m.detail}
          </p>
          <blockquote>{m.text}</blockquote>
          <p>
            Slang {m.slang} / 10 · profanity {m.profanity} · {m.promise ? 'makes a promise' : 'no promises'}
          </p>
          {m.previous.length > 0 && <p>Edited {m.previous.length} time(s).</p>}
        </details>
      ))}
      {!data.resources.length && <p>No messages yet.</p>}
    </section>
  );
}
