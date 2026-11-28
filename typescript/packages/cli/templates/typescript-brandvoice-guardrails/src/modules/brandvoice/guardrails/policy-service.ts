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

import {
  assertValidPolicy,
  CachedPolicyProvider,
  type Policy,
  type PolicySource,
} from '@nitrostack/core/guardrails';
import type { RuntimeConfig } from '../../../runtime/config.js';
import { LocalPolicyStore } from '../../../runtime/store/local.js';
import { RevisionConflictError, type ChangeSource, type PolicyHead, type PolicyStore, type PolicyVersionRecord } from '../../../runtime/store/types.js';
import { settingsSchema } from '../domain/schemas.js';
import type { Settings } from '../domain/types.js';
import { appendAudit } from '../state/audit.js';
import { teamIds, teamSeeds } from '../state/seeds.js';
import { readTeamState, updateTeamState } from '../state/team-state.js';
import { buildMutationPolicy, MUTATION_FACTS, MUTATION_POLICY_ID, withFloor } from './mutation.policy.js';
import { compileTeamPolicy } from './policy-settings.js';

export type ChangedBy = { actor: string; source: ChangeSource };

export const seedSettings = (teamId: string): Settings => {
  const { name: _name, ...settings } = teamSeeds[teamId];
  return settingsSchema.parse(settings);
};

/**
 * Runtime policy service: the one place that reads and changes stored policies.
 * MCP tools, the REST control plane, webhooks and `npm run policy` all call it, so every
 * change is validated, versioned, audited and pushed to the cache the same way.
 */
export class PolicyService {
  readonly provider: CachedPolicyProvider;
  private readonly seen = new Map<string, number>();
  private poller?: NodeJS.Timeout;
  private pushActive = false;
  lastError?: { message: string; at: string };

  private constructor(
    readonly store: PolicyStore,
    readonly config: Pick<RuntimeConfig, 'profile' | 'store' | 'cache'>,
    private readonly log: (message: string) => void
  ) {
    const source: PolicySource = {
      load: async (tenantId, policyId) => {
        if (policyId !== MUTATION_POLICY_ID) return null;
        const active = await this.active(tenantId).catch((error) => {
          if (error.message === 'Unknown team') return null;
          throw error;
        });
        if (!active) return null;
        // Served version = head revision, which only moves forward (rollback included).
        return withFloor({ ...active.record.policy, tenantId, id: policyId, version: active.head.revision });
      },
      watch: store.watch
        ? (onChange) => {
            this.pushActive = true;
            return store.watch!(onChange);
          }
        : undefined,
    };
    this.provider = new CachedPolicyProvider(source, {
      ttlMs: config.cache.ttlMs,
      maxStaleMs: config.cache.maxStaleMs,
      catalog: { [MUTATION_POLICY_ID]: MUTATION_FACTS },
      onChange: ({ tenantId, policyId, from, to }) => {
        if (from === undefined) return;
        void store.head(tenantId, policyId).then((head) => {
          this.log(`policy ${tenantId}/${policyId} r${from} → r${to} (${head?.source ?? '?'} by ${head?.updatedBy ?? '?'})`);
        });
      },
      onError: (error, key) => {
        this.lastError = { message: `${key.tenantId}/${key.policyId}: ${(error as Error).message}`, at: new Date().toISOString() };
        this.log(`policy load failed: ${this.lastError.message}`);
      },
    });
  }

  static async start(
    store: PolicyStore,
    config: Pick<RuntimeConfig, 'profile' | 'store' | 'cache'>,
    log: (message: string) => void
  ) {
    await store.init();
    const service = new PolicyService(store, config, log);
    setPolicyService(service);
    await service.seed();
    service.startPolling();
    return service;
  }

  async close() {
    clearInterval(this.poller);
    this.provider.close();
    await this.store.close();
  }

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  async active(tenantId: string): Promise<{ head: PolicyHead; record: PolicyVersionRecord }> {
    assertTeam(tenantId);
    const head = await this.store.head(tenantId, MUTATION_POLICY_ID);
    if (!head) throw new Error('Policy unavailable');
    const record = await this.store.getVersion(tenantId, MUTATION_POLICY_ID, head.activeVersion);
    if (!record) throw new Error('Policy unavailable');
    return { head, record };
  }

