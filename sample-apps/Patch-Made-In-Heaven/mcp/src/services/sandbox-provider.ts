import { SandboxClient } from './sandbox.client.js';
import type { SandboxOptions, SandboxResult } from './sandbox.client.js';
import { E2BSandboxClient } from './e2b-sandbox.client.js';
import { getEnv, type AppEnv } from '../config/env.js';

export type { SandboxOptions, SandboxResult };

/**
 * Provider-agnostic sandbox execution contract (Phase 6, Decision 010).
 * `SandboxClient` (local Docker/podman, unchanged) and `E2BSandboxClient`
 * (production, NitroCloud) both satisfy this — `verify_fix` depends on the
 * interface, never a concrete provider, so which one runs is a runtime
 * selection (see `resolveSandboxProvider` below), not a hardcoded choice.
 */
export interface SandboxProvider {
  runVerification(options: SandboxOptions): Promise<SandboxResult>;
}

/**
 * Selects the sandbox provider for `verify_fix` at runtime, per Decision 010.
 * Explicit opt-in only via `SANDBOX_PROVIDER` (validated at the env-schema
 * level — `e2b` requires `E2B_API_KEY` to even load, see `config/env.ts`) —
 * defaults to local Docker/podman everywhere, including CI. This is the
 * *only* place that should ever choose `E2BSandboxClient`; scripts with their
 * own fixed sandbox needs (e.g. `verify-seeds.ts`) must keep constructing
 * `SandboxClient` directly and never call this function, so seed
 * verification can never be silently switched onto a paid remote provider.
 */
export function resolveSandboxProvider(env: AppEnv = getEnv()): SandboxProvider {
  if (env.sandbox.provider === 'e2b') {
    return new E2BSandboxClient({ env });
  }
  return new SandboxClient({ env });
}
