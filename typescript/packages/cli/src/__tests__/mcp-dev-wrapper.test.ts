import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('MCP Dev Wrapper', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should export run function', async () => {
    const module = await import('../mcp-dev-wrapper.js');
    expect(typeof module.run).toBe('function');
  });
});
