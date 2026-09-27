---
name: nitrostack-ui-widgets
description: Best practices for linking tools to interactive frontend widgets using @Widget and @nitrostack/widgets SDK (including state sync, tool calling, display modes, media queries, and chat actions).
---

## When to Use
Use this skill when designing, building, or modifying interactive user interface widgets that display custom React content inside AI clients or NitroStudio.

---

## 1. Backend Definition (`@Widget`)
To display a React-based widget for a tool's output, decorate the tool method with `@Widget`.

### Options:
* **String Route**: A simple string representing the route identifier in the frontend React app (e.g. `'product-card'`).
* **Object Route**: Object including:
  * `route` (required): The route path.
  * `domain` (optional): Allowed sandbox domain.
  * `csp` (optional): Content Security Policy guidelines.

### Example:
```typescript
import { Tool, Widget, z } from '@nitrostack/core';

export class CatalogTools {
  @Tool({
    name: 'fetch_product',
    description: 'Get product information by barcode.',
    inputSchema: z.object({ barcode: z.string() }),
  })
  @Widget('product-details') // Maps to the "product-details" frontend component
  async fetchProduct(input: { barcode: string }) {
    return {
      name: 'Super Nitro Energy Drink',
      price: 2.99,
      sku: input.barcode,
    };
  }
}
```

---

## 2. Frontend React Widget (`@nitrostack/widgets`)
In your React widget frontend application (typically a Next.js client component), use the `useWidgetSDK` hook to receive input data from the client host.

### React Component Example:
```tsx
'use client';

import React from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

interface ProductData {
  name: string;
  price: number;
  sku: string;
}

export default function ProductDetailsWidget() {
  const { isReady, getToolOutput, theme } = useWidgetSDK();
  const data = getToolOutput<ProductData>();

  if (!isReady) {
    return <div className="loading">Connecting to host...</div>;
  }

  if (!data) {
    return <div className="error">No product data received.</div>;
  }

  return (
    <div className={`product-card ${theme === 'dark' ? 'dark' : 'light'}`}>
      <h3>{data.name}</h3>
      <p className="price">${data.price.toFixed(2)}</p>
      <span className="sku">SKU: {data.sku}</span>
    </div>
  );
}
```

---

## 3. State Management & Synchronization (`useWidgetState`)
Use `useWidgetState` to manage and persist client-side widget state (e.g. selected tabs, filter values, input states). This state automatically synchronizes with the host application context, persisting it across page re-renders.

### Example:
```tsx
import React from 'react';
import { useWidgetState } from '@nitrostack/widgets';

export default function StationPanelWidget() {
  const [state, setState] = useWidgetState(() => ({
    selectedTab: 'overview',
    showExtendedInfo: false,
  }));

  return (
    <div>
      <button onClick={() => setState({ ...state, selectedTab: 'alerts' })}>
        View Alerts
      </button>
      <p>Current Tab: {state?.selectedTab}</p>
    </div>
  );
}
```

---

## 4. Calling Core Tools from Widgets (`callTool`)
You can invoke other backend MCP tools directly from the frontend widget using `callTool`. This is useful for tool chaining or triggering detailed audits.

### Example:
```tsx
import React, { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

export default function SystemDiagnostics() {
  const { callTool, isReady } = useWidgetSDK();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const runDiagnostic = async () => {
    if (!isReady) return;
    setIsRunning(true);
    try {
      const response = await callTool('run_diagnostic', { system: 'oxygen_scrubber' });
      setResult(response.result as string);
    } catch (err) {
      setResult('Diagnostic execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <button onClick={runDiagnostic} disabled={isRunning}>
      {isRunning ? 'Running...' : 'Run Diagnostics'}
    </button>
  );
}
```

---

## 5. Layout & Display Controls
Widgets can dynamically request size mode changes (fullscreen, inline, picture-in-picture) and adapt layouts to safe areas (dynamic islands/notches) or maximum height constraints.

### Key Methods:
* `requestFullscreen()`: Switch host widget display to fullscreen.
* `requestInline()`: Switch host widget display back to inline.
* `requestPip()`: Float widget in Picture-in-Picture.
* `requestClose()`: Dismiss the widget completely.

### Example:
```tsx
import React from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

export default function StatusBoard() {
  const { 
    requestFullscreen, 
    requestInline, 
    requestClose,
    displayMode,   // Reactive property ('fullscreen' | 'inline' | 'pip')
    maxHeight,     // Reactive maxHeight constraint (in pixels)
    getSafeArea    // Insets data: { top, right, bottom, left }
  } = useWidgetSDK();

  const safeArea = getSafeArea() || { top: 0, bottom: 0 };

  return (
    <div style={{ maxHeight: maxHeight || 400, paddingTop: safeArea.top }}>
      <h3>Mode: {displayMode}</h3>
      <button onClick={requestFullscreen}>Fullscreen</button>
      <button onClick={requestInline}>Collapse</button>
      <button onClick={requestClose}>Dismiss Widget</button>
    </div>
  );
}
```

---

## 6. Chat Navigation & Actions
Widgets can interact with the host chat pane using external browser links and follow-up prompts.

### Key Methods:
* `openExternal(url)`: Open the target URL safely in the user's primary external browser.
* `sendFollowUpMessage(prompt)`: Insert a message into the chat flow, automatically submitting it to the LLM agent.

### Example:
```tsx
import React from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

export default function MissionControl() {
  const { openExternal, sendFollowUpMessage } = useWidgetSDK();

  return (
    <div>
      {/* Open external documentation */}
      <button onClick={() => openExternal('https://docs.nitrostack.dev')}>
        Open Manual
      </button>

      {/* Ask LLM agent directly from the widget */}
      <button onClick={() => sendFollowUpMessage('Analyze mission failures from last week')}>
        Ask Agent to Analyze
      </button>
    </div>
  );
}
```

---

## 7. Media & Accessibility Queries
The SDK provides helper utilities to query target client capabilities for styling or accessibility.

### Key Utilities:
* `prefersReducedMotion()`: Returns `true` if client settings specify reduced motion. Disable animations.
* `isPrimarilyTouchDevice()`: Returns `true` if the device has a coarse pointer (e.g. touch/mobile). Increase button target sizes.
* `isHoverAvailable()`: Returns `true` if pointer supports hover states.
* `prefersDarkColorScheme()`: Returns `true` if the system theme is dark.

### Example:
```tsx
import React from 'react';
import { isPrimarilyTouchDevice, prefersReducedMotion } from '@nitrostack/widgets';

export default function AccessiblePanel() {
  const isTouch = isPrimarilyTouchDevice();
  const reducedMotion = prefersReducedMotion();

  return (
    <div className={reducedMotion ? 'no-animations' : 'smooth-transitions'}>
      <button style={{ padding: isTouch ? '16px' : '8px' }}>
        Interactive Button
      </button>
    </div>
  );
}
```

---

## 8. Testing Widgets
* Open your project in **NitroStudio** for visual preview.
* Invoke the tool from the AI chat or testing pane to verify the widget updates instantly with the returned JSON structure.
