import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Simple test that doesn't require complex ESM mocking
describe('Init Command', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should export initCommand function', async () => {
    // Use dynamic import to test exports
    const module = await import('../commands/init.js');
    expect(typeof module.initCommand).toBe('function');
  });
});
