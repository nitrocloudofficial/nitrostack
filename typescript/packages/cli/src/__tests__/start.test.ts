import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Start Command', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should export startCommand function', async () => {
    const module = await import('../commands/start.js');
    expect(typeof module.startCommand).toBe('function');
  });
});