  /** Settings shown in the dashboard. A raw policy keeps the settings of the version it replaced. */
  async activeSettings(tenantId: string): Promise<Settings> {
    const { record } = await this.active(tenantId);
    return { ...seedSettings(tenantId), ...(record.settings as Partial<Settings> | undefined) };
  }

  versions(tenantId: string, limit = 50) {
    assertTeam(tenantId);
    return this.store.listVersions(tenantId, MUTATION_POLICY_ID, limit);
  }

  health() {
    return {
      profile: this.config.profile,
      store: this.store.kind,
      push: this.pushActive ? 'store' : 'poll',
      pollMs: this.store instanceof LocalPolicyStore ? null : this.config.cache.pollMs,
      cache: this.provider.snapshot(),
      lastError: this.lastError ?? null,
    };
  }

  // -------------------------------------------------------------------------
  // Changes
  // -------------------------------------------------------------------------

  /** Compiles settings, saves them as a new version and activates it. */
  async publishSettings(
    tenantId: string,
    settings: Settings,
    expectedRevision: number,
    by: ChangedBy,
    kind: 'update' | 'reset' = 'update'
  ) {
    assertTeam(tenantId);
    const parsed = settingsSchema.parse(settings);
    compileTeamPolicy(tenantId, parsed); // validates boundary and catalog
    const previous = await this.activeSettings(tenantId);
    const head = await this.publish(tenantId, {
      policy: buildMutationPolicy(tenantId, parsed),
      settings: parsed,
      kind,
    }, expectedRevision, by);
    await this.audit(tenantId, by, kind === 'reset' ? 'RESET' : 'UPDATED', kind === 'reset' ? 'Team policy reset' : 'Team policy saved', {
      previous,
      updated: parsed,
    });
    return head;
  }

  /** Changes some settings fields (e.g. `{ slang: 8 }`). Without `expectedRevision` it uses the current one. */
  async patchSettings(tenantId: string, patch: Partial<Settings>, expectedRevision: number | undefined, by: ChangedBy) {
    const { head } = await this.active(tenantId);
    const settings = { ...(await this.activeSettings(tenantId)), ...patch };
    return this.publishSettings(tenantId, settings, expectedRevision ?? head.revision, by);
  }

  /** Copies an earlier version as a new active version. */
  async rollback(tenantId: string, toVersion: number, expectedRevision: number, by: ChangedBy) {
    const { head } = await this.active(tenantId);
    const target = await this.store.getVersion(tenantId, MUTATION_POLICY_ID, toVersion);
    if (!target || toVersion === head.activeVersion) throw new Error('Unknown policy revision');
    if (target.settings) compileTeamPolicy(tenantId, settingsSchema.parse(target.settings));
    else this.validateStored(tenantId, target.policy);
    const previous = await this.activeSettings(tenantId);
    const result = await this.publish(tenantId, {
      policy: target.policy,
      settings: (target.settings as Settings | undefined) ?? previous,
      kind: 'rollback',
      restoredFrom: toVersion,
    }, expectedRevision, by);
    await this.audit(tenantId, by, 'ROLLBACK', 'Restored revision ' + toVersion, {
      previous,
      updated: target.settings ?? previous,
      restoredFrom: toVersion,
    });
    return result;
  }

  /** Saves a raw policy (any rules over the fact catalog) as a draft. Floor rules are added at runtime. */
  async createDraft(tenantId: string, policy: Policy, by: ChangedBy, comment?: string) {
    assertTeam(tenantId);
    const stored = this.validateStored(tenantId, policy);
    return this.store.createVersion(tenantId, MUTATION_POLICY_ID, {
      status: 'draft',
      policy: stored,
      settings: await this.activeSettings(tenantId),
      kind: 'policy',
      comment,
      createdBy: by.actor,
      source: by.source,
    });
  }

  async activateVersion(tenantId: string, version: number, expectedRevision: number, by: ChangedBy) {
    assertTeam(tenantId);
    const record = await this.store.getVersion(tenantId, MUTATION_POLICY_ID, version);
    if (!record) throw new Error('Unknown policy version');
    this.validateStored(tenantId, record.policy);
    const head = await this.store.activate(tenantId, MUTATION_POLICY_ID, version, expectedRevision, by);
    this.provider.invalidate(tenantId, MUTATION_POLICY_ID);
    await this.audit(tenantId, by, 'UPDATED', `Activated version ${version}`, { version });
    return head;
  }

