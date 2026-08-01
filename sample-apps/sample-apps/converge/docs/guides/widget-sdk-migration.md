# Widget SDK Migration Guide

## Overview

This guide helps you migrate from the legacy `withToolData` HOC pattern to the modern `useWidgetSDK` hook-based approach. The new SDK provides better type safety, more flexibility, and cleaner code.

## Why Migrate?

### Benefits of useWidgetSDK

- **Better Type Safety**: Full TypeScript support with generics
- **More Control**: Direct access to all SDK methods
- **Cleaner Code**: No HOC wrapper needed
- **Better Performance**: Hooks optimize re-renders automatically
- **Modern React**: Follows React best practices
- **More Features**: Access to theme, display mode, and other context

### Backward Compatibility

Note: `withToolData` is still supported and will continue to work. This migration is optional but recommended for new widgets.

## Quick Migration

### Before (withToolData)

```typescript
'use client';

import { withToolData } from '@nitrostack/widgets';

interface ProductData {
  id: string;
  name: string;
  price: number;
}

function ProductWidget({ data }: { data: ProductData }) {
  return (
    <div>
      <h2>{data.name}</h2>
      <p>${data.price}</p>
    </div>
  );
}

export default withToolData(ProductWidget);
```

### After (useWidgetSDK)

```typescript
'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

interface ProductData {
  id: string;
  name: string;
  price: number;
}

export default function ProductWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  
  if (!isReady) {
    return <div>Loading...</div>;
  }
  
  const data = getToolOutput<ProductData>();
  
  return (
    <div>
      <h2>{data.name}</h2>
      <p>${data.price}</p>
    </div>
  );
}
```

## Step-by-Step Migration

### Step 1: Remove withToolData

**Before:**
```typescript
import { withToolData } from '@nitrostack/widgets';

function MyWidget({ data }) {
  return <div>{data.title}</div>;
}

export default withToolData(MyWidget);
```

**After:**
```typescript
import { useWidgetSDK } from '@nitrostack/widgets';

export default function MyWidget() {
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput();
  
  return <div>{data.title}</div>;
}
```

### Step 2: Add Loading State

The HOC handled loading automatically. With hooks, you control it:

```typescript
export default function MyWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  
  // Add loading state
  if (!isReady) {
    return <div>Loading...</div>;
  }
  
  const data = getToolOutput();
  
  return <div>{data.title}</div>;
}
```

### Step 3: Add Type Safety

Use TypeScript generics for better type checking:

```typescript
interface MyData {
  title: string;
  count: number;
}

export default function MyWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  
  if (!isReady) {
    return <div>Loading...</div>;
  }
  
  // Type-safe data access
  const data = getToolOutput<MyData>();
  
  return (
    <div>
      <h1>{data.title}</h1>
      <p>Count: {data.count}</p>
    </div>
  );
}
```

## Common Patterns

### Pattern 1: Simple Data Display

**Before:**
```typescript
import { withToolData } from '@nitrostack/widgets';

function UserProfile({ data }) {
  return (
    <div>
      <h2>{data.name}</h2>
      <p>{data.email}</p>
    </div>
  );
}

export default withToolData(UserProfile);
```

**After:**
```typescript
import { useWidgetSDK } from '@nitrostack/widgets';

interface UserData {
  name: string;
  email: string;
}

export default function UserProfile() {
  const { isReady, getToolOutput } = useWidgetSDK();
  
  if (!isReady) return <div>Loading...</div>;
  
  const data = getToolOutput<UserData>();
  
  return (
    <div>
      <h2>{data.name}</h2>
      <p>{data.email}</p>
    </div>
  );
}
```

### Pattern 2: Interactive Widget

**Before:**
```typescript
import { withToolData } from '@nitrostack/widgets';

function ProductCard({ data }) {
  const handleClick = () => {
    // Limited access to SDK
    console.log('Clicked', data.id);
  };
  
  return (
    <div onClick={handleClick}>
      <h2>{data.name}</h2>
    </div>
  );
}

export default withToolData(ProductCard);
```

**After:**
```typescript
import { useWidgetSDK } from '@nitrostack/widgets';

interface ProductData {
  id: string;
  name: string;
}

export default function ProductCard() {
  const { isReady, getToolOutput, callTool, sendFollowUpMessage } = useWidgetSDK();
  
  if (!isReady) return <div>Loading...</div>;
  
  const data = getToolOutput<ProductData>();
  
  const handleClick = async () => {
    // Full SDK access
    await callTool('view_product', { id: data.id });
    await sendFollowUpMessage(`Tell me more about ${data.name}`);
  };
  
  return (
    <div onClick={handleClick}>
      <h2>{data.name}</h2>
    </div>
  );
}
```

### Pattern 3: Theme-Aware Widget

**Before:**
```typescript
import { withToolData } from '@nitrostack/widgets';

function ThemedWidget({ data }) {
  // No easy access to theme
  return (
    <div style={{ background: '#000', color: '#fff' }}>
      {data.content}
    </div>
  );
}

export default withToolData(ThemedWidget);
```

**After:**
```typescript
import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

export default function ThemedWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const theme = useTheme();
  
  if (!isReady) return <div>Loading...</div>;
  
  const data = getToolOutput();
  
  const styles = {
    background: theme === 'dark' ? '#000' : '#fff',
    color: theme === 'dark' ? '#fff' : '#000'
  };
  
  return (
    <div style={styles}>
      {data.content}
    </div>
  );
}
```

