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

import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Policy } from '@nitrostack/core/guardrails';
import { z } from '@nitrostack/core';
import type { RuntimeConfig } from '../runtime/config.js';
import { bearerToken } from '../runtime/identity.js';
import { RevisionConflictError, type ChangeSource } from '../runtime/store/types.js';
import { resolveBearer } from '../modules/brandvoice/guardrails/access.guardrails.js';
import { MUTATION_POLICY_ID, withFloor } from '../modules/brandvoice/guardrails/mutation.policy.js';
import { policyImpact } from '../modules/brandvoice/guardrails/policy-impact.js';
import { policyService, type ChangedBy } from '../modules/brandvoice/guardrails/policy-service.js';
import { compileTeamPolicy } from '../modules/brandvoice/guardrails/policy-settings.js';
import { settingsSchema } from '../modules/brandvoice/domain/schemas.js';
import { readTeamState } from '../modules/brandvoice/state/team-state.js';

/**
 * Control plane: change guardrails at runtime without redeploying.
 *
 *   GET    /guardrails/v1/policies/:tenant
 *   GET    /guardrails/v1/policies/:tenant/:policyId                 ETag: <revision>
 *   GET    /guardrails/v1/policies/:tenant/:policyId/versions?limit=
 *   POST   /guardrails/v1/policies/:tenant/:policyId/versions        { policy, comment } -> draft
 *   POST   /guardrails/v1/policies/:tenant/:policyId/simulate        { settings } | { policy }
 *   POST   /guardrails/v1/policies/:tenant/:policyId/activate        { version } + If-Match
 *   PATCH  /guardrails/v1/policies/:tenant/:policyId/settings        { slang: 8, ... } [+ If-Match]
 *   POST   /guardrails/v1/policies/:tenant/:policyId/rollback        { toVersion } [+ If-Match]
 *   POST   /guardrails/webhook                                       HMAC-signed
 *   GET    /healthz/guardrails
 *
 * Admins authenticate with the control-plane admin key (any team) or with an MCP identity
 * that has the admin role (its own team only). It listens on its own port, on the same host
 * as the MCP server.
 */

const MAX_BODY = 256 * 1024;
const REPLAY_WINDOW_S = 300;

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

type Admin = { actor: string; tenant?: string; source: ChangeSource };

