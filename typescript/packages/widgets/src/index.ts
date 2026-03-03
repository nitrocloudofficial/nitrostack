/**
 * NitroStack Widgets Utilities
 * 
 * This module provides utilities for building Next.js widgets
 * that integrate with NitroStack tools and are compatible with OpenAI ChatGPT.
 */

// Widget SDK - Clean abstraction layer
export { WidgetSDK, getWidgetSDK } from './sdk.js';
export { WidgetLayout, type WidgetLayoutProps } from './runtime/WidgetLayout.js';

// Legacy exports (backward compatibility)
export { withToolData, type ToolOutputWrapper } from './withToolData.js';
export { defineWidgetMetadata, type WidgetMetadata, type WidgetExample, type WidgetManifest } from './metadata.js';

// Types - Supports both OpenAI Apps SDK and MCP Apps spec
export type {
    UnknownObject,
    Theme,
    SafeAreaInsets,
    SafeArea,
    DeviceType,
    UserAgent,
    DisplayMode,
    RequestDisplayMode,
    CallToolResponse,
    CallTool,
    // OpenAI Apps SDK types
    OpenAiGlobals,
    OpenAiAPI,
    SetGlobalsEvent,
    // MCP Apps types
    McpAppContext,
    McpAppAPI,
} from './types.js';

export { SET_GLOBALS_EVENT_TYPE } from './types.js';

// OpenAI SDK compatibility - Hooks
export {
    useOpenAiGlobal,
    useWidgetState,
    useTheme,
    useMaxHeight,
    useDisplayMode,
    useWidgetSDK, // New clean SDK hook
} from './hooks/index.js';

// OpenAI SDK compatibility - Utilities
export {
    prefersReducedMotion,
    isPrimarilyTouchDevice,
    isHoverAvailable,
    prefersDarkColorScheme,
} from './utils/media-queries.js';
