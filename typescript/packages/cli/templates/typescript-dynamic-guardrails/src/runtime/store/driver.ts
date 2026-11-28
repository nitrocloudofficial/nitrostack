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

/**
 * Database drivers are not installed with the template, so a demo install stays small.
 * They are loaded only when the matching store is selected.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function importDriver(name: 'mongodb' | 'pg'): Promise<any> {
  try {
    const mod = await import(name);
    return mod.default && !mod.MongoClient && !mod.Client ? mod.default : mod;
  } catch {
    throw new Error(`The ${name} store needs its driver. Run: npm install ${name}`);
  }
}
