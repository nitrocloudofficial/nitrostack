import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Simple test that doesn't require complex ESM mocking
describe('Dev Command', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should export devCommand function', async () => {
    const module = await import('../commands/dev.js');
    expect(typeof module.devCommand).toBe('function');
  });
});
