import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { render, act, cleanup } from '@testing-library/react';

type AnyRecord = Record<string, any>;

class NoopResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
}

const INJECT_PAYLOAD = {
  theme: 'dark',
  locale: 'en-US',
  displayMode: 'inline',
  maxHeight: 500,
  toolInput: { query: 'dune' },
  toolOutput: { result: 'ok' },
};

describe('WidgetLayout runtime bridge', () => {
  let postMessage: jest.Mock;

  beforeEach(() => {
    (globalThis as any).ResizeObserver = NoopResizeObserver;
    postMessage = jest.fn();
    Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage } });
    delete (window as any).openai;
    delete (window as any).__MCP_APP_CONTEXT__;
    delete (window as any).__nitroWidgetLayoutActive;
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, 'parent', { configurable: true, value: window });
    delete (window as any).openai;
    delete (window as any).__MCP_APP_CONTEXT__;
    delete (window as any).__nitroWidgetLayoutActive;
    delete (globalThis as any).ResizeObserver;
  });

  const rpcCalls = () => postMessage.mock.calls
    .map(call => call[0] as AnyRecord)
    .filter(message => message?.type === 'NITRO_WIDGET_RPC');

  // Answer every outstanding RPC so the widget-side promises settle.
  const answerAllRpc = async () => {
    await act(async () => {
      rpcCalls().forEach(({ id }) => {
        window.dispatchEvent(new MessageEvent('message', {
          data: { type: 'NITRO_WIDGET_RPC_RESPONSE', id, result: null },
        }));
      });
    });
  };

  const mount = async (onReady?: () => void) => {
    const { WidgetLayout } = await import('../WidgetLayout.js');
    return render(<WidgetLayout onReady={onReady}>content</WidgetLayout>);
  };

  const inject = async () => {
    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'NITRO_INJECT_OPENAI', data: INJECT_PAYLOAD },
      }));
    });
  };

  describe('layout-active flag', () => {
    it('is set while mounted and cleared on unmount', async () => {
      const view = await mount();
      expect((window as any).__nitroWidgetLayoutActive).toBe(true);

      view.unmount();
      expect((window as any).__nitroWidgetLayoutActive).toBeUndefined();
    });

    it('is not set merely by importing the module', async () => {
      await import('../WidgetLayout.js');
      expect((window as any).__nitroWidgetLayoutActive).toBeUndefined();
    });
  });

  describe('injection', () => {
    it('installs window.openai and __MCP_APP_CONTEXT__ with bridge methods', async () => {
      await mount();
      await inject();

      const openai = (window as any).openai;
      expect(openai.theme).toBe('dark');
      expect(openai.toolOutput).toEqual({ result: 'ok' });
      expect(typeof openai.sendFollowUpMessage).toBe('function');
      expect(typeof openai.callTool).toBe('function');

      const mcp = (window as any).__MCP_APP_CONTEXT__;
      expect(mcp.toolInput).toEqual({ query: 'dune' });
      expect(typeof mcp.sendFollowUpMessage).toBe('function');
    });

    it('fires ready events and calls onReady', async () => {
      const readySpy = jest.fn();
      const mcpReadySpy = jest.fn();
      const onReady = jest.fn();
      window.addEventListener('openai:ready', readySpy);
      window.addEventListener('mcp:ready', mcpReadySpy);

      await mount(onReady);
      await inject();

      expect(readySpy).toHaveBeenCalledTimes(1);
      expect(mcpReadySpy).toHaveBeenCalledTimes(1);
      expect(onReady).toHaveBeenCalledTimes(1);

      window.removeEventListener('openai:ready', readySpy);
      window.removeEventListener('mcp:ready', mcpReadySpy);
    });
  });

  describe('sendFollowUpMessage payloads', () => {
    it('sends a string payload to the host as { prompt }', async () => {
      await mount();
      await inject();

      const pending = (window as any).openai.sendFollowUpMessage('Hello');
      expect(rpcCalls()[0]).toMatchObject({
        method: 'sendFollowUpMessage',
        args: [{ prompt: 'Hello' }],
      });

      await answerAllRpc();
      await expect(pending).resolves.toBeUndefined();
    });

    it('sends an object payload to the host as { prompt }', async () => {
      await mount();
      await inject();

      const pending = (window as any).openai.sendFollowUpMessage({ prompt: 'Hello again' });
      expect(rpcCalls()[0]).toMatchObject({
        method: 'sendFollowUpMessage',
        args: [{ prompt: 'Hello again' }],
      });

      await answerAllRpc();
      await expect(pending).resolves.toBeUndefined();
    });

    it('uses numeric ids that stay distinct across calls', async () => {
      await mount();
      await inject();

      const first = (window as any).openai.sendFollowUpMessage('one');
      const second = (window as any).openai.sendFollowUpMessage('two');

      const ids = rpcCalls().map(call => call.id);
      expect(ids).toHaveLength(2);
      expect(ids[0]).not.toBe(ids[1]);
      ids.forEach(id => expect(typeof id).toBe('number'));

      await answerAllRpc();
      await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
    });
  });
});
