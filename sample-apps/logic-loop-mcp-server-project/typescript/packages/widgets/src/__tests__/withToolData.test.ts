import { describe, it, expect } from '@jest/globals';

describe('withToolData HOC', () => {
  it('should export withToolData function', async () => {
    const { withToolData } = await import('../withToolData.js');
    expect(withToolData).toBeDefined();
    expect(typeof withToolData).toBe('function');
  });
});


