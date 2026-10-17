import { ToolDecorator as Tool, Cache, ExecutionContext, Injectable, RateLimit, UseGuards, UseInterceptors, Widget, z } from '@nitrostack/core';
import { BouncerApiKeyGuard } from '../observability/api-key.guard.js';
import { MetricsInterceptor } from '../observability/metrics.interceptor.js';
import type { InterceptorConstructor } from '@nitrostack/core';
import { BouncerService } from './bouncer.service.js';
import { ReleaseDiffService } from './release-diff.service.js';

const packageName = z
  .string()
  .min(1)
  .max(214)
  .describe('npm package name, e.g. "axios" or "@ctrl/tinycolor"');

/**
 * Tools an AI coding agent calls before it runs `npm install`. Each one returns a verdict
 * (ALLOW / REVIEW / BLOCK), the evidence behind it, and what to do instead.
 */
@Injectable({ deps: [BouncerService, ReleaseDiffService] })
// The SDK types constructors as unknown[]; at runtime it resolves this token through DI.
@UseInterceptors(MetricsInterceptor as unknown as InterceptorConstructor)
export class BouncerTools {
  constructor(
    private readonly bouncer: BouncerService,
    private readonly releases: ReleaseDiffService,
  ) {}

  @Tool({
    name: 'bouncer_check_package',
    description:
      'Call this BEFORE `npm install <pkg>` or adding a dependency. Compares the release with the package\'s own history (publisher, provenance, install scripts, new dependencies, code diff, name) and returns ALLOW, REVIEW or BLOCK with evidence, what npm audit/OSV say, and a safe version to install instead when blocked.',
    inputSchema: z.object({
      name: packageName,
      version: z
        .string()
        .max(64)
        .optional()
        .describe('Exact version, dist-tag or range. Defaults to "latest".'),
    }),
    annotations: { readOnlyHint: true, openWorldHint: true },
    examples: {
      request: { name: 'axios', version: 'latest' },
    },
  })
  @RateLimit({ requests: 30, window: '1m', message: 'Too many checks; wait a minute.' })
  @UseGuards(BouncerApiKeyGuard)
  @Widget('verdict-card')
  async checkPackage(input: { name: string; version?: string }, ctx: ExecutionContext) {
    ctx.logger.info('check_package', { name: input.name, version: input.version });
    return this.bouncer.checkPackage(input.name.trim(), input.version);
  }

  @Tool({
    name: 'bouncer_check_upgrade',
    description:
      'Call this before bumping a dependency from one version to another. Returns the verdict on the new version plus what changed between the two (publisher, provenance, install scripts, dependencies).',
    inputSchema: z.object({
      name: packageName,
      from: z.string().max(64).describe('Version currently installed'),
      to: z.string().max(64).describe('Version the agent wants to upgrade to'),
    }),
    annotations: { readOnlyHint: true, openWorldHint: true },
    examples: {
      request: { name: 'chalk', from: '5.5.0', to: '5.6.0' },
    },
  })
  @RateLimit({ requests: 30, window: '1m', message: 'Too many checks; wait a minute.' })
  @UseGuards(BouncerApiKeyGuard)
  @Widget('verdict-card')
  async checkUpgrade(input: { name: string; from: string; to: string }, ctx: ExecutionContext) {
    ctx.logger.info('check_upgrade', input);
    return this.bouncer.checkUpgrade(input.name.trim(), input.from.trim(), input.to.trim());
  }

  @Tool({
    name: 'bouncer_safe_version',
    description:
      'Returns the newest version of a package (optionally within a semver range such as "^1.14.0") that passes every Dep Bouncer check, and which newer versions were skipped and why. Use it to pick what to install instead of a blocked release.',
    inputSchema: z.object({
      name: packageName,
      range: z.string().max(64).optional().describe('Semver range, e.g. "^5.0.0". Defaults to any stable version.'),
    }),
    annotations: { readOnlyHint: true, openWorldHint: true },
    examples: {
      request: { name: 'chalk', range: '^5.0.0' },
    },
  })
  @RateLimit({ requests: 10, window: '1m', message: 'Too many safe-version searches; wait a minute.' })
  @UseGuards(BouncerApiKeyGuard)
  async safeVersion(input: { name: string; range?: string }, ctx: ExecutionContext) {
    ctx.logger.info('safe_version', input);
    return this.bouncer.safeVersion(input.name.trim(), input.range?.trim() || '*');
  }

