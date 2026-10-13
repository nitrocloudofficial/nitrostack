import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Generate Command', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should export generate function', async () => {
    const module = await import('../commands/generate.js');
    expect(typeof module.generate).toBe('function');
  });
});
