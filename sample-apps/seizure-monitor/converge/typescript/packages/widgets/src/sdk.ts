/**
 * Widget SDK - Clean abstraction over window.openai and MCP Apps
 * 
 * Provides a developer-friendly API for widget functionality without
 * exposing implementation details. Supports both:
 * - OpenAI Apps SDK (window.openai)
 * - MCP Apps spec (window.__MCP_APP_CONTEXT__)
 */

import type { DisplayMode, CallToolResponse } from './types.js';

/**
 * Widget SDK class that wraps widget host functionality
 * Automatically bridges OpenAI Apps SDK and MCP Apps spec
 */
export class WidgetSDK {
    private static instance: WidgetSDK | null = null;

    private constructor() {
        // Private constructor for singleton
    }

    /**
     * Get the SDK instance
     */
    static getInstance(): WidgetSDK {
        if (!WidgetSDK.instance) {
            WidgetSDK.instance = new WidgetSDK();
        }
        return WidgetSDK.instance;
    }

    /**
     * Check if the SDK is ready
     * Supports both OpenAI (window.openai) and MCP Apps (__MCP_APP_CONTEXT__)
     */
    isReady(): boolean {
        return typeof window !== 'undefined' && 
            ('openai' in window || '__MCP_APP_CONTEXT__' in window);
    }

    /**
     * Check if running in OpenAI Apps SDK context
     */
    isOpenAI(): boolean {
        return typeof window !== 'undefined' && 'openai' in window;
    }

    /**
     * Check if running in MCP Apps context
     */
    isMcpApps(): boolean {
        return typeof window !== 'undefined' && '__MCP_APP_CONTEXT__' in window;
    }

