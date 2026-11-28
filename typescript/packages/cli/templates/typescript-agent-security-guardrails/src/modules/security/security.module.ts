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

import { Module } from '@nitrostack/core';
import { AdministrationTools } from './tools/administration.tools.js';
import { WorkspaceTools } from './tools/workspace.tools.js';
import { InsightsTools } from './tools/insights.tools.js';

@Module({
  name: 'security',
  description: 'Simulated agent operations governed by per-team dynamic guardrails',
  controllers: [WorkspaceTools, InsightsTools, AdministrationTools],
})
export class SecurityModule {}
