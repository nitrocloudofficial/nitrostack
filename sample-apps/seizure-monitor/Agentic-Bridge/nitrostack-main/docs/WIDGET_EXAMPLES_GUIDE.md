# Widget Examples Guide

## Overview

The Widget Examples system allows frontend and backend teams to work independently by enabling widget-level example definitions. This means frontend developers can create and preview widgets before backend tools are ready, and both teams can maintain their own examples.

## Architecture

### How It Works

1. **Widget Metadata**: Frontend developers define examples directly in widget files using `defineWidgetMetadata()`
2. **Widget Manifest**: Metadata is compiled into a `widget-manifest.json` file
3. **SDK Registry**: The MCP server loads the manifest and exposes widgets via `widget://examples` resource
4. **Example Resolution**: Studio uses a fallback system: Tool example → Widget example → No example

### Example Priority

```
Tool has example?
  ├─ YES → Use tool example
  └─ NO → Widget has example?
      ├─ YES → Use widget example
      └─ NO → Show placeholder
```

## For Frontend Developers

### 1. Define Widget Metadata

In your widget file (e.g., `src/widgets/app/my-widget/page.tsx`):

```typescript
'use client';

import { useWidgetSDK, defineWidgetMetadata } from '@nitrostack/widgets';

// Define metadata with examples
export const metadata = defineWidgetMetadata({
  uri: '/my-widget',
  name: 'My Widget',
  description: 'A beautiful widget for displaying data',
  examples: [
    {
      name: 'Example 1',
      description: 'Shows basic data',
      data: { title: 'Hello', count: 42 }
    },
    {
      name: 'Example 2',
      description: 'Shows advanced data',
      data: { title: 'World', count: 99, extra: 'info' }
    }
  ],
  tags: ['display', 'data']
});

interface MyWidgetData {
  title: string;
  count: number;
}

export default function MyWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  
  if (!isReady) {
    return <div>Loading...</div>;
  }
  
  const data = getToolOutput<MyWidgetData>();
  
  return (
    <div>
      <h1>{data.title}</h1>
      <p>Count: {data.count}</p>
    </div>
  );
}
```

### 2. Update Widget Manifest

Create or update `src/widgets/widget-manifest.json`:

```json
{
  "version": "1.0.0",
  "widgets": [
    {
      "uri": "/my-widget",
      "name": "My Widget",
      "description": "A beautiful widget for displaying data",
      "examples": [
        {
          "name": "Example 1",
          "description": "Shows basic data",
          "data": { "title": "Hello", "count": 42 }
        }
      ],
      "tags": ["display", "data"]
    }
  ],
  "generatedAt": "2025-01-01T00:00:00.000Z"
}
```

**Note**: In the future, this step will be automated by a build script that extracts metadata from widget files.

### 3. Preview in Studio

1. Start your MCP server: `npm run dev`
2. Open Studio at `http://localhost:3000`
3. Go to **Resources** tab
4. See your widget in the "UI Widgets" section
5. Click to preview with example data
6. Click "Enlarge" for full-screen view

### 4. Independent Development

You can now:
- Design and test widgets without backend tools
- Iterate on UI with realistic example data
- Share designs with stakeholders
- Hand off completed widgets to backend team

## For Backend Developers

### 1. Connect Tool to Widget

When the widget is ready, connect it to your tool:

```typescript
import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

export class MyTools {
  @Tool({
    name: 'my_tool',
    description: 'Does something cool',
    inputSchema: z.object({
      input: z.string()
    }),
    // Connect to widget
    widget: {
      uri: '/my-widget',
      transform: (output) => ({
        title: output.title,
        count: output.count
      })
    },
    // Optional: Override widget examples with tool-specific ones
    examples: {
      request: { input: 'test' },
      response: { title: 'Result', count: 10 }
    }
  })
  async myTool({ input }: { input: string }, ctx: ExecutionContext) {
    return { title: 'Result', count: input.length };
  }
}
```

### 2. Example Resolution

- If you provide `examples` in the `@Tool` decorator, they will be used
- If you don't provide examples, the widget's examples will be used automatically
- This allows flexibility: use widget examples during development, override with tool-specific examples in production

## Team Collaboration Workflow

### Scenario 1: Frontend First

1. **Frontend Team**:
   - Creates widget with `defineWidgetMetadata()`
   - Adds multiple examples
   - Tests in Studio Resources tab
   - Commits widget code

2. **Backend Team**:
   - Sees widget examples in Studio
   - Creates tool with `widget: { uri: '/my-widget' }`
   - Tool automatically uses widget examples
   - Optionally adds tool-specific examples later

### Scenario 2: Backend First

1. **Backend Team**:
   - Creates tool with `examples` in `@Tool` decorator
   - Tools tab shows tool with examples
   - Commits tool code

2. **Frontend Team**:
   - Sees tool examples in Studio
   - Creates widget matching the data structure
   - Adds widget metadata (optional, for Resources tab preview)
   - Commits widget code

### Scenario 3: Parallel Development

