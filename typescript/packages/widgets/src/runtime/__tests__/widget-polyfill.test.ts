import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

type AnyRecord = Record<string, any>;

const dispatch = (data: AnyRecord) => {
  window.dispatchEvent(new MessageEvent('message', { data }));
};

const dispatchInject = (payload: AnyRecord) => {
  dispatch({ type: 'NITRO_INJECT_OPENAI', ...payload });
};

const loadPolyfill = async () => {
  // @ts-expect-error TS2306: the polyfill declares no exports - it is a side-effect
  // script, imported here only so its IIFE installs the message listener.
  await import('../widget-polyfill.js');
};

const getOpenai = () => (window as any).openai;

// jsdom leaves window.parent === window, which the polyfill treats as "not framed by
// a host", so a stub parent is needed for anything that exercises the RPC bridge.
const frameWidget = () => {
  const postMessage = jest.fn();
  Object.defineProperty(window, 'parent', { configurable: true, value: { postMessage } });
  return postMessage;
};

const unframeWidget = () => {
  Object.defineProperty(window, 'parent', { configurable: true, value: window });
};

const bootFramedWidget = async () => {
  const postMessage = frameWidget();
  await loadPolyfill();
  dispatchInject({ data: { theme: 'dark' } });
  postMessage.mockClear();
  return { postMessage, openai: getOpenai() };
};

const lastRpc = (postMessage: jest.Mock) =>
  postMessage.mock.calls[postMessage.mock.calls.length - 1][0] as AnyRecord;

