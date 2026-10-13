# Widget SDK API Reference

## Overview

The NitroStack Widget SDK provides a modern, type-safe API for building interactive widgets that integrate with MCP servers and ChatGPT. The SDK offers React hooks, a singleton SDK class, and utility functions for common widget operations.

**Compatibility:** The Widget SDK supports both **OpenAI Apps SDK** (`window.openai`) and **MCP Apps** (`window.__MCP_APP_CONTEXT__`) specifications. NitroStack handles this internally - your widgets work seamlessly on both platforms.

## Quick Start

```typescript
'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

export default function MyWidget() {
  const { isReady, callTool, getToolOutput } = useWidgetSDK();
  const theme = useTheme();
  
  if (!isReady) return <div>Loading...</div>;
  
  const data = getToolOutput();
  
  return (
    <div style={{ 
      background: theme === 'dark' ? '#000' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000'
    }}>
      <h1>{data.title}</h1>
    </div>
  );
}
```

## Core Hooks

### useWidgetSDK()

Primary hook for accessing all Widget SDK functionality.

**Returns:**
```typescript
{
  sdk: WidgetSDK;
  isReady: boolean;
  
  // State Management
  setState: (state: any) => Promise<void>;
  getState: () => any;
  
  // Tool Calling
  callTool: (name: string, args?: Record<string, unknown>) => Promise<CallToolResponse>;
  
  // Display Controls
  requestFullscreen: () => Promise<void>;
  requestInline: () => Promise<void>;
  requestPip: () => Promise<void>;
  requestDisplayMode: (mode: DisplayMode) => Promise<{ mode: DisplayMode }>;
  requestClose: () => void;
  
  // Navigation
  openExternal: (url: string) => void;
  sendFollowUpMessage: (prompt: string) => Promise<void>;
  
  // Data Access
  getToolInput: <T>() => T | null;
  getToolOutput: <T>() => T | null;
  getToolResponseMetadata: <T>() => T | null;
  getTheme: () => 'light' | 'dark';
  getMaxHeight: () => number;
  getDisplayMode: () => DisplayMode;
  getUserAgent: () => UserAgent | null;
  getLocale: () => string;
  getSafeArea: () => SafeArea | null;
}
```

**Example:**
```typescript
function InteractiveWidget() {
  const { isReady, callTool, getToolOutput, requestFullscreen } = useWidgetSDK();
  
  const handleAction = async () => {
    const result = await callTool('process_data', { id: '123' });
    console.log('Tool result:', result);
  };
  
  return (
    <div>
      <button onClick={handleAction}>Process</button>
      <button onClick={requestFullscreen}>Fullscreen</button>
    </div>
  );
}
```

### useTheme()

Get the current theme (light or dark mode).

**Returns:** `'light' | 'dark' | null`

**Example:**
```typescript
function ThemedWidget() {
  const theme = useTheme();
  
  const styles = {
    background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
    color: theme === 'dark' ? '#ffffff' : '#000000',
    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
  };
  
  return <div style={styles}>Theme-aware content</div>;
}
```

### useDisplayMode()

Get the current display mode.

**Returns:** `'inline' | 'fullscreen' | 'pip' | null`

**Example:**
```typescript
function ResponsiveWidget() {
  const displayMode = useDisplayMode();
  
  const padding = displayMode === 'fullscreen' ? '48px' : '16px';
  const fontSize = displayMode === 'fullscreen' ? '24px' : '16px';
  
  return (
    <div style={{ padding, fontSize }}>
      {displayMode === 'fullscreen' ? 'Fullscreen View' : 'Compact View'}
    </div>
  );
}
```

### useMaxHeight()

Get the maximum height constraint for the widget.

**Returns:** `number | null`

**Example:**
```typescript
function ScrollableWidget() {
  const maxHeight = useMaxHeight();
  
  return (
    <div style={{ 
      maxHeight: maxHeight ? `${maxHeight}px` : 'none',
      overflow: 'auto'
    }}>
      <LongContent />
    </div>
  );
}
```

