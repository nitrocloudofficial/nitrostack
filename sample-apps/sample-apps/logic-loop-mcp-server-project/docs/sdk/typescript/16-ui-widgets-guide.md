# UI Widgets Guide

## Overview

Widgets are Next.js components that render visual UI for tool and resource responses. They provide rich, interactive displays for data returned by your MCP server. NitroStack provides a modern Widget SDK with React hooks for building powerful, theme-aware widgets.

## Quick Start

### 1. Create a Widget

```typescript
// src/widgets/app/product-card/page.tsx
'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

interface ProductData {
  id: string;
  name: string;
  price: number;
  image_url?: string;
}

export default function ProductCard() {
  const { isReady, getToolOutput } = useWidgetSDK();
  
  if (!isReady) {
    return <div>Loading...</div>;
  }
  
  const product = getToolOutput<ProductData>();
  
  return (
    <div style={{
      background: '#000',
      color: '#fff',
      padding: '24px',
      borderRadius: '12px'
    }}>
      {product.image_url && (
        <img src={product.image_url} alt={product.name} />
      )}
      <h2>{product.name}</h2>
      <p>${product.price.toFixed(2)}</p>
    </div>
  );
}
```

### 2. Connect to Tool

```typescript
import { Tool, Widget } from '@nitrostack/core';

@Tool({
  name: 'get_product',
  description: 'Get product details',
  inputSchema: z.object({
    product_id: z.string()
  }),
  // Invocation status messages (shown during tool execution)
  invocation: {
    invoking: 'Loading product...',
    invoked: 'Product loaded'
  },
  // Example data for widget preview
  examples: {
    request: { product_id: 'prod-123' },
    response: {
      id: 'prod-123',
      name: 'Awesome Product',
      price: 99.99,
      image_url: 'https://example.com/image.jpg'
    }
  }
})
@Widget('product-card')
async getProduct(input: any, ctx: ExecutionContext) {
  return {
    id: input.product_id,
    name: 'Awesome Product',
    price: 99.99,
    image_url: 'https://example.com/image.jpg'
  };
}
```

> **Important:** The `examples.response` data is used by clients to render widget previews before the tool is executed. Always provide realistic example data that matches your response structure.

### `@Widget` options (route, CSP, domain, border)

`@Widget` accepts either a **string** (the widget route only) or an **object** with a required **`route`** and optional metadata for hosted clients (OpenAI Apps SDK / MCP Apps):

| Field | Type | Description |
|-------|------|-------------|
| `route` | `string` | Required in object form. Matches `src/widgets/app/{route}/page.tsx`. |
| `csp` | `object` | Optional allowlists: `resourceDomains`, `connectDomains`, `frameDomains` (HTTPS origins). |
| `domain` | `string` | Optional HTTPS origin for the widget sandbox (`openai/widgetDomain`), e.g. production app URL. |
| `prefersBorder` | `boolean` | Optional; maps to `openai/widgetPrefersBorder`. |

```typescript
@Widget({
  route: 'product-card',
  prefersBorder: true,
  domain: 'https://myapp.example.com',
  csp: {
    resourceDomains: ['https://images.unsplash.com'],
    connectDomains: ['https://api.example.com'],
  },
})
async getProduct(input: any, ctx: ExecutionContext) {
  // ...
}
```