1. **Both Teams**:
   - Agree on data structure/interface
   - Frontend creates widget with examples
   - Backend creates tool with same structure
   - Examples are merged automatically

2. **Integration**:
   - Backend connects tool to widget
   - Tool examples override widget examples (if provided)
   - Both tabs show the tool with widgets

## Studio Integration

### Resources Tab

Shows all widgets with examples:

```
┌─────────────────────────────────────┐
│ UI Widgets (2)                   │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ My Widget                    │ │
│ │ A beautiful widget...            │ │
│ │ 3 examples • math, display      │ │
│ │ [Preview] [Enlarge]             │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Calculator Result            │ │
│ │ Displays calculation...          │ │
│ │ 3 examples • calculator, math   │ │
│ │ [Preview] [Enlarge]             │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Tools Tab

Shows tools with widget fallback:

- Tool has example → Shows tool example
- Tool has no example but widget does → Shows widget example
- Tool has no example and no widget → Shows placeholder

## Benefits

### For Teams

- **Independent Development**: Teams don't block each other
- **Faster Iteration**: Frontend can test UI without backend
- **Better Communication**: Examples serve as documentation
- **Flexibility**: Override examples at any level

### For Developers

- **Type Safety**: `defineWidgetMetadata()` provides IntelliSense
- **Hot Reload**: Changes appear immediately in Studio
- **Reusable Examples**: Share examples across tools
- **Version Control**: Examples committed with code

## API Reference

### `defineWidgetMetadata(metadata)`

Define widget metadata with type safety.

**Parameters:**
- `metadata.uri` (string): Widget route/URI
- `metadata.name` (string): Display name
- `metadata.description` (string): Widget description
- `metadata.examples` (array): Array of example objects
  - `examples[].name` (string): Example name
  - `examples[].description` (string): Example description
  - `examples[].data` (object): Example data matching widget interface
- `metadata.tags` (array, optional): Tags for categorization

**Returns:** The same metadata object (for type checking)

### Widget Manifest Structure

```typescript
interface WidgetManifest {
  version: string;
  widgets: WidgetMetadata[];
  generatedAt: string;
}

interface WidgetMetadata {
  uri: string;
  name: string;
  description: string;
  examples: WidgetExample[];
  tags?: string[];
}

interface WidgetExample {
  name: string;
  description: string;
  data: Record<string, any>;
}
```

### MCP Resource

The SDK exposes widget examples via:

```
widget://examples
```

This resource returns JSON with all registered widgets and their examples.

## Best Practices

### 1. Meaningful Examples

**Bad**: Generic data
```typescript
examples: [
  { name: 'Example', description: 'An example', data: { foo: 'bar' } }
]
```

**Good**: Realistic, specific data
```typescript
examples: [
  {
    name: 'High Stock Alert',
    description: 'Shows product with high inventory',
    data: { product: 'Laptop', stock: 150, status: 'in-stock' }
  },
  {
    name: 'Low Stock Warning',
    description: 'Shows product needing reorder',
    data: { product: 'Mouse', stock: 3, status: 'low-stock' }
  }
]
```

### 2. Cover Edge Cases

Include examples for:
- Normal cases
- Edge cases (empty lists, max values)
- Error states
- Loading states

### 3. Keep Examples Updated

When data structure changes:
- Update widget examples
- Update tool examples
- Test both in Studio

### 4. Use Tags Effectively

```typescript
tags: ['display', 'product', 'inventory', 'critical']
```

Tags help:
- Categorize widgets in Studio
- Filter in Resources tab
- Search across examples

## Troubleshooting

### Widget Examples Not Showing

1. Check widget manifest exists: `src/widgets/widget-manifest.json`
2. Verify manifest format (valid JSON)
3. Check server logs for manifest loading
4. Ensure `widget://examples` resource is registered

### Examples Not Updating

1. Restart dev mode (rebuilds everything): `npm run dev`
2. Clear browser cache
3. Check manifest file was updated
4. Check console for errors

### Type Errors

1. Ensure `@nitrostack/core` and `@nitrostack/widgets` are built if you are developing the framework locally
2. Verify imports: `import { defineWidgetMetadata } from '@nitrostack/widgets'`
3. Check `tsconfig.json` has correct `moduleResolution`

## Future Enhancements

### Planned Features

1. **Auto-Generation**: Build script to extract metadata from widget files
2. **CLI Commands**:
   ```bash
   nitrostack-cli generate widget my-widget
   nitrostack-cli sync widget-examples
   ```
3. **Studio Features**:
   - Filter widgets by tag
   - Search examples
   - Compare tool vs widget examples
4. **Validation**: Ensure widget data matches tool output schema

## Summary

The Widget Examples system bridges the gap between frontend and backend development, enabling true parallel development while maintaining type safety and example consistency. By defining examples at both the widget and tool level, teams can work independently while maintaining a single source of truth for data structures.

Key points:
- Frontend defines examples in widget files
- Backend can use widget examples or override with tool examples
- Studio displays both, with smart fallback logic
- No build step changes required (for now, manual manifest)
- Works seamlessly with existing NitroStack architecture