describe('Widget Polyfill', () => {
  beforeEach(() => {
    jest.resetModules();
    delete (window as any).openai;
    delete (window as any).__nitroWidgetLayoutActive;
  });

  afterEach(() => {
    (window as any).__nitroWidgetPolyfill?.teardown();
    unframeWidget();
    delete (window as any).openai;
    delete (window as any).__nitroWidgetLayoutActive;
    jest.useRealTimers();
  });

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

  describe('installation', () => {
    it('exposes a teardown handle', async () => {
      await loadPolyfill();
      expect(typeof (window as any).__nitroWidgetPolyfill?.teardown).toBe('function');
    });

    it('installs only once so listeners cannot stack', async () => {
      const globalsSpy = jest.fn();
      window.addEventListener('openai:set_globals', globalsSpy);

      await loadPolyfill();
      jest.resetModules();
      await loadPolyfill();

      dispatchInject({ data: { theme: 'dark' } });

      expect(globalsSpy).toHaveBeenCalledTimes(1);

      window.removeEventListener('openai:set_globals', globalsSpy);
    });

    it('stops handling messages after teardown', async () => {
      await loadPolyfill();
      (window as any).__nitroWidgetPolyfill.teardown();

      dispatchInject({ data: { theme: 'dark' } });

      expect(getOpenai()).toBeUndefined();
    });
  });

  describe('NITRO_INJECT_OPENAI handling', () => {
    it('merges a data-shaped payload into window.openai and fires ready', async () => {
      const readySpy = jest.fn();
      const globalsSpy = jest.fn();
      window.addEventListener('openai:ready', readySpy);
      window.addEventListener('openai:set_globals', globalsSpy);

      await loadPolyfill();
      dispatchInject({ data: { theme: 'dark', toolOutput: { result: 'success' } } });

      expect(getOpenai()?.theme).toBe('dark');
      expect(getOpenai()?.toolOutput).toEqual({ result: 'success' });
      expect(readySpy).toHaveBeenCalledTimes(1);
      expect(globalsSpy).toHaveBeenCalled();

      window.removeEventListener('openai:ready', readySpy);
      window.removeEventListener('openai:set_globals', globalsSpy);
    });

    it('prefers openai over data when both are present', async () => {
      await loadPolyfill();
      dispatchInject({ openai: { theme: 'dark' }, data: { theme: 'light' } });
      expect(getOpenai()?.theme).toBe('dark');
    });

    it('ignores non-object payloads', async () => {
      const globalsSpy = jest.fn();
      window.addEventListener('openai:set_globals', globalsSpy);

      await loadPolyfill();
      dispatchInject({ data: 'not-an-object' });

      expect(globalsSpy).not.toHaveBeenCalled();
      expect(getOpenai()).toBeUndefined();

      window.removeEventListener('openai:set_globals', globalsSpy);
    });

    it('does not mutate the received message payload on later merges', async () => {
      await loadPolyfill();

      const payload = { theme: 'dark' } as AnyRecord;
      dispatchInject({ data: payload });
      dispatch({ type: 'setGlobals', globals: { theme: 'light' } });

      expect(getOpenai()?.theme).toBe('light');
      expect(payload).toEqual({ theme: 'dark' });
    });
  });

  describe('host bridge installation', () => {
    // The host posts NITRO_INJECT_OPENAI before setGlobals, so the inject path is the
    // one that actually creates window.openai and must carry the bridge methods.
    it('installs callable bridge methods on an inject-only sequence', async () => {
      await loadPolyfill();
      dispatchInject({ data: { theme: 'dark' } });

      const openai = getOpenai();
      expect(typeof openai.sendFollowUpMessage).toBe('function');
      expect(typeof openai.openExternal).toBe('function');
      expect(typeof openai.requestClose).toBe('function');
      expect(typeof openai.requestDisplayMode).toBe('function');
      expect(typeof openai.callTool).toBe('function');
    });

    it('keeps bridge methods through the real host message order', async () => {
      await loadPolyfill();

      // Mirrors WidgetRenderer.sendDataToIframe: inject, then setGlobals.
      dispatchInject({ data: { theme: 'dark', toolOutput: { a: 1 } } });
      dispatch({ type: 'setGlobals', globals: { theme: 'light', displayMode: 'inline' } });

      const openai = getOpenai();
      expect(typeof openai.sendFollowUpMessage).toBe('function');
      expect(typeof openai.requestClose).toBe('function');
      expect(openai.theme).toBe('light');
      expect(openai.toolOutput).toEqual({ a: 1 });
    });

    it('installs bridge methods on a setGlobals-only sequence', async () => {
      await loadPolyfill();
      dispatch({ type: 'setGlobals', globals: { theme: 'dark' } });

      expect(typeof getOpenai().sendFollowUpMessage).toBe('function');
      expect(getOpenai().theme).toBe('dark');
    });

    it('never overwrites methods already installed by WidgetLayout', async () => {
      const layoutSendFollowUp = jest.fn();
      (window as any).openai = { sendFollowUpMessage: layoutSendFollowUp };

      await loadPolyfill();
      dispatchInject({ data: { theme: 'dark' } });

      expect(getOpenai().sendFollowUpMessage).toBe(layoutSendFollowUp);
      expect(typeof getOpenai().requestClose).toBe('function');
    });
  });

  describe('RPC bridge', () => {
    it('posts sendFollowUpMessage to the parent as a prompt object', async () => {
      const { postMessage, openai } = await bootFramedWidget();

      void openai.sendFollowUpMessage('  Hello  ');

      expect(lastRpc(postMessage)).toMatchObject({
        type: 'NITRO_WIDGET_RPC',
        method: 'sendFollowUpMessage',
        args: [{ prompt: 'Hello' }],
      });
    });

    it('accepts both string and object follow-up payloads', async () => {
      const { postMessage, openai } = await bootFramedWidget();

      void openai.sendFollowUpMessage({ prompt: 'From object' });

      expect(lastRpc(postMessage).args).toEqual([{ prompt: 'From object' }]);
    });

    it('posts openExternal and requestClose', async () => {
      const { postMessage, openai } = await bootFramedWidget();

      openai.openExternal({ href: 'https://example.com' });
      expect(lastRpc(postMessage)).toMatchObject({
        method: 'openExternal',
        args: [{ href: 'https://example.com' }],
      });

      openai.requestClose();
      expect(lastRpc(postMessage)).toMatchObject({ method: 'requestClose', args: [] });
    });

    it('uses unique prefixed ids that cannot collide with WidgetLayout ids', async () => {
      const { postMessage, openai } = await bootFramedWidget();

      openai.requestClose();
      openai.requestClose();

      const ids = postMessage.mock.calls.map(call => (call[0] as AnyRecord).id);
      expect(ids).toHaveLength(2);
      expect(ids[0]).not.toBe(ids[1]);
      ids.forEach(id => {
        expect(typeof id).toBe('string');
        expect(id).toMatch(/^nitro-polyfill-\d+$/);
      });
    });

    it('resolves when the host answers with a result', async () => {
      const { postMessage, openai } = await bootFramedWidget();

      const pending = openai.requestDisplayMode({ mode: 'fullscreen' });
      dispatch({
        type: 'NITRO_WIDGET_RPC_RESPONSE',
        id: lastRpc(postMessage).id,
        result: { mode: 'fullscreen' },
      });

      await expect(pending).resolves.toEqual({ mode: 'fullscreen' });
    });

    it('rejects when the host answers with an error', async () => {
      const { postMessage, openai } = await bootFramedWidget();

      const pending = openai.sendFollowUpMessage('Hello');
      dispatch({
        type: 'NITRO_WIDGET_RPC_RESPONSE',
        id: lastRpc(postMessage).id,
        error: 'host exploded',
      });

      await expect(pending).rejects.toThrow('host exploded');
    });

    it('ignores responses for unknown ids', async () => {
      const { postMessage, openai } = await bootFramedWidget();

      const pending = openai.sendFollowUpMessage('Hello');
      dispatch({ type: 'NITRO_WIDGET_RPC_RESPONSE', id: 'someone-elses-id', result: null });
      dispatch({ type: 'NITRO_WIDGET_RPC_RESPONSE', id: lastRpc(postMessage).id, result: null });

      await expect(pending).resolves.toBeUndefined();
    });

    it('rejects with a timeout when the host never answers', async () => {
      const { openai } = await bootFramedWidget();
      jest.useFakeTimers();

      const assertion = expect(openai.sendFollowUpMessage('Hello'))
        .rejects.toThrow('RPC timeout: sendFollowUpMessage');

      jest.advanceTimersByTime(5000);

      await assertion;
    });

    it('rejects when the widget is not framed by a host', async () => {
      unframeWidget();
      await loadPolyfill();
      dispatchInject({ data: { theme: 'dark' } });

      await expect(getOpenai().sendFollowUpMessage('Hello'))
        .rejects.toThrow('not framed by a host');
    });

    it('rejects an empty prompt instead of posting it', async () => {
      const { postMessage, openai } = await bootFramedWidget();

      await expect(openai.sendFollowUpMessage('   ')).rejects.toThrow('non-empty prompt');
      await expect(openai.sendFollowUpMessage({})).rejects.toThrow('non-empty prompt');
      await expect(openai.sendFollowUpMessage(undefined)).rejects.toThrow('non-empty prompt');
      expect(postMessage).not.toHaveBeenCalled();
    });

    it('throws on an empty href instead of posting it', async () => {
      const { postMessage, openai } = await bootFramedWidget();

      expect(() => openai.openExternal({ href: '  ' })).toThrow('non-empty href');
      expect(() => openai.openExternal(undefined)).toThrow('non-empty href');
      expect(postMessage).not.toHaveBeenCalled();
    });
  });

  describe('ready event gating', () => {
    it('lets WidgetLayout own ready but falls back if it never fires', async () => {
      (window as any).__nitroWidgetLayoutActive = true;
      const readySpy = jest.fn();
      window.addEventListener('openai:ready', readySpy);

      await loadPolyfill();
      jest.useFakeTimers();
      dispatchInject({ data: { theme: 'light' } });

      // WidgetLayout gets first refusal...
      expect(readySpy).not.toHaveBeenCalled();
      expect(getOpenai()?.theme).toBe('light');

      // ...but a widget must never be left without a ready event.
      jest.advanceTimersByTime(1000);
      expect(readySpy).toHaveBeenCalledTimes(1);

      window.removeEventListener('openai:ready', readySpy);
    });

    it('does not fire a second ready when WidgetLayout already dispatched one', async () => {
      (window as any).__nitroWidgetLayoutActive = true;
      const readySpy = jest.fn();
      window.addEventListener('openai:ready', readySpy);

      await loadPolyfill();
      jest.useFakeTimers();
      dispatchInject({ data: { theme: 'light' } });

      window.dispatchEvent(new CustomEvent('openai:ready'));
      expect(readySpy).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1000);
      expect(readySpy).toHaveBeenCalledTimes(1);

      window.removeEventListener('openai:ready', readySpy);
    });

    it('fires ready immediately when no WidgetLayout is mounted', async () => {
      const readySpy = jest.fn();
      window.addEventListener('openai:ready', readySpy);

      await loadPolyfill();
      dispatchInject({ data: { theme: 'light' } });

      expect(readySpy).toHaveBeenCalledTimes(1);

      window.removeEventListener('openai:ready', readySpy);
    });
  });

  describe('legacy TOOL_OUTPUT', () => {
    it('updates toolOutput and notifies hooks', async () => {
      const globalsSpy = jest.fn();

      await loadPolyfill();
      dispatchInject({ data: { theme: 'dark' } });

      window.addEventListener('openai:set_globals', globalsSpy);
      dispatch({ type: 'TOOL_OUTPUT', data: { result: 'success' } });

      expect(getOpenai().toolOutput).toEqual({ result: 'success' });
      expect(globalsSpy).toHaveBeenCalledTimes(1);

      window.removeEventListener('openai:set_globals', globalsSpy);
    });
  });
});