For **why** CSP matters, how it appears on `tools/list` and `resources/read`, and host-specific field names, see **[Widget Content Security Policy](../../guides/widget-content-security-policy.md)**. The full decorator signature is in **[Decorators reference](../../api-reference/decorators.md#widget)**.

## Platform Compatibility

NitroStack widgets are compatible with both **OpenAI Apps SDK** and **MCP Apps** specifications:

| Platform | API | Ready Event |
|----------|-----|-------------|
| OpenAI Apps SDK | `window.openai` | `openai:ready` |
| MCP Apps | `window.__MCP_APP_CONTEXT__` | `mcp:ready` |

The Widget SDK handles this automatically - your widgets work on both platforms without changes.

```typescript
const { isReady } = useWidgetSDK();

// isReady checks for BOTH platforms automatically
if (isReady) {
  // Widget works on OpenAI ChatGPT AND MCP Apps clients
}
```

## Modern Widget SDK

### useWidgetSDK Hook

The primary way to build widgets. Provides access to all SDK functionality.

```typescript
import { useWidgetSDK } from '@nitrostack/widgets';

export default function MyWidget() {
  const { 
    isReady,           // SDK initialization status
    getToolOutput,     // Get tool response data
    callTool,          // Call other tools
    requestFullscreen, // Display controls
    setState,          // State management
    getTheme          // Theme information
  } = useWidgetSDK();
  
  if (!isReady) return <div>Loading...</div>;
  
  const data = getToolOutput();
  
  return <div>{data.content}</div>;
}
```

### Theme-Aware Widgets

Use `useTheme()` to create widgets that adapt to light/dark mode.

```typescript
import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

export default function ThemedWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const theme = useTheme();
  
  if (!isReady) return <div>Loading...</div>;
  
  const data = getToolOutput();
  
  const styles = {
    background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
    color: theme === 'dark' ? '#ffffff' : '#000000',
    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
  };
  
  return (
    <div style={styles}>
      <h2>{data.title}</h2>
      <p>{data.description}</p>
    </div>
  );
}
```

### Responsive Widgets

Use `useDisplayMode()` to adapt to different display modes.

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
      <h1>{data.title}</h1>
      {displayMode === 'fullscreen' && (
        <div>Additional details shown in fullscreen</div>
      )}
    </div>
  );
}
```

## Interactive Widgets

### Calling Tools from Widgets

```typescript
import { useWidgetSDK } from '@nitrostack/widgets';

export default function InteractiveWidget() {
  const { isReady, getToolOutput, callTool, sendFollowUpMessage } = useWidgetSDK();
  
  if (!isReady) return <div>Loading...</div>;
  
  const data = getToolOutput();
  
  const handleAction = async () => {
    const result = await callTool('process_item', { id: data.id });
    console.log('Result:', result);
  };
  
  const askQuestion = async () => {
    await sendFollowUpMessage('Tell me more about this item');
  };
  
  return (
    <div>
      <h2>{data.title}</h2>
      <button onClick={handleAction}>Process</button>
      <button onClick={askQuestion}>Learn More</button>
    </div>
  );
}
```

### State Management

Use `useWidgetState()` for persistent widget state.

```typescript
import { useWidgetSDK, useWidgetState } from '@nitrostack/widgets';

interface FormState {
  name: string;
  email: string;
}

export default function StatefulWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const { state, setState } = useWidgetState<FormState>();
  
  if (!isReady) return <div>Loading...</div>;
  
  const data = getToolOutput();
  
  const updateName = async (name: string) => {
    await setState({ ...state, name });
  };
  
  return (
    <div>
      <input 
        value={state?.name || ''} 
        onChange={(e) => updateName(e.target.value)}
        placeholder="Name"
      />
      <p>Current name: {state?.name}</p>
    </div>
  );
}
```

### Display Controls

```typescript
import { useWidgetSDK } from '@nitrostack/widgets';

export default function ControlsWidget() {
  const { 
    isReady, 
    getToolOutput, 
    requestFullscreen, 
    requestInline,
    requestClose 
  } = useWidgetSDK();
  
  if (!isReady) return <div>Loading...</div>;
  
  const data = getToolOutput();
  
  return (
    <div>
      <h2>{data.title}</h2>
      <button onClick={requestFullscreen}>Fullscreen</button>
      <button onClick={requestInline}>Inline</button>
      <button onClick={requestClose}>Close</button>
    </div>
  );
}
```

## Complex Examples

### Product Grid

```typescript
import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
}

interface ProductGridData {
  products: Product[];
  pagination: {
    page: number;
    totalPages: number;
  };
}

