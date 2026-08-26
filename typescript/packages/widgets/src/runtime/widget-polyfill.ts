// NitroStack Widget Runtime Polyfill
// This script bridges host postMessages to window.openai and internal React hooks.
// It supports both NitroStack's internal dev mode and the official OpenAI Apps SDK protocol.

(function () {
    'use strict';

    // Global reference to prevent multiple initializations
    let initialized = false;

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

    // Main message handler
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        // 1. Support official OpenAI Apps SDK protocol (setGlobals)
        if (data.type === 'setGlobals' && data.globals) {
            console.log('📦 Received setGlobals from ChatGPT host');
            
            // Ensure window.openai looks correct (some properties like callTool might be missing if we don't polyfill)
            if (!(window as any).openai) {
                (window as any).openai = {
                    callTool: async () => { throw new Error('callTool not initialized'); },
                    sendFollowUpMessage: async (payload: any) => {
                        const prompt = typeof payload === 'string' ? payload : payload?.prompt || '';
                        window.parent.postMessage({ type: 'NITRO_WIDGET_RPC', method: 'sendFollowUpMessage', args: [{ prompt }], id: Date.now() }, '*');
                    },
                    openExternal: (payload: any) => {
                        const href = typeof payload === 'string' ? payload : payload?.href || '';
                        window.parent.postMessage({ type: 'NITRO_WIDGET_RPC', method: 'openExternal', args: [{ href }], id: Date.now() }, '*');
                    },
                    requestClose: () => {
                        window.parent.postMessage({ type: 'NITRO_WIDGET_RPC', method: 'requestClose', args: [], id: Date.now() }, '*');
                    },
                    requestDisplayMode: async ({ mode }: any) => ({ mode }),
                    ...data.globals
                };
            } else {
                // Update existing properties
                Object.assign((window as any).openai, data.globals);
            }

            // Notify reactive hooks
            fireGlobalsChangedEvent(data.globals);

            if (!initialized) {
                initialized = true;
                fireReadyEvent();
            }
        }

        // 2. Support NitroStack's internal injection (NITRO_INJECT_OPENAI)
        const openaiData = data.openai || data.data;
        if (data.type === 'NITRO_INJECT_OPENAI' && openaiData && typeof openaiData === 'object') {
            console.log('📦 Received NITRO_INJECT_OPENAI from parent');

            if (!(window as any).openai) {
                (window as any).openai = openaiData;
            } else {
                Object.assign((window as any).openai, openaiData);
            }

            fireGlobalsChangedEvent(openaiData);

            if (!initialized) {
                initialized = true;
                // When WidgetLayout is co-loaded it owns openai:ready: it installs the
                // RPC-backed window.openai after this handler runs, so firing ready
                // here would expose a window.openai without RPC methods.
                if (!(window as any).__nitroWidgetLayoutActive) {
                    fireReadyEvent();
                }
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
    });

    // If window.openai was injected BEFORE this script ran (e.g. static injection)
    if ((window as any).openai && !initialized) {
        console.log('ℹ️ window.openai found on startup');
        initialized = true;
        // Delay to ensure listeners are registered
        setTimeout(() => fireReadyEvent(), 0);
    }
})();