  /** Re-reads the store on the next call (webhook `invalidate`, manual refresh). */
  invalidate(tenantId?: string) {
    if (tenantId) this.provider.invalidate(tenantId);
    else this.provider.invalidateAll();
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private validateStored(tenantId: string, policy: Policy): Policy {
    const stored = { ...policy, tenantId, id: MUTATION_POLICY_ID, version: 1 };
    assertValidPolicy(withFloor(stored), tenantId, MUTATION_POLICY_ID, MUTATION_FACTS);
    return stored;
  }

  private async publish(
    tenantId: string,
    draft: { policy: Policy; settings?: Settings; kind: PolicyVersionRecord['kind']; restoredFrom?: number },
    expectedRevision: number,
    by: ChangedBy
  ) {
    const current = await this.store.head(tenantId, MUTATION_POLICY_ID);
    if (current && current.revision !== expectedRevision) {
      throw new Error('Policy changed. Reload the current revision.');
    }
    const record = await this.store.createVersion(tenantId, MUTATION_POLICY_ID, {
      status: 'published',
      policy: draft.policy,
      settings: draft.settings,
      kind: draft.kind,
      ...(draft.restoredFrom === undefined ? {} : { restoredFrom: draft.restoredFrom }),
      createdBy: by.actor,
      source: by.source,
    });
    const head = await this.store.activate(tenantId, MUTATION_POLICY_ID, record.version, expectedRevision, by);
    this.provider.invalidate(tenantId, MUTATION_POLICY_ID);
    return head;
  }

  private audit(tenantId: string, by: ChangedBy, event: string, reason: string, details: unknown) {
    return updateTeamState(tenantId, (state) => {
      appendAudit(state, { actor: by.actor, tool: by.source === 'mcp' ? 'update_policy' : by.source, event, reason, details });
    });
  }

  /** Creates version 1 for every team that has no policy yet. Imports settings from older state files. */
  private async seed() {
    for (const tenantId of teamIds) {
      if (await this.store.head(tenantId, MUTATION_POLICY_ID)) continue;
      const legacy = (await this.store.readTeam(tenantId))?.state as { settings?: Partial<Settings> } | undefined;
      const settings = settingsSchema.parse({ ...seedSettings(tenantId), ...legacy?.settings });
      try {
        // Exactly version 1: if another replica is seeding at the same moment, one insert wins.
        const record = await this.store.createVersion(tenantId, MUTATION_POLICY_ID, {
          status: 'published',
          policy: buildMutationPolicy(tenantId, settings),
          settings,
          kind: 'seed',
          comment: legacy?.settings ? 'Imported from earlier state' : undefined,
          createdBy: 'system',
          source: 'seed',
        }, 1);
        await this.store.activate(tenantId, MUTATION_POLICY_ID, record.version, 0, { actor: 'system', source: 'seed' });
      } catch (error) {
        if (!(error instanceof RevisionConflictError)) throw error;
        // Another replica seeded first; wait until its head is visible.
        for (let i = 0; i < 50 && !(await this.store.head(tenantId, MUTATION_POLICY_ID)); i++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    }
    // Make sure every team has operational state before the first request.
    await Promise.all(teamIds.map((team) => readTeamState(team, () => undefined)));
  }

  /** Head-revision poll: catches changes from other replicas when the store has no push, or push drops. */
  private startPolling() {
    if (this.store instanceof LocalPolicyStore) return;
    this.poller = setInterval(async () => {
      try {
        for (const head of await this.store.heads()) {
          const key = `${head.tenantId}:${head.policyId}`;
          const before = this.seen.get(key);
          this.seen.set(key, head.revision);
          if (before !== undefined && before !== head.revision) this.provider.invalidate(head.tenantId, head.policyId);
        }
      } catch (error) {
        this.lastError = { message: 'poll: ' + (error as Error).message, at: new Date().toISOString() };
      }
    }, this.config.cache.pollMs);
    this.poller.unref();
  }
}

function assertTeam(tenantId: string) {
  if (!Object.hasOwn(teamSeeds, tenantId)) throw new Error('Unknown team');
}

let service: PolicyService | undefined;

export function setPolicyService(value: PolicyService | undefined) {
  service = value;
}

export function policyService(): PolicyService {
  if (!service) throw new Error('Policy service not started');
  return service;
}