export default function ProductsGrid() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const theme = useTheme();
  
  if (!isReady) return <div>Loading...</div>;
  
  const data = getToolOutput<ProductGridData>();
  
  const containerStyle = {
    background: theme === 'dark' ? '#000' : '#fff',
    color: theme === 'dark' ? '#fff' : '#000',
    padding: '24px',
    borderRadius: '12px'
  };
  
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    marginTop: '16px'
  };
  
  const cardStyle = {
    background: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
    borderRadius: '8px',
    padding: '16px',
    border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`
  };
  
  return (
    <div style={containerStyle}>
      <h2>Products (Page {data.pagination.page} of {data.pagination.totalPages})</h2>
      
      <div style={gridStyle}>
        {data.products.map((product) => (
          <div key={product.id} style={cardStyle}>
            <img
              src={product.image_url}
              alt={product.name}
              style={{
                width: '100%',
                height: '150px',
                objectFit: 'cover',
                borderRadius: '4px',
                marginBottom: '12px'
              }}
            />
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>
              {product.name}
            </h3>
            <p style={{ fontSize: '20px', fontWeight: 'bold' }}>
              ${product.price.toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Dashboard Widget

```typescript
import { useWidgetSDK, useTheme, useDisplayMode } from '@nitrostack/widgets';

interface DashboardData {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  stats: {
    orders: number;
    spent: number;
    points: number;
  };
  recentOrders: Array<{
    id: string;
    total: number;
    date: string;
  }>;
}

export default function UserDashboard() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const theme = useTheme();
  const displayMode = useDisplayMode();
  
  if (!isReady) return <div>Loading...</div>;
  
  const data = getToolOutput<DashboardData>();
  
  const isFullscreen = displayMode === 'fullscreen';
  
  const containerStyle = {
    background: theme === 'dark' ? '#000' : '#fff',
    color: theme === 'dark' ? '#fff' : '#000',
    padding: isFullscreen ? '48px' : '24px',
    borderRadius: '12px',
    maxWidth: isFullscreen ? '1200px' : '800px'
  };
  
  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        {data.user.avatar && (
          <img
            src={data.user.avatar}
            alt={data.user.name}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              marginRight: '16px'
            }}
          />
        )}
        <div>
          <h2 style={{ marginBottom: '4px' }}>{data.user.name}</h2>
          <p style={{ color: theme === 'dark' ? '#999' : '#666' }}>
            {data.user.email}
          </p>
        </div>
      </div>
      
      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <StatCard label="Orders" value={data.stats.orders} theme={theme} />
        <StatCard label="Total Spent" value={`$${data.stats.spent}`} theme={theme} />
        <StatCard label="Points" value={data.stats.points} theme={theme} />
      </div>
      
      {/* Recent Orders */}
      <h3 style={{ marginBottom: '16px' }}>Recent Orders</h3>
      {data.recentOrders.map((order) => (
        <div
          key={order.id}
          style={{
            background: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'space-between'
          }}
        >
          <span>Order #{order.id}</span>
          <span>${order.total.toFixed(2)}</span>
          <span style={{ color: theme === 'dark' ? '#999' : '#666' }}>
            {order.date}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, theme }: { 
  label: string; 
  value: string | number;
  theme: 'light' | 'dark' | null;
}) {
  return (
    <div style={{
      background: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
      padding: '20px',
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
        {value}
      </div>
      <div style={{ 
        color: theme === 'dark' ? '#999' : '#666', 
        marginTop: '8px' 
      }}>
        {label}
      </div>
    </div>
  );
}
```

## Styling Widgets

### Inline Styles (Recommended)

Use inline styles for widgets to ensure they work in iframes:

```typescript
const styles = {
  container: {
    background: '#000',
    color: '#fff',
    padding: '24px',
    borderRadius: '12px',
    fontFamily: 'system-ui, sans-serif'
  },
  heading: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '16px'
  },
  button: {
    background: '#007bff',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};

export default function StyledWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  
  if (!isReady) return <div>Loading...</div>;
  
  const data = getToolOutput();
  
  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>{data.title}</h2>
      <button style={styles.button}>Click me</button>
    </div>
  );
}
```

### Why Not Tailwind?

Tailwind CSS classes may not work in iframes due to CSS scope issues. Use inline styles for widgets.

## Utility Functions

### Device Detection

```typescript
import { 
  isPrimarilyTouchDevice, 
  isHoverAvailable,
  prefersReducedMotion 
} from '@nitrostack/widgets';

export default function AdaptiveWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  
  if (!isReady) return <div>Loading...</div>;
  
  const data = getToolOutput();
  
  const buttonSize = isPrimarilyTouchDevice() ? '48px' : '32px';
  const showHoverEffects = isHoverAvailable();
  const animate = !prefersReducedMotion();
  
  return (
    <button style={{ 
      height: buttonSize,
      transition: animate ? 'all 0.3s' : 'none'
    }}>
      {data.label}
    </button>
  );
}
```

## Best Practices

### 1. Always Check isReady

```typescript
const { isReady } = useWidgetSDK();

