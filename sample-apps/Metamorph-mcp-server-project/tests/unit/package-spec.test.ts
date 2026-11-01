import { describe, it, expect } from 'vitest';
import { parsePackageSpec } from '../../src/modules/intake/package-spec.js';

describe('parsePackageSpec', () => {
  it('parses npm and Packagist specs', () => {
    expect(parsePackageSpec('npm:lodash@4.17.15')).toEqual({ name: 'lodash', ecosystem: 'npm', version: '4.17.15' });
    expect(parsePackageSpec('Packagist:guzzlehttp/guzzle@6.5.0')).toEqual({ name: 'guzzlehttp/guzzle', ecosystem: 'Packagist', version: '6.5.0' });
  });

  it('handles scoped npm names (last @ is the version separator)', () => {
    expect(parsePackageSpec('npm:@mantine/core@7.0.0')).toEqual({ name: '@mantine/core', ecosystem: 'npm', version: '7.0.0' });
  });

  it('accepts any case for the ecosystem and trims spaces', () => {
    expect(parsePackageSpec(' NPM : lodash @ 4.17.15 ')).toEqual({ name: 'lodash', ecosystem: 'npm', version: '4.17.15' });
    expect(parsePackageSpec('packagist:symfony/http-kernel@4.4.0').ecosystem).toBe('Packagist');
  });

  it('rejects malformed specs', () => {
    for (const bad of ['', 'lodash@4.17.15', 'npm:lodash', 'npm:@4.17.15', 'pypi:requests@2.0.0', ':x@1', 'npm:lodash@', 'x'.repeat(301)]) {
      expect(() => parsePackageSpec(bad), bad.slice(0, 20)).toThrow(RangeError);
    }
  });

  it('rejects injection-looking names and versions', () => {
    expect(() => parsePackageSpec('npm:lodash; rm -rf /@1.0.0')).toThrow(RangeError);
    expect(() => parsePackageSpec('npm:lodash@1.0.0 && curl evil')).toThrow(RangeError);
    expect(() => parsePackageSpec('npm:../../etc/passwd@1.0.0')).toThrow(RangeError);
  });

  it('does not echo the input in the error message', () => {
    try { parsePackageSpec('npm:secret-token-abc123'); } catch (e) { expect(String((e as Error).message)).not.toContain('secret-token'); }
  });
});