### Pattern 4: Responsive Widget

**Before:**
```typescript
import { withToolData } from '@nitrostack/widgets';

function ResponsiveWidget({ data }) {
  // No access to display mode
  return <div>{data.content}</div>;
}

export default withToolData(ResponsiveWidget);
```

**After:**
```typescript
import { useWidgetSDK, useDisplayMode } from '@nitrostack/widgets';

export default function ResponsiveWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const displayMode = useDisplayMode();
  
  if (!isReady) return <div>Loading...</div>;
  
  const data = getToolOutput();
  
  const padding = displayMode === 'fullscreen' ? '48px' : '16px';
  const fontSize = displayMode === 'fullscreen' ? '24px' : '16px';
  
  return (
    <div style={{ padding, fontSize }}>
      {data.content}
    </div>
  );
}
```

## Advanced Migration

### Accessing Multiple SDK Features

```typescript
import { useWidgetSDK, useTheme, useDisplayMode, useMaxHeight } from '@nitrostack/widgets';

export default function AdvancedWidget() {
  const { 
    isReady, 
    getToolOutput, 
    callTool, 
    requestFullscreen,
    setState,
    getState 
  } = useWidgetSDK();
  
  const theme = useTheme();
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  
  if (!isReady) return <div>Loading...</div>;
  
  const data = getToolOutput();
  
  // Use all features together
  const styles = {
    background: theme === 'dark' ? '#000' : '#fff',
    padding: displayMode === 'fullscreen' ? '48px' : '16px',
    maxHeight: maxHeight ? `${maxHeight}px` : 'none',
    overflow: 'auto'
  };
  
  return (
    <div style={styles}>
      <button onClick={requestFullscreen}>Fullscreen</button>
      {data.content}
    </div>
  );
}
```

### State Management

**Before:**
```typescript
import { withToolData } from '@nitrostack/widgets';
import { useState } from 'react';

function StatefulWidget({ data }) {
  const [count, setCount] = useState(0);
  // State not persisted
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

export default withToolData(StatefulWidget);
```

**After:**
```typescript
import { useWidgetSDK, useWidgetState } from '@nitrostack/widgets';

interface WidgetState {
  count: number;
}

export default function StatefulWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const { state, setState } = useWidgetState<WidgetState>();
  
  if (!isReady) return <div>Loading...</div>;
  
  const data = getToolOutput();
  const count = state?.count || 0;
  
  const increment = async () => {
    await setState({ count: count + 1 });
    // State persisted automatically
  };
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

## Migration Checklist

- [ ] Replace `withToolData` import with `useWidgetSDK`
- [ ] Remove HOC wrapper from export
- [ ] Add `useWidgetSDK()` hook call
- [ ] Add `isReady` check with loading state
- [ ] Replace `data` prop with `getToolOutput()`
- [ ] Add TypeScript types with generics
- [ ] Consider adding `useTheme()` for theme support
- [ ] Consider adding `useDisplayMode()` for responsive design
- [ ] Update any tool calling to use `callTool()`
- [ ] Test widget in Studio

## Troubleshooting

### Widget Shows "Loading..." Forever

**Problem:** `isReady` never becomes true

**Solution:** Ensure widget is being rendered in proper context (Studio or ChatGPT)

```typescript
// Add debugging
const { isReady } = useWidgetSDK();

useEffect(() => {
  console.log('SDK ready:', isReady);
}, [isReady]);
```

### Data is Null

**Problem:** `getToolOutput()` returns null

**Solution:** Check that tool is returning data correctly

```typescript
const data = getToolOutput();

if (!data) {
  return <div>No data available</div>;
}
```

### TypeScript Errors

**Problem:** Type errors with `getToolOutput()`

**Solution:** Provide explicit type parameter

```typescript
// Before (error)
const data = getToolOutput();
data.name; // TypeScript error

// After (fixed)
interface MyData {
  name: string;
}
const data = getToolOutput<MyData>();
data.name; // TypeScript knows the type
```

## Best Practices

### 1. Always Check isReady

```typescript
const { isReady } = useWidgetSDK();

if (!isReady) {
  return <div>Loading...</div>;
}
```

### 2. Use Type Parameters

```typescript
const data = getToolOutput<MyDataType>();
```

### 3. Combine Hooks for Better UX

```typescript
const { isReady, getToolOutput } = useWidgetSDK();
const theme = useTheme();
const displayMode = useDisplayMode();
```

### 4. Handle Errors Gracefully

```typescript
const { isReady, getToolOutput } = useWidgetSDK();

if (!isReady) {
  return <div>Loading...</div>;
}

const data = getToolOutput();

if (!data) {
  return <div>No data available</div>;
}
```

## Performance Considerations

### Hook Optimization

The new hooks are optimized for performance:

- `useWidgetSDK()` uses singleton pattern (no re-instantiation)
- `useTheme()` only re-renders when theme changes
- `useDisplayMode()` only re-renders when display mode changes
- `useWidgetState()` batches state updates

### Comparison

**withToolData:**
- Re-renders on any prop change
- Limited control over rendering

**useWidgetSDK:**
- Fine-grained control over re-renders
- Can optimize with React.memo if needed
- Better performance for complex widgets

## See Also

- [Widget SDK API Reference](../sdk/typescript/18-widget-sdk-reference.md)
- [UI Widgets Guide](../sdk/typescript/16-ui-widgets-guide.md)
- [Widget Examples Guide](../WIDGET_EXAMPLES_GUIDE.md)
