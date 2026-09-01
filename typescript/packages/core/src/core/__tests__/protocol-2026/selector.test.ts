/**
 * Protocol selector resolution (2026-07-28 dual-spec).
 *
 * Verifies that `NITRO_MCP_PROTOCOL_VERSION` (env) and `McpServerConfig.protocolVersion`
 * (config) resolve to the right era, that env wins over config, and that unset /
 * unknown values keep the default legacy path.
 */

describe('protocol/version selector', () => {
  const ENV_VAR = 'NITRO_MCP_PROTOCOL_VERSION';
  const original = process.env[ENV_VAR];

  afterEach(() => {
    if (original === undefined) {
      delete process.env[ENV_VAR];
    } else {
      process.env[ENV_VAR] = original;
    }
  });

  it('normalizes modern aliases to "modern"', async () => {
    const { normalizeProtocolEra } = await import('../../protocol/version.js');
    for (const v of ['2026-07-28', '2026', 'modern', 'latest', 'MODERN', '  2026-07-28 ']) {
      expect(normalizeProtocolEra(v)).toBe('modern');
    }
  });

  it('normalizes auto aliases to "auto"', async () => {
    const { normalizeProtocolEra } = await import('../../protocol/version.js');
    for (const v of ['auto', 'both', 'dual', 'dual-spec', 'AUTO']) {
      expect(normalizeProtocolEra(v)).toBe('auto');
    }
  });

  it('normalizes legacy / unset / unknown to "legacy"', async () => {
    const { normalizeProtocolEra } = await import('../../protocol/version.js');
    for (const v of ['2025-06-18', '2025-11-25', '2025', 'legacy', '', '   ', 'banana', undefined, null]) {
      expect(normalizeProtocolEra(v)).toBe('legacy');
    }
  });

  it('defaults to legacy when nothing is set (backwards compatible)', async () => {
    delete process.env[ENV_VAR];
    const { resolveProtocolEra } = await import('../../protocol/version.js');
    expect(resolveProtocolEra()).toBe('legacy');
    expect(resolveProtocolEra(undefined)).toBe('legacy');
  });

  it('uses config value when env is unset', async () => {
    delete process.env[ENV_VAR];
    const { resolveProtocolEra } = await import('../../protocol/version.js');
    expect(resolveProtocolEra('2026-07-28')).toBe('modern');
    expect(resolveProtocolEra('auto')).toBe('auto');
    expect(resolveProtocolEra('2025-06-18')).toBe('legacy');
  });

  it('lets env win over config so a deployed app can be flipped', async () => {
    process.env[ENV_VAR] = '2026-07-28';
    const { resolveProtocolEra } = await import('../../protocol/version.js');
    // config says legacy, env says modern -> modern
    expect(resolveProtocolEra('2025-06-18')).toBe('modern');
    process.env[ENV_VAR] = 'legacy';
    expect(resolveProtocolEra('2026-07-28')).toBe('legacy');
  });

  it('reports which engines each era needs', async () => {
    const { needsModernEngine, needsLegacyEngine } = await import('../../protocol/version.js');
    expect(needsModernEngine('modern')).toBe(true);
    expect(needsModernEngine('auto')).toBe(true);
    expect(needsModernEngine('legacy')).toBe(false);

    expect(needsLegacyEngine('legacy')).toBe(true);
    expect(needsLegacyEngine('auto')).toBe(true);
    expect(needsLegacyEngine('modern')).toBe(false);
  });

  it('advertises the right wire revision per era', async () => {
    const { protocolVersionForEra, MODERN_PROTOCOL_VERSION, LEGACY_PROTOCOL_VERSION } = await import(
      '../../protocol/version.js'
    );
    expect(protocolVersionForEra('legacy')).toBe(LEGACY_PROTOCOL_VERSION);
    expect(protocolVersionForEra('modern')).toBe(MODERN_PROTOCOL_VERSION);
    // auto advertises the newest supported revision
    expect(protocolVersionForEra('auto')).toBe(MODERN_PROTOCOL_VERSION);
  });
});