### useWidgetState()

Manage persistent widget state with automatic synchronization.

**Returns:**
```typescript
{
  state: T | null;
  setState: (value: T | ((prev: T) => T)) => Promise<void>;
  isLoading: boolean;
}
```

**Example:**
```typescript
interface FormState {
  name: string;
  email: string;
}

function StatefulWidget() {
  const { state, setState, isLoading } = useWidgetState<FormState>();
  
  const updateName = (name: string) => {
    setState(prev => ({ ...prev, name }));
  };
  
  return (
    <div>
      <input 
        value={state?.name || ''} 
        onChange={(e) => updateName(e.target.value)}
      />
    </div>
  );
}
```

### useOpenAiGlobal()

Subscribe to specific window.openai properties with automatic re-rendering on changes.

**Parameters:**
- `key: keyof OpenAiGlobals` - Property to subscribe to

**Returns:** Property value or `null`

**Example:**
```typescript
function LocaleWidget() {
  const locale = useOpenAiGlobal('locale');
  const userAgent = useOpenAiGlobal('userAgent');
  
  return (
    <div>
      <p>Locale: {locale}</p>
      <p>Device: {userAgent?.deviceType}</p>
    </div>
  );
}
```

## WidgetSDK Class

Singleton class providing direct access to all widget functionality.

### getInstance()

Get the global SDK instance.

**Returns:** `WidgetSDK`

**Example:**
```typescript
import { getWidgetSDK } from '@nitrostack/widgets';

const sdk = getWidgetSDK();
```

### isReady()

Check if the SDK is initialized and ready to use. Works with both OpenAI Apps SDK and MCP Apps.

**Returns:** `boolean`

**Example:**
```typescript
const sdk = getWidgetSDK();
if (sdk.isReady()) {
  const theme = sdk.getTheme();
}
```

### isOpenAI()

Check if running in OpenAI Apps SDK context (`window.openai`).

**Returns:** `boolean`

**Example:**
```typescript
const sdk = getWidgetSDK();
if (sdk.isOpenAI()) {
  // OpenAI-specific features available
}
```

### isMcpApps()

Check if running in MCP Apps context (`window.__MCP_APP_CONTEXT__`).

**Returns:** `boolean`

**Example:**
```typescript
const sdk = getWidgetSDK();
if (sdk.isMcpApps()) {
  // MCP Apps-specific features available
}
```

### waitForReady()

Wait for the SDK to be ready with optional timeout.

**Parameters:**
- `timeout?: number` - Timeout in milliseconds (default: 5000)

**Returns:** `Promise<void>`

**Example:**
```typescript
const sdk = getWidgetSDK();
try {
  await sdk.waitForReady(3000);
  console.log('SDK ready');
} catch (error) {
  console.error('SDK initialization timeout');
}
```

## State Management

### setState()

Set widget state with persistence.

**Parameters:**
- `state: any` - State object to persist

**Returns:** `Promise<void>`

**Example:**
```typescript
const { setState } = useWidgetSDK();

await setState({ 
  selectedItems: [1, 2, 3],
  filters: { category: 'electronics' }
});
```

### getState()

Get current widget state.

**Returns:** `any | null`

**Example:**
```typescript
const { getState } = useWidgetSDK();
const currentState = getState();
```

## Tool Calling

### callTool()

Call an MCP tool from within the widget.

**Parameters:**
- `name: string` - Tool name
- `args?: Record<string, unknown>` - Tool arguments

**Returns:** `Promise<CallToolResponse>`

**Example:**
```typescript
const { callTool } = useWidgetSDK();

const result = await callTool('search_products', {
  query: 'laptop',
  limit: 10
});

console.log('Products:', result.content);
```

## Display Controls

### requestFullscreen()

Request fullscreen display mode.

**Returns:** `Promise<void>`

