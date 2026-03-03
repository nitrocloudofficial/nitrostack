import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Media Query Utilities', () => {
  let originalWindow: typeof globalThis.window;
  let mockMatchMedia: jest.Mock;

  beforeEach(() => {
    jest.resetModules();

    originalWindow = globalThis.window;
    mockMatchMedia = jest.fn().mockReturnValue({ matches: false });

    // Set up a proper window mock with matchMedia
    Object.defineProperty(globalThis, 'window', {
      value: {
        matchMedia: mockMatchMedia,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
    jest.clearAllMocks();
  });

  describe('prefersReducedMotion', () => {
    it('should return true when reduced motion is preferred', async () => {
      mockMatchMedia.mockReturnValue({ matches: true });
      const { prefersReducedMotion } = await import('../media-queries.js');

      expect(prefersReducedMotion()).toBe(true);
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });

    it('should return false when reduced motion is not preferred', async () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      const { prefersReducedMotion } = await import('../media-queries.js');

      expect(prefersReducedMotion()).toBe(false);
    });
  });

  describe('isPrimarilyTouchDevice', () => {
    it('should return true for touch devices', async () => {
      mockMatchMedia.mockReturnValue({ matches: true });
      const { isPrimarilyTouchDevice } = await import('../media-queries.js');

      expect(isPrimarilyTouchDevice()).toBe(true);
      expect(mockMatchMedia).toHaveBeenCalledWith('(pointer: coarse)');
    });

    it('should return false for non-touch devices', async () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      const { isPrimarilyTouchDevice } = await import('../media-queries.js');

      expect(isPrimarilyTouchDevice()).toBe(false);
    });
  });

  describe('isHoverAvailable', () => {
    it('should return true when hover is available', async () => {
      mockMatchMedia.mockReturnValue({ matches: true });
      const { isHoverAvailable } = await import('../media-queries.js');

      expect(isHoverAvailable()).toBe(true);
      expect(mockMatchMedia).toHaveBeenCalledWith('(hover: hover)');
    });

    it('should return false when hover is not available', async () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      const { isHoverAvailable } = await import('../media-queries.js');

      expect(isHoverAvailable()).toBe(false);
    });
  });

  describe('prefersDarkColorScheme', () => {
    it('should return true when dark mode is preferred', async () => {
      mockMatchMedia.mockReturnValue({ matches: true });
      const { prefersDarkColorScheme } = await import('../media-queries.js');

      expect(prefersDarkColorScheme()).toBe(true);
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });

    it('should return false when light mode is preferred', async () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      const { prefersDarkColorScheme } = await import('../media-queries.js');

      expect(prefersDarkColorScheme()).toBe(false);
    });
  });

  describe('SSR handling', () => {
    it('should return false when window is undefined', async () => {
      jest.resetModules();
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const utils = await import('../media-queries.js');
      expect(utils.prefersReducedMotion()).toBe(false);
      expect(utils.isPrimarilyTouchDevice()).toBe(false);
      expect(utils.isHoverAvailable()).toBe(false);
      expect(utils.prefersDarkColorScheme()).toBe(false);
    });

    it('should return false when matchMedia is not available', async () => {
      jest.resetModules();
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
        configurable: true,
      });

      const utils = await import('../media-queries.js');
      expect(utils.prefersReducedMotion()).toBe(false);
      expect(utils.isPrimarilyTouchDevice()).toBe(false);
      expect(utils.isHoverAvailable()).toBe(false);
      expect(utils.prefersDarkColorScheme()).toBe(false);
    });
  });
});
