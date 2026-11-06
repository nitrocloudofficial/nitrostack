import { describe, it, expect } from 'vitest';
import { nextPref, resolveTheme } from '../../src/widgets/lib/theme.js';

describe('resolveTheme', () => {
  it('uses the host theme when the user has not chosen', () => {
    expect(resolveTheme({ host: 'dark', pref: 'auto', system: 'light' })).toBe('dark');
    expect(resolveTheme({ host: 'light', system: 'dark' })).toBe('light');
  });
  it('keeps the user choice over the host, also when the host changes', () => {
    expect(resolveTheme({ host: 'dark', pref: 'light', system: 'dark' })).toBe('light');
    expect(resolveTheme({ host: 'light', pref: 'dark' })).toBe('dark');
  });
  it('falls back to the system preference, then to null', () => {
    expect(resolveTheme({ host: null, pref: 'auto', system: 'dark' })).toBe('dark');
    expect(resolveTheme({})).toBeNull();
  });
  it('cycles auto -> light -> dark -> auto', () => {
    expect(nextPref(nextPref(nextPref('auto')))).toBe('auto');
    expect(nextPref('auto')).toBe('light');
  });
});
