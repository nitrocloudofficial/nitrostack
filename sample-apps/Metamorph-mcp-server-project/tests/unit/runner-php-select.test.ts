import { describe, it, expect } from 'vitest';
// @ts-expect-error plain ESM module without type declarations
import { parseConstraint, satisfies, selectPhp, lockIsStub } from '../../runner/php-select.mjs';

const installed = [
  { label: '7.4', version: '7.4.33' },
  { label: '8.1', version: '8.1.34' },
  { label: '8.3', version: '8.3.36' },
  { label: '8.4', version: '8.4.27' }
];
const sat = (v: string, c: string) => satisfies(v, parseConstraint(c));
const pick = (composerJson: unknown, lock?: unknown) => selectPhp({ composerJson, lock, installed, defaultLabel: '8.4' });

describe('php constraint evaluation', () => {
  it('handles caret, tilde, ranges, wildcards, OR and hyphen ranges', () => {
    expect(sat('7.4.33', '^7.1.3')).toBe(true);
    expect(sat('8.1.34', '^7.1.3')).toBe(false);
    expect(sat('8.4.27', '>=7.2')).toBe(true);
    expect(sat('7.4.33', '>= 7.2, < 8')).toBe(true);
    expect(sat('8.1.34', '>=5.6 <8')).toBe(false);
    expect(sat('7.4.33', '7.4.*')).toBe(true);
    expect(sat('8.1.34', '7.4.*')).toBe(false);
    expect(sat('8.3.36', '^7.4 || ^8.0')).toBe(true);
    expect(sat('8.4.27', '~8.3.0')).toBe(false);
    expect(sat('8.3.36', '~8.3.0')).toBe(true);
    expect(sat('7.4.33', '7.2 - 7.4')).toBe(true);
    expect(sat('8.4.27', '^8.4')).toBe(true);
    expect(sat('8.4.27', '!=8.4.*')).toBe(false);
  });
  it('returns undefined for constraints it does not understand', () => {
    expect(parseConstraint('dev-master')).toBeUndefined();
    expect(parseConstraint('')).toBeUndefined();
  });
});

describe('selectPhp', () => {
  it('uses the default when the project states no PHP requirement', () => {
    expect(pick({ require: {} })).toMatchObject({ supported: true, selected: '8.4', constraintSource: 'default' });
  });
  it('picks the lowest installed version the project allows', () => {
    expect(pick({ require: { php: '>=7.2' } })).toMatchObject({ selected: '7.4', constraint: '>=7.2', constraintSource: 'require.php' });
    expect(pick({ require: { php: '^7.1.3' } }).selected).toBe('7.4');
    expect(pick({ require: { php: '^8.2' } }).selected).toBe('8.3');
    expect(pick({ require: { php: '^8.4' } }).selected).toBe('8.4');
  });
  it('follows config.platform.php, nearest at or above', () => {
    expect(pick({ require: { php: '>=7.2' }, config: { platform: { php: '8.2.0' } } }).selected).toBe('8.3');
    expect(pick({ require: { php: '>=7.2' }, config: { platform: { php: '7.4.1' } } }).selected).toBe('7.4');
    expect(pick({ config: { platform: { php: '8.1' } } })).toMatchObject({ selected: '8.1', constraintSource: 'config.platform.php' });
  });
  it('reports no supported version instead of substituting 8.4', () => {
    const r = pick({ require: { php: '^5.6' } });
    expect(r.supported).toBe(false);
    expect(r.selected).toBeUndefined();
    expect(r.reason).toBe('no supported PHP version for constraint ^5.6 (installed: 7.4, 8.1, 8.3, 8.4)');
    expect(pick({ require: { php: '^9.0' } }).supported).toBe(false);
  });
  it('narrows by the php requirements of locked packages', () => {
    const lock = { packages: [{ name: 'a/b', require: { php: '^8.1' } }], 'packages-dev': [] };
    expect(pick({ require: { php: '>=7.2' } }, lock).selected).toBe('8.1');
    expect(pick({ require: {} }, lock)).toMatchObject({ selected: '8.1', constraintSource: 'composer.lock' });
  });
  it('does not claim support when a constraint cannot be parsed and no default exists', () => {
    const r = selectPhp({ composerJson: { require: { php: 'dev-foo' } }, installed: [{ label: '7.4', version: '7.4.33' }], defaultLabel: '8.4' });
    expect(r.supported).toBe(false);
  });
});

describe('lockIsStub', () => {
  it('flags locks whose packages have no dist or source', () => {
    expect(lockIsStub({ packages: [{ name: 'a', version: '1.0.0' }] })).toBe(true);
    expect(lockIsStub({ packages: [{ name: 'a', version: '1.0.0', dist: { url: 'x' } }] })).toBe(false);
    expect(lockIsStub({ packages: [] })).toBe(false);
    expect(lockIsStub(undefined)).toBe(false);
  });
});
