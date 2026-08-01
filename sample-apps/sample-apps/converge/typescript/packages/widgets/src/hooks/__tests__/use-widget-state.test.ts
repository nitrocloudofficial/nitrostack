import { describe, it, expect } from '@jest/globals';

describe('useWidgetState', () => {
  it('should be a function', async () => {
    const { useWidgetState } = await import('../use-widget-state.js');
    expect(typeof useWidgetState).toBe('function');
  });

  it('should be exported from hooks index', async () => {
    const hooks = await import('../index.js');
    expect(hooks.useWidgetState).toBeDefined();
    expect(typeof hooks.useWidgetState).toBe('function');
  });
});
