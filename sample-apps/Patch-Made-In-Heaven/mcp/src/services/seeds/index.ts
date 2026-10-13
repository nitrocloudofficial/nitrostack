import type { EnvironmentMeta } from '../../domain/knowledge-card.js';
import { PYTHON_SEED_FIXTURES } from './python.js';
import { NODE_SEED_FIXTURES } from './node.js';
import { DOCKER_SEED_FIXTURES } from './docker.js';
import { GENERAL_SEED_FIXTURES } from './general.js';

/**
 * Shared seed fixture contract for Checkpoints 6-9. A fixture is NOT yet a
 * Knowledge Card — it is a reproducible bug/fix pair that `verify-seeds.ts`
 * actually runs through the Docker sandbox to produce real PASS evidence
 * before it can become a trusted card. No fixture here is pre-verified data;
 * the evidence only exists once someone runs `npm run seed:verify`.
 */
export type SeedCategory = 'python' | 'node' | 'docker' | 'general';

/**
 * How `verify-seeds.ts` reproduces a fixture:
 * - 'sandbox': write `main.<fileExtension>` and run `testCommand` inside the
 *   locked-down SandboxClient container (python/node fixtures).
 * - 'docker-build': write `brokenCode`/`fixedCode` as a Dockerfile in a fresh
 *   temp build context and run `<runtime> build` directly on the HOST (never
 *   nested inside a sandboxed container — that would require mounting the
 *   Docker socket into an untrusted container, which is never allowed).
 * - 'compose-config': same host-level invocation, running
 *   `<runtime> compose -f <file> config` to validate structure.
 */
export type SeedVerificationMethod = 'sandbox' | 'docker-build' | 'compose-config';

export interface SeedFixtureDefinition {
  /** Stable, lowercase slug id. Must be unique across the entire corpus. */
  id: string;
  problem: string;
  errorType: string;
  category: SeedCategory;
  environment: EnvironmentMeta;
  /** Code that reproduces the bug. Verifying it must FAIL. */
  brokenCode: string;
  /** Code after applying the fix. Verifying it must PASS. */
  fixedCode: string;
  /** For 'sandbox': command run inside the sandbox, cwd `/workspace`, against `main.<fileExtension>`. Unused otherwise. */
  testCommand: string;
  fileExtension: string;
  /** Defaults to 'sandbox' when omitted. */
  verificationMethod?: SeedVerificationMethod;
}

export const ALL_SEED_FIXTURES: SeedFixtureDefinition[] = [
  ...PYTHON_SEED_FIXTURES,
  ...NODE_SEED_FIXTURES,
  ...DOCKER_SEED_FIXTURES,
  ...GENERAL_SEED_FIXTURES,
];

export function getFixturesByCategory(category: SeedCategory): SeedFixtureDefinition[] {
  return ALL_SEED_FIXTURES.filter((fixture) => fixture.category === category);
}