export function startControlPlane(config: RuntimeConfig, log: (message: string) => void) {
  const deliveries = new Set<string>();

  async function authenticate(req: IncomingMessage, tenant: string): Promise<Admin> {
    const token = bearerToken(req.headers.authorization);
    const source: ChangeSource = req.headers['x-change-source'] === 'cli' ? 'cli' : 'api';
    if (token && config.admin.key && safeEqual(token, config.admin.key)) return { actor: 'admin-key', source };
    const identity = await resolveBearer(req.headers.authorization);
    if (!identity) throw new HttpError(401, 'Missing or invalid credentials');
    if (!identity.scopes.includes('admin') || identity.tenantId !== tenant) {
      throw new HttpError(403, 'Admin role for this team required');
    }
    return { actor: identity.principalId, tenant, source };
  }

  async function policies(req: IncomingMessage, res: ServerResponse, parts: string[], raw: string) {
    const [tenant, policyId, action] = parts;
    const admin = await authenticate(req, tenant);
    const by: ChangedBy = { actor: admin.actor, source: admin.source };
    const service = policyService();
    const body = raw ? parseJson(raw) : {};
    const ifMatch = req.headers['if-match'] ? Number(String(req.headers['if-match']).replace(/"/g, '')) : undefined;
    const current = async () => (await service.active(tenant)).head.revision;

    if (!policyId) {
      if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed');
      const { head } = await service.active(tenant);
      return send(res, 200, { policies: [head] });
    }
    if (policyId !== MUTATION_POLICY_ID) throw new HttpError(404, 'Unknown policy');

    switch (`${req.method} ${action ?? ''}`) {
      case 'GET ': {
        const { head, record } = await service.active(tenant);
        const effective = await service.provider.getActive(tenant, policyId);
        res.setHeader('ETag', `"${head.revision}"`);
        return send(res, 200, { head, version: record, settings: await service.activeSettings(tenant), effective });
      }
      case 'GET versions': {
        const limit = Math.min(Math.max(Number(new URL(req.url!, 'http://x').searchParams.get('limit')) || 20, 1), 100);
        return send(res, 200, { versions: await service.versions(tenant, limit) });
      }
      case 'POST versions': {
        if (!body.policy) throw new HttpError(422, 'Body must include "policy"');
        return send(res, 201, await service.createDraft(tenant, body.policy as Policy, by, body.comment as string));
      }
      case 'POST simulate': {
        const draft = body.policy
          ? withFloor({ ...(body.policy as Policy), tenantId: tenant, id: policyId })
          : compileTeamPolicy(tenant, settingsSchema.parse({ ...(await service.activeSettings(tenant)), ...(body.settings as object) }));
        const active = await service.provider.getActive(tenant, policyId);
        return send(res, 200, await readTeamState(tenant, (state) =>
          policyImpact(active, draft, state.decisions, state.approvals.filter((a) => a.status === 'pending').length)
        ));
      }
      case 'POST activate': {
        const head = await service.activateVersion(tenant, Number(body.version), ifMatch ?? (await current()), by);
        return send(res, 200, head);
      }
      case 'PATCH settings': {
        const patch = settingsSchema.partial().strict().parse(body);
        return send(res, 200, await service.patchSettings(tenant, patch, ifMatch, by));
      }
      case 'POST rollback': {
        const head = await service.rollback(tenant, Number(body.toVersion), ifMatch ?? (await current()), by);
        return send(res, 200, head);
      }
      default:
        throw new HttpError(404, 'Not found');
    }
  }

  async function webhook(req: IncomingMessage, res: ServerResponse, raw: string) {
    const timestamp = String(req.headers['x-nitro-timestamp'] ?? '');
    const signature = String(req.headers['x-nitro-signature'] ?? '').replace(/^sha256=/, '');
    const delivery = String(req.headers['x-nitro-delivery'] ?? '');
    if (!/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > REPLAY_WINDOW_S) {
      throw new HttpError(401, 'Stale or missing timestamp');
    }
    const valid = config.webhook.secrets.some((secret) =>
      safeEqual(signature, createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex'))
    );
    if (!valid) throw new HttpError(401, 'Invalid signature');
    if (delivery) {
      if (deliveries.has(delivery)) return send(res, 200, { duplicate: true });
      deliveries.add(delivery);
      if (deliveries.size > 1000) deliveries.delete(deliveries.values().next().value!);
    }

    const event = parseJson(raw);
    const tenant = typeof event.tenantId === 'string' ? event.tenantId : undefined;
    const by: ChangedBy = { actor: typeof event.actor === 'string' ? event.actor : 'webhook', source: 'webhook' };

    if (event.type === 'policy.changed') {
      policyService().invalidate(tenant);
      log(`webhook: refresh ${tenant ?? 'all teams'}`);
      return send(res, 202, { refreshed: tenant ?? 'all' });
    }
    if (event.type === 'policy.activate') {
      if (config.webhook.mode !== 'activate') throw new HttpError(403, 'Set GUARDRAILS_WEBHOOK_MODE=activate to accept policy changes by webhook');
      if (!tenant) throw new HttpError(422, 'tenantId required');
      const expected = typeof event.expectedRevision === 'number' ? event.expectedRevision : undefined;
      const head = await policyService().patchSettings(tenant, settingsSchema.partial().strict().parse(event.settings ?? {}), expected, by);
      return send(res, 200, head);
    }
    throw new HttpError(422, 'Unknown event type');
  }

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const raw = await readBody(req);
      if (url.pathname === '/healthz/guardrails' && req.method === 'GET') {
        const health = policyService().health();
        return send(res, 200, { ...health, cache: health.cache.map(({ tenantId, version, fresh }) => ({ tenantId, revision: version, fresh })) });
      }
      if (url.pathname === '/guardrails/webhook' && req.method === 'POST') return await webhook(req, res, raw);
      const match = /^\/guardrails\/v1\/policies\/([\w-]+)(?:\/([\w-]+))?(?:\/(versions|simulate|activate|settings|rollback))?\/?$/.exec(url.pathname);
      if (match) return await policies(req, res, match.slice(1).filter(Boolean), raw);
      throw new HttpError(404, 'Not found');
    } catch (error) {
      const status =
        error instanceof HttpError ? error.status
        : error instanceof RevisionConflictError || /Policy changed/.test((error as Error).message) ? 412
        : error instanceof z.ZodError || error instanceof SyntaxError ? 422
        : /Unknown team|Unknown policy/.test((error as Error).message) ? 404
        : /boundary|invalid|Invalid|catalog/.test((error as Error).message) ? 422
        : 500;
      if (status === 500) log(`control plane error: ${(error as Error).stack ?? error}`);
      const message = error instanceof z.ZodError ? error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') : (error as Error).message;
      send(res, status, { error: status === 500 ? 'Internal error' : message });
    }
  });
  server.listen(config.adminPort, config.host);
  return server;
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function parseJson(raw: string): Record<string, unknown> {
  const value = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(422, 'Body must be a JSON object');
  return value;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function readBody(req: IncomingMessage) {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, 'Body too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}
