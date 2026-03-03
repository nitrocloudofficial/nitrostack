/**
 * Widget Layout Component
 * 
 * Handles all the RPC setup and window.openai initialization automatically.
 * Developers just wrap their widget content with this component.
 */

'use client';

import React, { useEffect, type ReactNode } from 'react';

export interface WidgetLayoutProps {
    children: ReactNode;
    /**
     * Optional callback when SDK is ready
     */
    onReady?: () => void;
}

/**
 * Widget Layout component that sets up the widget runtime
 * 
 * @example
 * ```tsx
 * export default function RootLayout({ children }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <WidgetLayout>{children}</WidgetLayout>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function WidgetLayout({ children, onReady }: WidgetLayoutProps) {
    useEffect(() => {
        console.log('🔧 WidgetLayout: Setting up widget runtime');

        let rpcId = 0;
        const pendingRpcCalls = new Map<number, { resolve: Function; reject: Function }>();

        // RPC helper to call parent methods
        const callParentRpc = (method: string, ...args: unknown[]) => {
            return new Promise((resolve, reject) => {
                const id = ++rpcId;
                pendingRpcCalls.set(id, { resolve, reject });

                window.parent.postMessage({
                    type: 'NITRO_WIDGET_RPC',
                    method,
                    args,
                    id
                }, '*');

                // Timeout after 5 seconds
                setTimeout(() => {
                    if (pendingRpcCalls.has(id)) {
                        pendingRpcCalls.delete(id);
                        reject(new Error(`RPC timeout: ${method}`));
                    }
                }, 5000);
            });
        };

        // Listen for messages from parent
        const handleMessage = (event: MessageEvent) => {
            // Handle openai data injection
            if (event.data?.type === 'NITRO_INJECT_OPENAI') {
                console.log('📦 WidgetLayout: Received window.openai data from parent');

                const data = event.data.data;

                // Set up window.openai with data + RPC functions
                (window as any).openai = {
                    ...data,

                    // Functions that call back to parent via RPC
                    setWidgetState: async (state: Record<string, unknown>) => {
                        await callParentRpc('setWidgetState', state);
                    },

                    callTool: async (name: string, args: Record<string, unknown>) => {
                        return await callParentRpc('callTool', name, args);
                    },

                    sendFollowUpMessage: async ({ prompt }: { prompt: string }) => {
                        await callParentRpc('sendFollowUpMessage', { prompt });
                    },

                    openExternal: ({ href }: { href: string }) => {
                        callParentRpc('openExternal', { href });
                    },

                    requestClose: () => {
                        callParentRpc('requestClose');
                    },

                    requestDisplayMode: async ({ mode }: { mode: 'inline' | 'pip' | 'fullscreen' }) => {
                        return await callParentRpc('requestDisplayMode', { mode });
                    },
                };

                // Also set up MCP Apps compatible interface
                // This provides compatibility with @modelcontextprotocol/ext-apps
                (window as any).__MCP_APP_CONTEXT__ = {
                    // Context data
                    toolInput: data.toolInput,
                    toolOutput: data.toolOutput,
                    theme: data.theme,
                    locale: data.locale,
                    displayMode: data.displayMode,
                    maxHeight: data.maxHeight,
                    // API methods (proxy to window.openai)
                    callTool: (window as any).openai.callTool,
                    requestDisplayMode: (window as any).openai.requestDisplayMode,
                    requestClose: (window as any).openai.requestClose,
                    openExternal: (window as any).openai.openExternal,
                };

                // Dispatch ready event
                const readyEvent = new CustomEvent('openai:ready');
                window.dispatchEvent(readyEvent);

                // Also dispatch MCP Apps ready event
                const mcpReadyEvent = new CustomEvent('mcp:ready');
                window.dispatchEvent(mcpReadyEvent);

                console.log('✅ WidgetLayout: window.openai and __MCP_APP_CONTEXT__ initialized');

                // Call onReady callback if provided
                onReady?.();
            }

            // Handle RPC responses
            if (event.data?.type === 'NITRO_WIDGET_RPC_RESPONSE') {
                const { id, result, error } = event.data;
                const pending = pendingRpcCalls.get(id);

                if (pending) {
                    pendingRpcCalls.delete(id);
                    if (error) {
                        pending.reject(new Error(error));
                    } else {
                        pending.resolve(result);
                    }
                }
            }

            // Handle legacy toolOutput for backward compatibility
            if (event.data?.type === 'TOOL_OUTPUT' && event.data?.data) {
                console.log('📦 WidgetLayout: Received legacy toolOutput');
                if ((window as any).openai) {
                    (window as any).openai.toolOutput = event.data.data;
                }
            }
        };

        window.addEventListener('message', handleMessage);
        console.log('✅ WidgetLayout: Message listener registered');

        return () => {
            console.log('🔧 WidgetLayout: Cleaning up');
            window.removeEventListener('message', handleMessage);
        };
    }, [onReady]);

    // Set up ResizeObserver to track content height
    useEffect(() => {
        // Reset body margins/padding for accurate measurement
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.overflow = 'hidden';

        const contentWrapper = document.getElementById('nitro-widget-content');
        if (!contentWrapper) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.contentRect.height;
                const finalHeight = Math.ceil(height) + 16;
                console.log('📐 Widget content height:', height, '→ sending:', finalHeight);
                // Send height update to parent
                window.parent.postMessage({
                    type: 'NITRO_WIDGET_RESIZE',
                    height: finalHeight // Add small buffer
                }, '*');
            }
        });

        resizeObserver.observe(contentWrapper);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    return <div id="nitro-widget-content">{children}</div>;
}
