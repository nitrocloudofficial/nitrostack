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

import { readFileSync } from 'node:fs';
import type { Settings } from '../domain/types.js';

export type TeamSeed = Settings & { name: string };

/**
 * Team fixtures from `seeds/teams.json` at the project root. Each key is a team ID and
 * also the tenant ID used by guardrails. Edit that file to add or change teams.
 */
export const teamSeeds: Readonly<Record<string, TeamSeed>> = JSON.parse(
  readFileSync(new URL('../../../../seeds/teams.json', import.meta.url), 'utf8')
);

export const teamIds = Object.keys(teamSeeds);

export const isKnownTeam = (teamId: string) => Object.hasOwn(teamSeeds, teamId);

/**
 * What the organization has granted a team: the regions and environments it may ever use
 * and whether it may deploy to production at all. Team administrators can tighten their
 * policy inside this boundary but never widen it (see `guardrails/policy-settings.ts`).
 */
export interface TeamBoundary {
  regions: Settings['regions'];
  environments: Settings['environments'];
  productionDeployments: Settings['productionDeployments'];
}

export function teamBoundary(teamId: string): TeamBoundary {
  const { regions, environments, productionDeployments } = teamSeeds[teamId];
  return { regions, environments, productionDeployments };
}