  @Tool({
    name: 'bouncer_review_install_scripts',
    description:
      'npm 12 skips dependency install scripts until they are approved (`npm approve-scripts`), but only shows the command. Pass the packages it lists; for each one this returns the scripts, why, and APPROVE / REVIEW / DENY. Also useful on npm 11 to see which dependencies run code at install time.',
    inputSchema: z.object({
      packages: z
        .array(
          z.object({
            name: packageName,
            version: z.string().max(64).optional().describe('Version; defaults to latest'),
          }),
        )
        .min(1)
        .max(15)
        .describe('Packages whose install scripts need a decision (max 15)'),
    }),
    annotations: { readOnlyHint: true, openWorldHint: true },
    examples: {
      request: { packages: [{ name: 'esbuild' }, { name: 'sharp' }] },
    },
  })
  @RateLimit({ requests: 5, window: '1m', message: 'Too many script reviews; wait a minute.' })
  @UseGuards(BouncerApiKeyGuard)
  async reviewInstallScripts(
    input: { packages: { name: string; version?: string }[] },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('review_install_scripts', { count: input.packages.length });
    return this.bouncer.reviewInstallScripts(input.packages);
  }

  @Tool({
    name: 'bouncer_check_manifest',
    description:
      'Checks every dependency in a package.json at the version npm would install for its range today (the newest match), e.g. before running `npm install` in a cloned repo. Runs as an MCP Task with live progress; returns BLOCK/REVIEW first, each with the reason and a safe version.',
    inputSchema: z.object({
      packageJson: z.string().min(2).max(90_000).describe('The full text of package.json (up to 90 KB)'),
      includeDev: z.boolean().default(true).describe('Also check devDependencies'),
    }),
    taskSupport: 'optional',
    annotations: { readOnlyHint: true, openWorldHint: true },
    examples: {
      request: { packageJson: '{"dependencies":{"axios":"^1.14.0","chalk":"^5.6.0"}}', includeDev: true },
    },
  })
  @RateLimit({ requests: 3, window: '1m', message: 'Too many manifest checks; wait a minute.' })
  @UseGuards(BouncerApiKeyGuard)
  async checkManifest(input: { packageJson: string; includeDev?: boolean }, ctx: ExecutionContext) {
    ctx.logger.info('check_manifest', { bytes: input.packageJson.length });
    return this.bouncer.checkManifest(
      input.packageJson,
      input.includeDev ?? true,
      (message) => {
        ctx.task?.updateProgress(message);
        ctx.logger.info(message);
      },
      () => ctx.task?.isCancelled ?? false,
    );
  }

  @Tool({
    name: 'bouncer_diff_release',
    description:
      'Raw evidence for humans: what changed between two versions of a package (publisher, provenance, install scripts, dependencies, files added/removed/changed, and risky code patterns new in this release). Use it to explain a REVIEW or BLOCK.',
    inputSchema: z.object({
      name: packageName,
      from: z.string().max(64).describe('Older version'),
      to: z.string().max(64).describe('Newer version'),
    }),
    annotations: { readOnlyHint: true, openWorldHint: true },
    examples: {
      request: { name: 'chalk', from: '5.5.0', to: '5.6.0' },
    },
  })
  @RateLimit({ requests: 20, window: '1m', message: 'Too many diffs; wait a minute.' })
  @UseGuards(BouncerApiKeyGuard)
  async diffRelease(input: { name: string; from: string; to: string }, ctx: ExecutionContext) {
    ctx.logger.info('diff_release', input);
    return this.releases.diff(input.name.trim(), input.from.trim(), input.to.trim());
  }

  @Tool({
    name: 'bouncer_replay_incident',
    description:
      'Replays a real npm hijack through Dep Bouncer, as an agent would have met it 30 minutes after publication, before any advisory existed. Incidents: axios (2026), keyv (2026), chalk (2025), nx (2025), tinycolor (2025). The malicious versions were removed from npm, so the bad release is a clearly labelled reconstruction with benign stand-in code.',
    inputSchema: z.object({
      incident: z.enum(['axios', 'keyv', 'chalk', 'nx', 'tinycolor']).describe('Which incident to replay'),
    }),
    annotations: { readOnlyHint: true, openWorldHint: false },
    examples: {
      request: { incident: 'axios' },
    },
  })
  @Widget('verdict-card')
  @UseGuards(BouncerApiKeyGuard)
  @Cache({ ttl: 3600, key: input => `bouncer:incident:${(input as { incident: string }).incident}` })
  async replayIncident(input: { incident: string }, ctx: ExecutionContext) {
    ctx.logger.info('replay_incident', input);
    return this.bouncer.replay(input.incident);
  }
}
