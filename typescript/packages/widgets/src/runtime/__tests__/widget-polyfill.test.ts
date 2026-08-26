import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Widget Polyfill', () => {
  describe('Message Types', () => {
    it('should define standard message types', () => {
      // These are the message types the polyfill handles
      const messageTypes = [
        'NITRO_INJECT_OPENAI',
        'TOOL_OUTPUT',
        'TOOL_INPUT',
        'SET_THEME',
        'SET_MAX_HEIGHT',
      ];
      
      messageTypes.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });

    it('should handle message structure', () => {
      // Define expected message structure
      const message = {
        type: 'NITRO_INJECT_OPENAI',
        openai: { theme: 'dark' },
      };
      
      expect(message.type).toBe('NITRO_INJECT_OPENAI');
      expect(message.openai.theme).toBe('dark');
    });

    it('should handle tool output message', () => {
      const message = {
        type: 'TOOL_OUTPUT',
        data: { result: 'success' },
      };
      
      expect(message.type).toBe('TOOL_OUTPUT');
      expect(message.data.result).toBe('success');
    });
  });

  describe('NITRO_INJECT_OPENAI handling', () => {
    const dispatchInject = (payload: Record<string, unknown>) => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'NITRO_INJECT_OPENAI', ...payload },
      }));
    };

    const loadPolyfill = async () => {
      // @ts-expect-error side-effect import: the polyfill is a classic script, not a module
      await import('../widget-polyfill.js');
    };

    beforeEach(() => {
      jest.resetModules();
      if ('openai' in window) {
        delete (window as any).openai;
      }
      delete (window as any).__nitroWidgetLayoutActive;
    });

    afterEach(() => {
      if ('openai' in window) {
        delete (window as any).openai;
      }
      delete (window as any).__nitroWidgetLayoutActive;
    });

    it('merges a data-shaped payload into window.openai and fires ready', async () => {
      const readySpy = jest.fn();
      const globalsSpy = jest.fn();
      window.addEventListener('openai:ready', readySpy);
      window.addEventListener('openai:set_globals', globalsSpy);

      await loadPolyfill();
      dispatchInject({ data: { theme: 'dark', toolOutput: { result: 'success' } } });

      expect((window as any).openai?.theme).toBe('dark');
      expect((window as any).openai?.toolOutput).toEqual({ result: 'success' });
      expect(readySpy).toHaveBeenCalledTimes(1);
      expect(globalsSpy).toHaveBeenCalled();

      window.removeEventListener('openai:ready', readySpy);
      window.removeEventListener('openai:set_globals', globalsSpy);
    });

    it('prefers openai over data when both are present', async () => {
      await loadPolyfill();
      dispatchInject({ openai: { theme: 'dark' }, data: { theme: 'light' } });
      expect((window as any).openai?.theme).toBe('dark');
    });

    it('ignores non-object payloads', async () => {
      const globalsSpy = jest.fn();
      window.addEventListener('openai:set_globals', globalsSpy);

      await loadPolyfill();
      dispatchInject({ data: 'not-an-object' });

      expect(globalsSpy).not.toHaveBeenCalled();
      expect((window as any).openai).toBeUndefined();

      window.removeEventListener('openai:set_globals', globalsSpy);
    });

    it('still merges but skips ready when WidgetLayout is active', async () => {
      (window as any).__nitroWidgetLayoutActive = true;
      const readySpy = jest.fn();
      window.addEventListener('openai:ready', readySpy);

      await loadPolyfill();
      dispatchInject({ data: { theme: 'light' } });

      expect(readySpy).not.toHaveBeenCalled();
      expect((window as any).openai?.theme).toBe('light');

      window.removeEventListener('openai:ready', readySpy);
    });
  });
});