    /**
     * Wait for SDK to be ready
     * Listens for both OpenAI and MCP Apps ready events
     */
    async waitForReady(timeout = 5000): Promise<void> {
        if (this.isReady()) return;

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                window.removeEventListener('openai:ready', handler);
                window.removeEventListener('mcp:ready', handler);
                reject(new Error('Widget SDK initialization timeout'));
            }, timeout);

            const handler = () => {
                clearTimeout(timeoutId);
                window.removeEventListener('openai:ready', handler);
                window.removeEventListener('mcp:ready', handler);
                resolve();
            };

            // Listen for both ready events
            window.addEventListener('openai:ready', handler, { once: true });
            window.addEventListener('mcp:ready', handler, { once: true });
        });
    }

    // ==================== State Management ====================

    /**
     * Set widget state
     */
    async setState(state: Record<string, unknown>): Promise<void> {
        if (!this.isReady()) {
            throw new Error('Widget SDK not ready');
        }
        await window.openai.setWidgetState(state);
    }

    /**
     * Get current widget state
     */
    getState(): Record<string, unknown> | null {
        if (!this.isReady()) return null;
        return window.openai.widgetState as Record<string, unknown>;
    }

    // ==================== Tool Calling ====================

    /**
     * Call a tool by name with arguments
     */
    async callTool(name: string, args: Record<string, unknown> = {}): Promise<CallToolResponse> {
        if (!this.isReady()) {
            throw new Error('Widget SDK not ready');
        }
        return await window.openai.callTool(name, args);
    }

    // ==================== Display Controls ====================

    /**
     * Request fullscreen mode
     */
    async requestFullscreen(): Promise<void> {
        if (!this.isReady()) {
            throw new Error('Widget SDK not ready');
        }
        await window.openai.requestDisplayMode({ mode: 'fullscreen' });
    }

    /**
     * Request inline mode
     */
    async requestInline(): Promise<void> {
        if (!this.isReady()) {
            throw new Error('Widget SDK not ready');
        }
        await window.openai.requestDisplayMode({ mode: 'inline' });
    }

    /**
     * Request picture-in-picture mode
     */
    async requestPip(): Promise<void> {
        if (!this.isReady()) {
            throw new Error('Widget SDK not ready');
        }
        await window.openai.requestDisplayMode({ mode: 'pip' });
    }

    /**
     * Request display mode change
     */
    async requestDisplayMode(mode: DisplayMode): Promise<{ mode: DisplayMode }> {
        if (!this.isReady()) {
            throw new Error('Widget SDK not ready');
        }
        return await window.openai.requestDisplayMode({ mode });
    }

    /**
     * Close the widget
     */
    requestClose(): void {
        if (!this.isReady()) {
            throw new Error('Widget SDK not ready');
        }
        window.openai.requestClose();
    }

    // ==================== Navigation ====================

    /**
     * Open external URL
     */
    openExternal(url: string): void {
        if (!this.isReady()) {
            throw new Error('Widget SDK not ready');
        }
        window.openai.openExternal({ href: url });
    }

    /**
     * Send a follow-up message to the chat
     */
    async sendFollowUpMessage(prompt: string): Promise<void> {
        if (!this.isReady()) {
            throw new Error('Widget SDK not ready');
        }
        await window.openai.sendFollowUpMessage({ prompt });
    }

    // ==================== Data Access ====================

    /**
     * Get tool input data
     */
    getToolInput<T = unknown>(): T | null {
        if (!this.isReady()) return null;
        return window.openai.toolInput as T;
    }

    /**
     * Get tool output data
     * Handles both OpenAI (window.openai.toolOutput) and MCP Apps 
     * (unwrapping structuredContent or raw content arrays).
     */
    getToolOutput<T = unknown>(): T | null {
        if (!this.isReady()) return null;
        
        const rawOutput = window.openai.toolOutput;
        if (!rawOutput) return null;

        return this.extractToolData<T>(rawOutput);
    }

    /**
     * Robustly extract data from tool output.
     * Supports:
     * - OpenAI structuredContent wrapper
     * - Standard MCP content array (text/json)
     * - Standard MCP contents array (fallback)
     */
    private extractToolData<T = unknown>(output: any): T | null {
        if (!output) return null;

        // 1. Check for structuredContent (OpenAI / NitroStack default)
        if (output.structuredContent) {
            return output.structuredContent as T;
        }

        // 2. Check for standard MCP content array
        const contents = output.content || output.contents;
        if (Array.isArray(contents)) {
            // Look for JSON content first
            const jsonContent = contents.find(c => c && typeof c === 'object' && (c.mimeType === 'application/json' || c.type === 'json'));
            if (jsonContent) {
                try {
                    return (typeof jsonContent.text === 'string' ? JSON.parse(jsonContent.text) : jsonContent.text) as T;
                } catch {
                    // fall through
                }
            }

            // Look for text content that might be JSON
            const textContent = contents.find(c => c && typeof c === 'object' && (c.mimeType === 'text/plain' || c.type === 'text'));
            if (textContent && typeof textContent.text === 'string') {
                try {
                    // Only try parsing if it looks like JSON
                    if (textContent.text.trim().startsWith('{') || textContent.text.trim().startsWith('[')) {
                        return JSON.parse(textContent.text) as T;
                    }
                    return textContent.text as unknown as T;
                } catch {
                    return textContent.text as unknown as T;
                }
            }
        }

        // 3. Fallback to raw output if it doesn't match standard patterns
        return output as T;
    }

    /**
     * Get tool response metadata
     */
    getToolResponseMetadata<T = unknown>(): T | null {
        if (!this.isReady()) return null;
        return window.openai.toolResponseMetadata as T;
    }

    /**
     * Get current theme
     */
    getTheme(): 'light' | 'dark' {
        if (!this.isReady()) return 'light';
        return window.openai.theme;
    }

    /**
     * Get maximum height constraint
     */
    getMaxHeight(): number {
        if (!this.isReady()) return 0;
        return window.openai.maxHeight;
    }

    /**
     * Get current display mode
     */
    getDisplayMode(): DisplayMode {
        if (!this.isReady()) return 'inline';
        return window.openai.displayMode;
    }

    /**
     * Get user agent information
     */
    getUserAgent() {
        if (!this.isReady()) return null;
        return window.openai.userAgent;
    }

    /**
     * Get locale
     */
    getLocale(): string {
        if (!this.isReady()) return 'en-US';
        return window.openai.locale;
    }

    /**
     * Get safe area insets
     */
    getSafeArea() {
        if (!this.isReady()) return null;
        return window.openai.safeArea;
    }

    /**
     * Alias for getToolOutput - commonly used
     */
    getOutput<T = unknown>(): T | null {
        return this.getToolOutput<T>();
    }

    /**
     * Check if dark mode is active
     */
    isDarkMode(): boolean {
        return this.getTheme() === 'dark';
    }
}

/**
 * Get the global Widget SDK instance
 */
export function getWidgetSDK(): WidgetSDK {
    return WidgetSDK.getInstance();
}
