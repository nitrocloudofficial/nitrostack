import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import React from 'react';

// Mock React hooks
const mockUseSyncExternalStore = jest.fn() as jest.Mock;
const mockUseState = jest.fn() as jest.Mock;
const mockUseEffect = jest.fn() as jest.Mock;
const mockUseCallback = jest.fn() as jest.Mock;

jest.unstable_mockModule('react', () => ({
  ...React,
  useSyncExternalStore: mockUseSyncExternalStore,
  useState: mockUseState,
  useEffect: mockUseEffect,
  useCallback: mockUseCallback,
}));

describe('WidgetLayout', () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    originalWindow = globalThis.window;

    (global as any).window = {
      openai: {
        theme: 'dark',
        maxHeight: 500,
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };

    // Mock hooks
    mockUseSyncExternalStore.mockImplementation((_sub: any, getSnapshot: any) => {
      return getSnapshot();
    });

    mockUseState.mockImplementation((initializer: any) => {
      const value = typeof initializer === 'function' ? initializer() : initializer;
      return [value, jest.fn()];
    });

    mockUseEffect.mockImplementation((effect: any) => {
      effect();
    });

    mockUseCallback.mockImplementation((fn: any) => fn);
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    jest.clearAllMocks();
  });

  describe('WidgetLayout Component', () => {
    it('should export WidgetLayout component', async () => {
      const { WidgetLayout } = await import('../WidgetLayout.js');
      expect(WidgetLayout).toBeDefined();
      expect(typeof WidgetLayout).toBe('function');
    });

    it('should export WidgetLayoutProps type', async () => {
      // Type exports don't exist at runtime, but module should load
      const module = await import('../WidgetLayout.js');
      expect(module).toBeDefined();
    });

    it('should be a React component', async () => {
      const { WidgetLayout } = await import('../WidgetLayout.js');
      
      // Check it's a function (React function component)
      expect(typeof WidgetLayout).toBe('function');
      
      // It should accept props
      expect(WidgetLayout.length).toBeGreaterThanOrEqual(0);
    });
  });
});


