import { describe, it, expect } from '@jest/globals';

// Note: These tests verify the hook exports and basic structure.
// Full integration testing of React hooks requires a proper React testing setup
// with @testing-library/react-hooks or similar.

describe('Widget Hooks Exports', () => {
  describe('useOpenAiGlobal', () => {
    it('should be exported', async () => {
      const { useOpenAiGlobal } = await import('../use-openai-global.js');
      expect(useOpenAiGlobal).toBeDefined();
      expect(typeof useOpenAiGlobal).toBe('function');
    });
  });

  describe('useTheme', () => {
    it('should be exported', async () => {
      const { useTheme } = await import('../use-theme.js');
      expect(useTheme).toBeDefined();
      expect(typeof useTheme).toBe('function');
    });
  });

  describe('useDisplayMode', () => {
    it('should be exported', async () => {
      const { useDisplayMode } = await import('../use-display-mode.js');
      expect(useDisplayMode).toBeDefined();
      expect(typeof useDisplayMode).toBe('function');
    });
  });

  describe('useMaxHeight', () => {
    it('should be exported', async () => {
      const { useMaxHeight } = await import('../use-max-height.js');
      expect(useMaxHeight).toBeDefined();
      expect(typeof useMaxHeight).toBe('function');
    });
  });

  describe('useWidgetState', () => {
    it('should be exported', async () => {
      const { useWidgetState } = await import('../use-widget-state.js');
      expect(useWidgetState).toBeDefined();
      expect(typeof useWidgetState).toBe('function');
    });
  });

  describe('useWidgetSDK', () => {
    it('should be exported', async () => {
      const { useWidgetSDK } = await import('../useWidgetSDK.js');
      expect(useWidgetSDK).toBeDefined();
      expect(typeof useWidgetSDK).toBe('function');
    });
  });

  describe('hooks index', () => {
    it('should export all hooks', async () => {
      const hooks = await import('../index.js');
      expect(hooks.useOpenAiGlobal).toBeDefined();
      expect(hooks.useTheme).toBeDefined();
      expect(hooks.useDisplayMode).toBeDefined();
      expect(hooks.useMaxHeight).toBeDefined();
      expect(hooks.useWidgetState).toBeDefined();
      expect(hooks.useWidgetSDK).toBeDefined();
    });
  });
});
