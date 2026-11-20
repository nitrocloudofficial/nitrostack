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

import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';
import { startControlPlane } from './control-plane/server.js';
import { PolicyService } from './modules/security/guardrails/policy-service.js';
import { runtimeConfig, type RuntimeConfig } from './runtime/config.js';
import { LocalPolicyStore } from './runtime/store/local.js';
import type { PolicyStore } from './runtime/store/types.js';

// Logs go to stderr: stdout is reserved for protocol traffic.
const log = (message: string) => console.error(`[guardrails] ${message}`);

async function createStore(config: RuntimeConfig): Promise<PolicyStore> {
  if (config.store === 'mongodb') {
    const { MongoPolicyStore } = await import('./runtime/store/mongodb.js');
    return new MongoPolicyStore(config.mongodbUri!, log);
  }
  if (config.store === 'postgres') {
    const { PostgresPolicyStore } = await import('./runtime/store/postgres.js');
    return new PostgresPolicyStore(config.databaseUrl!, log);
  }
  return new LocalPolicyStore(config.store, config.stateDir, log);
}

let config: ReturnType<typeof runtimeConfig>;
let policies: PolicyService;
try {
  config = runtimeConfig();
  // Policies are loaded before the first MCP call can arrive.
  policies = await PolicyService.start(await createStore(config), config, log);
} catch (error) {
  // Configuration and store problems are operator errors: print them plainly and stop.
  log(`cannot start: ${(error as Error).message}`);
  process.exit(1);
}

const server = await McpApplicationFactory.create(AppModule);
await server.start({
  transport: 'http',
  host: config.host,
  port: config.port,
  enableCors: false,
});
const controlPlane = startControlPlane(config, log);

const base = `http://${config.host}:${config.adminPort}`;
log(`profile=${config.profile} store=${config.store} identity=${config.identity.join(',')}`);
log(`control plane ${base}/guardrails/v1  health ${base}/healthz/guardrails`);
if (config.profile === 'demo') {
  log(`demo admin key: ${config.admin.key}  (also in ${config.stateDir}/admin.key)`);
  log(`demo webhook secret: ${config.webhook.secrets[0]}`);
  log(`try: npm run policy -- set outboundMb 8 --team research`);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    controlPlane.close();
    void policies.close().finally(() => process.exit(0));
  });
}
