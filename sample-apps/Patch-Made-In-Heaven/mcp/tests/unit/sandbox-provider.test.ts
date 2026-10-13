import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { resolveSandboxProvider, type SandboxProvider } from '../../src/services/sandbox-provider.js';
import { SandboxClient } from '../../src/services/sandbox.client.js';
import { E2BSandboxClient } from '../../src/services/e2b-sandbox.client.js';
import { loadEnv } from '../../src/config/env.js';

describe('SandboxProvider interface conformance', () => {
  it('SandboxClient structurally satisfies SandboxProvider (compile-time + runtime check)', () => {
    const provider: SandboxProvider = new SandboxClient();
    expect(typeof provider.runVerification).toBe('function');
  });
});

describe('resolveSandboxProvider (Decision 010 runtime selection)', () => {
  it('defaults to SandboxClient (local Docker/podman) with no explicit config', () => {
    const provider = resolveSandboxProvider(loadEnv({} as NodeJS.ProcessEnv));
    expect(provider).toBeInstanceOf(SandboxClient);
  });

  it('selects E2BSandboxClient only when SANDBOX_PROVIDER=e2b is explicitly set', () => {
    const provider = resolveSandboxProvider(
      loadEnv({ SANDBOX_PROVIDER: 'e2b', E2B_API_KEY: 'e2b_test_key' } as NodeJS.ProcessEnv)
    );
    expect(provider).toBeInstanceOf(E2BSandboxClient);
  });

  it('never selects E2BSandboxClient just because E2B_API_KEY happens to be set without the explicit opt-in', () => {
    // SANDBOX_PROVIDER defaults to 'local' regardless of E2B_API_KEY's presence —
    // no auto-detection, per Decision 010's explicit-opt-in-only requirement.
    const provider = resolveSandboxProvider(loadEnv({ E2B_API_KEY: 'e2b_test_key' } as NodeJS.ProcessEnv));
    expect(provider).toBeInstanceOf(SandboxClient);
  });
});

describe('verify-seeds.ts is never routed through provider selection', () => {
  it('hardcodes SandboxClient directly and never imports resolveSandboxProvider (Phase 1 seed verification stays local-only, always)', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const scriptSource = fs.readFileSync(
      path.join(currentDir, '../../src/scripts/verify-seeds.ts'),
      'utf-8'
    );
    expect(scriptSource).toMatch(/new SandboxClient\(/);
    expect(scriptSource).not.toMatch(/resolveSandboxProvider/);
    expect(scriptSource).not.toMatch(/E2BSandboxClient/);
  });
});