if (!isReady) {
  return <div>Loading...</div>;
}
```

### 2. Use TypeScript

```typescript
interface ProductData {
  id: string;
  name: string;
  price: number;
}

const product = getToolOutput<ProductData>();
// TypeScript knows the shape of product
```

### 3. Handle Missing Data

```typescript
const data = getToolOutput();

if (!data) {
  return <div>No data available</div>;
}

// Safe to use data
return <div>{data.title}</div>;
```

### 4. Use Theme for Better UX

```typescript
const theme = useTheme();

const styles = {
  background: theme === 'dark' ? '#000' : '#fff',
  color: theme === 'dark' ? '#fff' : '#000'
};
```

### 5. Provide Example Data and Invocation Messages

```typescript
@Tool({
  name: 'get_product',
  description: 'Get product details',
  inputSchema: z.object({ product_id: z.string() }),
  // Status messages shown during execution
  invocation: {
    invoking: 'Loading product...',  // Shown while running
    invoked: 'Product loaded'        // Shown when complete
  },
  // Example data for widget preview (REQUIRED for widget preview)
  examples: {
    request: { product_id: 'prod-123' },
    response: { 
      id: 'prod-123', 
      name: 'Product', 
      price: 99.99,
      image_url: 'https://example.com/img.jpg'
    }
  }
})
@Widget('product-card')
```

> **Note:** Without `examples.response`, the widget preview won't render in the client.

## Debugging Widgets

### Test Locally

```bash
cd src/widgets
npm run dev  # Runs on port 3001
```

Visit: `http://localhost:3001/product-card?data={"id":"1","name":"Test"}`

### Check Studio

```bash
nitrostack-cli dev  # Studio on port 3000
```

- Navigate to Tools page
- Click "Enlarge" on a tool with a widget
- Check browser console for errors

## Legacy Patterns

### withToolData HOC

Note: This is the legacy pattern. New widgets should use `useWidgetSDK()` instead.

```typescript
import { withToolData } from '@nitrostack/widgets';

function ProductCard({ data }) {
  return (
    <div>
      <h2>{data.name}</h2>
      <p>${data.price}</p>
    </div>
  );
}

export default withToolData(ProductCard);
```

For migration from `withToolData` to `useWidgetSDK`, see the [Widget SDK Migration Guide](../../guides/widget-sdk-migration.md).

## Next Steps

- [Widget SDK Reference](./18-widget-sdk-reference.md) - Complete API documentation
- [Widget SDK Migration Guide](../../guides/widget-sdk-migration.md) - Migrate from withToolData
- [Tools Guide](./04-tools-guide.md) - Connect widgets to tools
- [Widget Examples Guide](../../WIDGET_EXAMPLES_GUIDE.md) - Advanced examples

## See Also

- [Type Generation](../../cli/08-generate-command.md)
- [Studio Guide](../../STUDIO_GUIDE.md)
- [Testing Guide](./14-testing-guide.md)
