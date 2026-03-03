import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Upgrade Command', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should export upgradeCommand function', async () => {
    const module = await import('../commands/upgrade.js');
    expect(typeof module.upgradeCommand).toBe('function');
  });
});