**Example:**
```typescript
const { requestFullscreen } = useWidgetSDK();

<button onClick={requestFullscreen}>
  Expand to Fullscreen
</button>
```

### requestInline()

Request inline display mode.

**Returns:** `Promise<void>`

### requestPip()

Request picture-in-picture display mode.

**Returns:** `Promise<void>`

### requestDisplayMode()

Request specific display mode.

**Parameters:**
- `mode: DisplayMode` - 'inline' | 'fullscreen' | 'pip'

**Returns:** `Promise<{ mode: DisplayMode }>`

**Example:**
```typescript
const { requestDisplayMode } = useWidgetSDK();

await requestDisplayMode('fullscreen');
```

### requestClose()

Close the widget.

**Returns:** `void`

**Example:**
```typescript
const { requestClose } = useWidgetSDK();

<button onClick={requestClose}>Close</button>
```

## Navigation

### openExternal()

Open a URL in an external browser.

**Parameters:**
- `url: string` - URL to open

**Returns:** `void`

**Example:**
```typescript
const { openExternal } = useWidgetSDK();

<a onClick={() => openExternal('https://example.com')}>
  Visit Website
</a>
```

### sendFollowUpMessage()

Send a follow-up message to the chat.

**Parameters:**
- `prompt: string` - Message to send

**Returns:** `Promise<void>`

**Example:**
```typescript
const { sendFollowUpMessage } = useWidgetSDK();

const askForMore = async () => {
  await sendFollowUpMessage('Show me more products like this');
};
```

## Data Access

### getToolInput()

Get the input parameters passed to the tool.

**Type Parameter:** `T` - Type of input data

**Returns:** `T | null`

**Example:**
```typescript
interface SearchInput {
  query: string;
  filters: string[];
}

const { getToolInput } = useWidgetSDK();
const input = getToolInput<SearchInput>();

console.log('Search query:', input?.query);
```

### getToolOutput()

Get the output data from the tool.

**Type Parameter:** `T` - Type of output data

**Returns:** `T | null`

**Example:**
```typescript
interface ProductData {
  id: string;
  name: string;
  price: number;
}

const { getToolOutput } = useWidgetSDK();
const product = getToolOutput<ProductData>();
```

### getToolResponseMetadata()

Get metadata about the tool response.

**Type Parameter:** `T` - Type of metadata

**Returns:** `T | null`

### getTheme()

Get current theme.

**Returns:** `'light' | 'dark'`

### getMaxHeight()

Get maximum height constraint.

**Returns:** `number`

### getDisplayMode()

Get current display mode.

**Returns:** `DisplayMode`

### getUserAgent()

Get user agent information.

**Returns:** `UserAgent | null`

**Example:**
```typescript
const { getUserAgent } = useWidgetSDK();
const ua = getUserAgent();

if (ua?.deviceType === 'mobile') {
  // Show mobile-optimized UI
}
```

### getLocale()

Get user's locale.

**Returns:** `string`

**Example:**
```typescript
const { getLocale } = useWidgetSDK();
const locale = getLocale(); // e.g., 'en-US'
```

### getSafeArea()

Get safe area insets for the widget.

**Returns:** `SafeArea | null`

## Utility Functions

### prefersReducedMotion()

Check if user prefers reduced motion.

**Returns:** `boolean`

**Example:**
```typescript
import { prefersReducedMotion } from '@nitrostack/widgets';

const shouldAnimate = !prefersReducedMotion();
```

### isPrimarilyTouchDevice()

Check if device is primarily touch-based.

**Returns:** `boolean`

**Example:**
```typescript
import { isPrimarilyTouchDevice } from '@nitrostack/widgets';

const buttonSize = isPrimarilyTouchDevice() ? '48px' : '32px';
```

### isHoverAvailable()

Check if hover interactions are available.

**Returns:** `boolean`

**Example:**
```typescript
import { isHoverAvailable } from '@nitrostack/widgets';

const showTooltipOnHover = isHoverAvailable();
```

