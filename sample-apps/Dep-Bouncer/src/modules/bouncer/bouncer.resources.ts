import { ResourceDecorator as Resource, Cache, ExecutionContext, Injectable } from '@nitrostack/core';
import { POLICY } from '../analysis/verdict.js';
import { SEVERITY_WEIGHT } from '../analysis/signal.js';
import { IncidentsService } from '../incidents/incidents.service.js';
import { MetricsService } from '../observability/metrics.service.js';

const SIGNALS = [
  { id: 'provenance-drop', catches: 'nx 2025, axios 2026', looksFor: 'previous releases were built and signed by CI (provenance); this one was not' },
  { id: 'publisher-change', catches: 'axios 2026', looksFor: 'a personal account publishing where CI (trusted publishing) always did, or a never-seen publisher' },
  { id: 'install-script', catches: 'nx, Shai-Hulud, keyv', looksFor: 'a new or changed preinstall/install/postinstall script' },
  { id: 'new-deps', catches: 'axios 2026', looksFor: 'new dependencies that are days old, run install scripts, copy a popular name, or are never imported' },
  { id: 'code-diff', catches: 'chalk/debug, nx, Shai-Hulud, keyv', looksFor: 'code new to this release: obfuscation, exec, credential paths, exfiltration hosts, wallet hooks, AI-agent abuse, persistence, packed payloads' },
  { id: 'release-timing', catches: 'all (weak alone)', looksFor: 'published in the last 24 h; bursts of versions' },
  { id: 'name-check', catches: 'typosquats, hallucinated names', looksFor: 'look-alikes of popular packages with few downloads or a recent creation date' },
  { id: 'known-advisory', catches: 'anything OSV already lists', looksFor: 'an OSV MAL- (malware) entry for the exact version' },
];

/** Read-only context an agent (or a judge) can inspect: the policy and the incident library. */
@Injectable({ deps: [IncidentsService, MetricsService] })
export class BouncerResources {
  constructor(
    private readonly incidents: IncidentsService,
    private readonly metrics: MetricsService,
  ) {}

  @Resource({
    uri: 'bouncer://policy',
    name: 'Dep Bouncer policy',
    description: 'The signals Dep Bouncer runs, their weights, and how findings become ALLOW / REVIEW / BLOCK.',
    mimeType: 'application/json',
  })
  @Cache({ ttl: 3600 })
  async policy(_uri: string, ctx: ExecutionContext) {
    ctx.logger.info('policy resource');
    const body = {
      verdicts: {
        ALLOW: `score < ${POLICY.reviewAt}`,
        REVIEW: `${POLICY.reviewAt} <= score < ${POLICY.blockAt}`,
        BLOCK: `score >= ${POLICY.blockAt}, or any critical finding`,
      },
      rule: POLICY.rule,
      severityWeights: SEVERITY_WEIGHT,
      signals: SIGNALS,
      guarantees: [
        'never executes package code',
        'downloads tarballs only from registry.npmjs.org, in memory, with size and file-count caps',
        'no API keys; uses only the public npm registry, npm downloads API and OSV',
      ],
    };
    return body;
  }

  @Resource({
    uri: 'incidents://list',
    name: 'Replayable npm hijacks',
    description: 'Real npm hijacks Dep Bouncer can replay, with how long the free advisory database (OSV) took to list each one.',
    mimeType: 'application/json',
  })
  @Cache({ ttl: 3600 })
  async list(_uri: string, ctx: ExecutionContext) {
    ctx.logger.info('incidents list resource');
    const body = this.incidents.list().map((i) => ({
      ...i,
      replay: `bouncer_replay_incident {"incident": "${i.id}"}`,
    }));
    return body;
  }

  @Resource({
    uri: 'bouncer://stats',
    name: 'Dep Bouncer statistics',
    description: 'Live uptime, version, tool call/error counts, latency percentiles and verdict totals. No request contents or client identifiers.',
    mimeType: 'application/json',
  })
  async stats(_uri: string, _ctx: ExecutionContext) {
    return this.metrics.snapshot();
  }
}
