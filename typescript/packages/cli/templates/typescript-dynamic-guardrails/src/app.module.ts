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

import { CodeModeTransform, McpApp, Module } from '@nitrostack/core';
import { CloudOpsModule } from './modules/cloudops/cloudops.module.js';
import { guardrails } from './modules/cloudops/guardrails/access.guardrails.js';

@McpApp({
  module: AppModule,
  server: { name: 'cloudops-guardian', version: '1.0.0', protocolVersion: '2025-06-18' },
  // Identity and team access checks run before every tool call.
  guardrails,
  transforms: [
    new CodeModeTransform({
      workerPoolSize: 1,
      // Simulated writes still pass through the same verified identity and policy checks.
      allowDestructive: true,
      alwaysVisible: ['show_cloudops_dashboard'],
    }),
  ],
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [CloudOpsModule],
})
export class AppModule {}