### prefersDarkColorScheme()

Check if user prefers dark color scheme.

**Returns:** `boolean`

**Example:**
```typescript
import { prefersDarkColorScheme } from '@nitrostack/widgets';

const defaultTheme = prefersDarkColorScheme() ? 'dark' : 'light';
```

## Type Definitions

### DisplayMode

```typescript
type DisplayMode = 'inline' | 'fullscreen' | 'pip';
```

### Theme

```typescript
type Theme = 'light' | 'dark';
```

### CallToolResponse

```typescript
interface CallToolResponse {
  result: string;              // Primary result as string
  structuredContent?: unknown; // Optional structured content (OpenAI Apps SDK)
  isError?: boolean;           // Error indicator
}
```

### UserAgent

```typescript
interface UserAgent {
  deviceType: DeviceType;
  browser: string;
  os: string;
}

type DeviceType = 'mobile' | 'tablet' | 'desktop';
```

### SafeArea

```typescript
interface SafeArea {
  insets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}
```

### McpAppContext (MCP Apps Compatibility)

```typescript
interface McpAppContext<ToolInput = unknown, ToolOutput = unknown> {
  toolInput: ToolInput;
  toolOutput: ToolOutput | null;
  theme: Theme;
  locale: string;
  displayMode: DisplayMode;
  maxHeight: number;
}
```

### McpAppAPI (MCP Apps Compatibility)

```typescript
interface McpAppAPI {
  callTool: (name: string, args: Record<string, unknown>) => Promise<CallToolResponse>;
  requestDisplayMode: (args: { mode: DisplayMode }) => Promise<{ mode: DisplayMode }>;
  requestClose(): void;
  openExternal(payload: { href: string }): void;
}
```

## Components

### WidgetLayout

Wrapper component that provides consistent layout and theme integration.

**Props:**
```typescript
interface WidgetLayoutProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
```

**Example:**
```typescript
import { WidgetLayout } from '@nitrostack/widgets';

export default function MyWidget() {
  return (
    <WidgetLayout>
      <h1>My Widget</h1>
      <p>Content automatically adapts to theme</p>
    </WidgetLayout>
  );
}
```

## Legacy API

### withToolData()

Higher-Order Component for automatic data fetching (legacy pattern).

Note: This is maintained for backward compatibility. New widgets should use `useWidgetSDK()` instead.

**Example:**
```typescript
import { withToolData } from '@nitrostack/widgets';

function MyWidget({ data }) {
  return <div>{data.title}</div>;
}

export default withToolData(MyWidget);
```

## Best Practices

### 1. Always Check isReady

```typescript
const { isReady, getToolOutput } = useWidgetSDK();

if (!isReady) {
  return <div>Loading...</div>;
}

const data = getToolOutput();
```

### 2. Use Type Parameters

```typescript
interface ProductData {
  id: string;
  name: string;
  price: number;
}

const product = getToolOutput<ProductData>();
// TypeScript knows the shape of product
```

### 3. Handle Null Values

```typescript
const theme = useTheme();
const bgColor = theme === 'dark' ? '#000' : '#fff';
// Default to light theme if null
```

### 4. Combine Hooks for Responsive Design

```typescript
function AdaptiveWidget() {
  const theme = useTheme();
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  
  const styles = {
    background: theme === 'dark' ? '#000' : '#fff',
    padding: displayMode === 'fullscreen' ? '48px' : '16px',
    maxHeight: maxHeight ? `${maxHeight}px` : 'none'
  };
  
  return <div style={styles}>Adaptive content</div>;
}
```

## Migration from withToolData

See [Widget SDK Migration Guide](../../guides/widget-sdk-migration.md) for detailed migration instructions.

## See Also

- [UI Widgets Guide](./16-ui-widgets-guide.md)
- [Tools Guide](./04-tools-guide.md)
- [Widget Examples Guide](../../WIDGET_EXAMPLES_GUIDE.md)
