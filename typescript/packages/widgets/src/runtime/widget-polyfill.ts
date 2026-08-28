// NitroStack Widget Runtime Polyfill
// This script bridges host postMessages to window.openai and internal React hooks.
// It supports both NitroStack's internal dev mode and the official OpenAI Apps SDK protocol.

(function () {
    'use strict';

    // Re-evaluating this script would stack a second message listener on window.
    if ((window as any).__nitroWidgetPolyfill) return;

    const RPC_TIMEOUT_MS = 5000;
    // Long enough for WidgetLayout to hydrate and fire its own ready, short enough to
    // stay inside WidgetSDK.waitForReady's 5s budget.
    const READY_FALLBACK_MS = 1000;

    // Global reference to prevent multiple initializations
    let initialized = false;
    let readyFired = false;
    let readyTimer: ReturnType<typeof setTimeout> | null = null;
    let rpcSeq = 0;

    const pendingRpcCalls = new Map<string, {
        resolve: (value: unknown) => void;
        reject: (error: Error) => void;
    }>();

    // Helper to fire NitroStack custom events for reactive hooks (useOpenAiGlobal)
    const fireGlobalsChangedEvent = (globals: any) => {
        const event = new CustomEvent('openai:set_globals', {
            detail: { globals }
        });
        window.dispatchEvent(event);
    };

    const fireReadyEvent = () => {
        const readyEvent = new CustomEvent('openai:ready');
        window.dispatchEvent(readyEvent);
    };

    const onReadyEvent = () => { readyFired = true; };
    window.addEventListener('openai:ready', onReadyEvent);

    const scheduleReady = () => {
        if (!(window as any).__nitroWidgetLayoutActive) {
            fireReadyEvent();
            return;
        }

        // WidgetLayout owns openai:ready while it is mounted, so let it win. Fall back
        // only if it never fires - e.g. the injection arrived before hydration
        // registered WidgetLayout's message listener, so it never saw the message.
        readyTimer = setTimeout(() => {
            readyTimer = null;
            if (!readyFired) fireReadyEvent();
        }, READY_FALLBACK_MS);
    };

    const rpcCall = (method: string, args: unknown[]): Promise<unknown> => {
        if (window.parent === window) {
            return Promise.reject(new Error(`Cannot call ${method}: widget is not framed by a host`));
        }

        // Prefixed so these ids can never collide with WidgetLayout's numeric ids
        // when both implementations are listening for responses.
        const id = `nitro-polyfill-${++rpcSeq}`;

        return new Promise((resolve, reject) => {
            pendingRpcCalls.set(id, { resolve, reject });
            window.parent.postMessage({ type: 'NITRO_WIDGET_RPC', method, args, id }, '*');

            setTimeout(() => {
                if (pendingRpcCalls.delete(id)) {
                    reject(new Error(`RPC timeout: ${method}`));
                }
            }, RPC_TIMEOUT_MS);
        });
    };

    const readPrompt = (payload: unknown): string => {
        const value = typeof payload === 'string'
            ? payload
            : (payload as { prompt?: unknown } | null | undefined)?.prompt;

        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('sendFollowUpMessage requires a non-empty prompt');
        }
        return value.trim();
    };

    const readHref = (payload: unknown): string => {
        const value = typeof payload === 'string'
            ? payload
            : (payload as { href?: unknown } | null | undefined)?.href;

        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('openExternal requires a non-empty href');
        }
        return value.trim();
    };

    const reportFailure = (method: string) => (error: unknown) => {
        console.error(`❌ ${method} failed:`, error);
    };

    // The host bridge a polyfill-only widget gets. WidgetLayout installs its own
    // equivalents and takes precedence wherever it is mounted.
    const createRpcApi = (): Record<string, (...args: any[]) => unknown> => ({
        callTool: async () => { throw new Error('callTool not initialized'); },

        sendFollowUpMessage: async (payload: unknown) => {
            await rpcCall('sendFollowUpMessage', [{ prompt: readPrompt(payload) }]);
        },

        openExternal: (payload: unknown) => {
            const href = readHref(payload);
            rpcCall('openExternal', [{ href }]).catch(reportFailure('openExternal'));
        },

        requestClose: () => {
            rpcCall('requestClose', []).catch(reportFailure('requestClose'));
        },

        requestDisplayMode: async (payload: { mode?: string } | undefined) =>
            rpcCall('requestDisplayMode', [{ mode: payload?.mode }]),
    });

    // Merge host globals into window.openai, backfilling any bridge method that is not
    // already a function so the object is never left as data without behaviour.
    const applyGlobals = (globals: Record<string, unknown>) => {
        const existing = (window as any).openai;

        if (!existing) {
            (window as any).openai = { ...createRpcApi(), ...globals };
            return;
        }

        for (const [key, fn] of Object.entries(createRpcApi())) {
            if (typeof existing[key] !== 'function') existing[key] = fn;
        }
        Object.assign(existing, globals);
    };

    // Main message handler
    const onMessage = (event: MessageEvent) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        // 1. Support official OpenAI Apps SDK protocol (setGlobals)
        if (data.type === 'setGlobals' && data.globals) {
            console.log('📦 Received setGlobals from ChatGPT host');

            applyGlobals(data.globals);

            // Notify reactive hooks
            fireGlobalsChangedEvent(data.globals);

            if (!initialized) {
                initialized = true;
                scheduleReady();
            }
        }

        // 2. Support NitroStack's internal injection (NITRO_INJECT_OPENAI)
        const openaiData = data.openai || data.data;
        if (data.type === 'NITRO_INJECT_OPENAI' && openaiData && typeof openaiData === 'object') {
            console.log('📦 Received NITRO_INJECT_OPENAI from parent');

            applyGlobals(openaiData);

            fireGlobalsChangedEvent(openaiData);

            if (!initialized) {
                initialized = true;
                scheduleReady();
            }
        }

        // 3. Support legacy TOOL_OUTPUT message
        if (data.type === 'TOOL_OUTPUT' && data.data) {
            console.log('📦 Received legacy TOOL_OUTPUT');
            if ((window as any).openai) {
                (window as any).openai.toolOutput = data.data;
                fireGlobalsChangedEvent({ toolOutput: data.data });
            }
        }

        // 4. Resolve RPC calls made through createRpcApi
        if (data.type === 'NITRO_WIDGET_RPC_RESPONSE' && typeof data.id === 'string') {
            const pending = pendingRpcCalls.get(data.id);

            if (pending) {
                pendingRpcCalls.delete(data.id);
                if (data.error) {
                    pending.reject(new Error(data.error));
                } else {
                    pending.resolve(data.result);
                }
            }
        }
    };

    window.addEventListener('message', onMessage);

    (window as any).__nitroWidgetPolyfill = {
        teardown: () => {
            window.removeEventListener('message', onMessage);
            window.removeEventListener('openai:ready', onReadyEvent);
            if (readyTimer !== null) {
                clearTimeout(readyTimer);
                readyTimer = null;
            }
            pendingRpcCalls.clear();
            delete (window as any).__nitroWidgetPolyfill;
        },
    };

    // If window.openai was injected BEFORE this script ran (e.g. static injection)
    if ((window as any).openai && !initialized) {
        console.log('ℹ️ window.openai found on startup');
        initialized = true;
        // Delay to ensure listeners are registered
        readyTimer = setTimeout(() => {
            readyTimer = null;
            scheduleReady();
        }, 0);
    }
})();
