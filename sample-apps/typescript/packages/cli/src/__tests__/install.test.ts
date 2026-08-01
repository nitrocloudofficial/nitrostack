import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Install Command', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should export installCommand function', async () => {
    const module = await import('../commands/install.js');
    expect(typeof module.installCommand).toBe('function');
  });
});
