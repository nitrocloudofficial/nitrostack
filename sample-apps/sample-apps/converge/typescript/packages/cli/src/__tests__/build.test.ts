import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Build Command', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should export buildCommand function', async () => {
    const module = await import('../commands/build.js');
    expect(typeof module.buildCommand).toBe('function');
  });
});
