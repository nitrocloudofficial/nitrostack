export type UnknownObject = Record<string, unknown>;

export type Theme = 'light' | 'dark';

export type SafeAreaInsets = {
    top: number;
    bottom: number;
    left: number;
    right: number;
};

export type SafeArea = {
    insets: SafeAreaInsets;
};

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export type UserAgent = {
    device: { type: DeviceType };
    capabilities: {
        hover: boolean;
        touch: boolean;
    };
};

/** Display mode */
export type DisplayMode = 'pip' | 'inline' | 'fullscreen';

export type RequestDisplayMode = (args: { mode: DisplayMode }) => Promise<{
    /**
     * The granted display mode. The host may reject the request.
     * For mobile, PiP is always coerced to fullscreen.
     */
    mode: DisplayMode;
}>;

/**
 * Tool call response from the host
 * Compatible with both MCP Apps and OpenAI Apps SDK
 */
export type CallToolResponse = {
    /** Tool result as string (primary response) */
    result: string;
    /** Optional structured content (OpenAI Apps SDK) */
    structuredContent?: unknown;
    /** Whether the tool call was successful */
    isError?: boolean;
};

/** Calling APIs */
export type CallTool = (
    name: string,
    args: Record<string, unknown>
) => Promise<CallToolResponse>;

/**
 * OpenAI globals injected into widget runtime
 */
export type OpenAiGlobals<
    ToolInput = UnknownObject,
    ToolOutput = UnknownObject,
    ToolResponseMetadata = UnknownObject,
    WidgetState = UnknownObject
> = {
    // visuals
    theme: Theme;
    userAgent: UserAgent;
    locale: string;

    // layout
    maxHeight: number;
    displayMode: DisplayMode;
    safeArea: SafeArea;

    // state
    toolInput: ToolInput;
    toolOutput: ToolOutput | null;
    toolResponseMetadata: ToolResponseMetadata | null;
    widgetState: WidgetState | null;
    setWidgetState: (state: WidgetState) => Promise<void>;
};

/**
 * OpenAI API methods
 */
export type OpenAiAPI = {
    callTool: CallTool;
    sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
    openExternal(payload: { href: string }): void;
    requestClose(): void;

    // Layout controls
    requestDisplayMode: RequestDisplayMode;
};

/**
 * Custom event for globals updates
 */
export const SET_GLOBALS_EVENT_TYPE = 'openai:set_globals';

export class SetGlobalsEvent extends CustomEvent<{
    globals: Partial<OpenAiGlobals>;
}> {
    readonly type = SET_GLOBALS_EVENT_TYPE;
}

/**
 * MCP Apps context (from @modelcontextprotocol/ext-apps)
 * This is the interface used by MCP Apps spec
 */
export type McpAppContext<
    ToolInput = UnknownObject,
    ToolOutput = UnknownObject,
> = {
    /** Tool input provided to the widget */
    toolInput: ToolInput;
    /** Tool output from execution (may be null initially) */
    toolOutput: ToolOutput | null;
    /** Current theme */
    theme: Theme;
    /** Locale string */
    locale: string;
    /** Display mode */
    displayMode: DisplayMode;
    /** Maximum height available */
    maxHeight: number;
};

/**
 * MCP Apps API (from @modelcontextprotocol/ext-apps)
 * Provides methods for widget-to-host communication
 */
export type McpAppAPI = {
    /** Call another MCP tool */
    callTool: CallTool;
    /** Request display mode change */
    requestDisplayMode: RequestDisplayMode;
    /** Request to close the widget */
    requestClose(): void;
    /** Open external link */
    openExternal(payload: { href: string }): void;
};

/**
 * Global openai object injected by the web sandbox for communicating with chatgpt host page.
 */
declare global {
    interface Window {
        openai: OpenAiAPI & OpenAiGlobals;
        /** MCP Apps context (alternative to window.openai) */
        __MCP_APP_CONTEXT__?: McpAppContext & McpAppAPI;
    }

    interface WindowEventMap {
        [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
    }
}

export { };
