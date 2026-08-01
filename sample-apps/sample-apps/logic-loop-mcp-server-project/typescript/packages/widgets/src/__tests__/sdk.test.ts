import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('WidgetSDK', () => {
  beforeEach(() => {
    jest.resetModules();
    // Clear any existing openai property
    if ('openai' in window) {
      delete (window as any).openai;
    }
  });

  afterEach(() => {
    // Clean up
    if ('openai' in window) {
      delete (window as any).openai;
    }
  });

  describe('singleton pattern', () => {
    it('should return same instance from getInstance', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const instance1 = WidgetSDK.getInstance();
      const instance2 = WidgetSDK.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return same instance from getWidgetSDK', async () => {
      const { WidgetSDK, getWidgetSDK } = await import('../sdk.js');
      const instance = getWidgetSDK();
      expect(instance).toBe(WidgetSDK.getInstance());
    });
  });

  describe('isReady', () => {
    it('should return false when window.openai is missing', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.isReady()).toBe(false);
    });

    it('should return true when window.openai exists', async () => {
      (window as any).openai = { theme: 'dark' };
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.isReady()).toBe(true);
    });
  });

  describe('state management', () => {
    it('should throw when setting state if not ready', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      await expect(sdk.setState({ key: 'value' })).rejects.toThrow('not ready');
    });

    it('should return null for getState when not ready', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.getState()).toBeNull();
    });

    it('should return widgetState when ready', async () => {
      (window as any).openai = { widgetState: { count: 5 } };
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.getState()).toEqual({ count: 5 });
    });

    it('should call setWidgetState when ready', async () => {
      const mockSetWidgetState = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      (window as any).openai = { setWidgetState: mockSetWidgetState };
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      await sdk.setState({ key: 'value' });
      expect(mockSetWidgetState).toHaveBeenCalledWith({ key: 'value' });
    });
  });

  describe('tool calling', () => {
    it('should throw when calling tool if not ready', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      await expect(sdk.callTool('test')).rejects.toThrow('not ready');
    });

    it('should call tool when ready', async () => {
      const mockCallTool = jest.fn<() => Promise<{ result: string }>>().mockResolvedValue({ result: 'success' });
      (window as any).openai = { callTool: mockCallTool };
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      const result = await sdk.callTool('testTool', { arg: 1 });
      expect(mockCallTool).toHaveBeenCalledWith('testTool', { arg: 1 });
      expect(result).toEqual({ result: 'success' });
    });
  });

  describe('display controls', () => {
    it('should throw when requesting fullscreen if not ready', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      await expect(sdk.requestFullscreen()).rejects.toThrow('not ready');
    });

    it('should throw when requesting inline if not ready', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      await expect(sdk.requestInline()).rejects.toThrow('not ready');
    });

    it('should throw when requesting pip if not ready', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      await expect(sdk.requestPip()).rejects.toThrow('not ready');
    });

    it('should throw when requesting close if not ready', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(() => sdk.requestClose()).toThrow('not ready');
    });

    it('should call requestDisplayMode when ready', async () => {
      const mockRequestDisplayMode = jest.fn<() => Promise<{ mode: string }>>().mockResolvedValue({ mode: 'fullscreen' });
      (window as any).openai = { requestDisplayMode: mockRequestDisplayMode };
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      await sdk.requestFullscreen();
      expect(mockRequestDisplayMode).toHaveBeenCalledWith({ mode: 'fullscreen' });
    });

    it('should call requestClose when ready', async () => {
      const mockRequestClose = jest.fn();
      (window as any).openai = { requestClose: mockRequestClose };
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      sdk.requestClose();
      expect(mockRequestClose).toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('should throw when opening external if not ready', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(() => sdk.openExternal('https://example.com')).toThrow('not ready');
    });

    it('should throw when sending follow-up if not ready', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      await expect(sdk.sendFollowUpMessage('Hello')).rejects.toThrow('not ready');
    });

    it('should call openExternal when ready', async () => {
      const mockOpenExternal = jest.fn();
      (window as any).openai = { openExternal: mockOpenExternal };
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      sdk.openExternal('https://example.com');
      expect(mockOpenExternal).toHaveBeenCalledWith({ href: 'https://example.com' });
    });

    it('should call sendFollowUpMessage when ready', async () => {
      const mockSendFollowUp = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      (window as any).openai = { sendFollowUpMessage: mockSendFollowUp };
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      await sdk.sendFollowUpMessage('Hello');
      expect(mockSendFollowUp).toHaveBeenCalledWith({ prompt: 'Hello' });
    });
  });

  describe('data access', () => {
    it('should return null for tool data when not ready', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.getToolInput()).toBeNull();
      expect(sdk.getToolOutput()).toBeNull();
      expect(sdk.getOutput()).toBeNull();
      expect(sdk.getToolResponseMetadata()).toBeNull();
    });

    it('should return tool data when ready', async () => {
      (window as any).openai = {
        toolInput: { input: 'data' },
        toolOutput: { output: 'result' },
        toolResponseMetadata: { meta: 'info' },
      };
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.getToolInput()).toEqual({ input: 'data' });
      expect(sdk.getToolOutput()).toEqual({ output: 'result' });
      expect(sdk.getOutput()).toEqual({ output: 'result' });
      expect(sdk.getToolResponseMetadata()).toEqual({ meta: 'info' });
    });

    it('should return default theme when not ready', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.getTheme()).toBe('light');
    });

    it('should return theme when ready', async () => {
      (window as any).openai = { theme: 'dark' };
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.getTheme()).toBe('dark');
    });

    it('should return 0 for maxHeight when not ready', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.getMaxHeight()).toBe(0);
    });

    it('should return maxHeight when ready', async () => {
      (window as any).openai = { maxHeight: 500 };
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.getMaxHeight()).toBe(500);
    });

    it('should return inline for displayMode when not ready', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.getDisplayMode()).toBe('inline');
    });

    it('should return displayMode when ready', async () => {
      (window as any).openai = { displayMode: 'fullscreen' };
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.getDisplayMode()).toBe('fullscreen');
    });

    it('should return null for userAgent when not ready', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.getUserAgent()).toBeNull();
    });

    it('should return default locale when not ready', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.getLocale()).toBe('en-US');
    });

    it('should return locale when ready', async () => {
      (window as any).openai = { locale: 'fr-FR' };
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.getLocale()).toBe('fr-FR');
    });

    it('should return null for safeArea when not ready', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.getSafeArea()).toBeNull();
    });

    it('should return safeArea when ready', async () => {
      const safeArea = { insets: { top: 10, bottom: 20, left: 0, right: 0 } };
      (window as any).openai = { safeArea };
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.getSafeArea()).toEqual(safeArea);
    });
  });

  describe('isDarkMode', () => {
    it('should return false when theme is light', async () => {
      (window as any).openai = { theme: 'light' };
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.isDarkMode()).toBe(false);
    });

    it('should return true when theme is dark', async () => {
      (window as any).openai = { theme: 'dark' };
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.isDarkMode()).toBe(true);
    });

    it('should return false when not ready (defaults to light)', async () => {
      const { WidgetSDK } = await import('../sdk.js');
      const sdk = WidgetSDK.getInstance();
      expect(sdk.isDarkMode()).toBe(false);
    });
  });
});
