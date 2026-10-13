# Widget Manifest & UI Testing

Learn how to use the Widget Manifest system for independent frontend development and UI testing without needing a running backend.

## 📋 Table of Contents

- [Overview](#overview)
- [What is a Widget Manifest?](#what-is-a-widget-manifest)
- [Why Use Widget Manifests?](#why-use-widget-manifests)
- [Manifest Structure](#manifest-structure)
- [Creating a Widget Manifest](#creating-a-widget-manifest)
- [Viewing Widgets in Studio](#viewing-widgets-in-studio)
- [Example Workflow](#example-workflow)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The Widget Manifest system enables **independent frontend development** by providing example data for UI widgets. Frontend developers can preview and test widgets in Studio's Resources tab without needing a live backend or tool execution.

## What is a Widget Manifest?

A Widget Manifest is a JSON file (`widget-manifest.json`) that:
- **Lists all UI widgets** in your project
- **Provides example data** for each widget
- **Includes metadata** like names, descriptions, and tags
- **Enables live previews** in NitroStack Studio

It's located at: `src/widgets/widget-manifest.json`

## Why Use Widget Manifests?

### For Frontend Developers

**Work Independently** - Develop UI without waiting for backend  
**Instant Previews** - See widgets render with realistic data  
**Multiple Examples** - Test different UI states  
**No API Needed** - Preview without running the MCP server  

### For Teams

**Parallel Development** - Frontend and backend teams work simultaneously  
**Better Communication** - Shared understanding of data structures  
**Faster Iteration** - Quick UI feedback loop  
**Documentation** - Self-documenting widget examples  

## Manifest Structure

### Basic Format

```json
{
  "version": "1.0.0",
  "widgets": [
    {
      "uri": "/widget-name",
      "name": "Display Name",
      "description": "What this widget does",
      "examples": [
        {
          "name": "Example Name",
          "description": "Example description",
          "data": {
            "field1": "value1",
            "field2": "value2"
          }
        }
      ],
      "tags": ["category", "type"]
    }
  ],
  "generatedAt": "2025-01-24T00:00:00.000Z"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | Yes | Manifest version (e.g., "1.0.0") |
| `widgets` | array | Yes | Array of widget definitions |
| `generatedAt` | string | No | ISO timestamp of generation |

### Widget Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uri` | string | Yes | Widget route (e.g., "/product-card") |
| `name` | string | Yes | Display name for Studio |
| `description` | string | Yes | What the widget displays |
| `examples` | array | Yes | Array of example data objects |
| `tags` | array | No | Categorization tags |

### Example Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Example name (shown in dropdown) |
| `description` | string | No | Example description |
| `data` | object | Yes | The actual data passed to widget |

## Creating a Widget Manifest

### Step 1: Extract Tool Examples

Look at your tool definitions and extract the example responses:

```typescript
// auth.tools.ts
@Tool({
  name: 'login',
  examples: {
    request: { email: 'user@example.com', password: 'pass123' },
    response: {
      message: 'Login successful!',
      token: 'jwt_token_here',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'John Doe'
      }
    }
  }
})
@Widget('login-result')
async login(input: any) { ... }
```

### Step 2: Create Widget Entry

Use the `response` from examples as the `data` field:

```json
{
  "uri": "/login-result",
  "name": "Login Result",
  "description": "Displays login success with user info and JWT token",
  "examples": [
    {
      "name": "Successful Login",
      "description": "Login for John Doe",
      "data": {
        "message": "Login successful!",
        "token": "jwt_token_here",
        "user": {
          "id": "user-1",
          "email": "user@example.com",
          "name": "John Doe"
        }
      }
    }
  ],
  "tags": ["auth", "login"]
}
```

### Step 3: Add Multiple Examples (Optional)

Provide different UI states:

```json
{
  "uri": "/product-card",
  "name": "Product Card",
  "description": "Displays product details",
  "examples": [
    {
      "name": "In Stock Product",
      "description": "Product with high stock",
      "data": {
        "product": { "name": "Laptop", "price": 999, "stock": 50 },
        "availability": "In Stock"
      }
    },
    {
      "name": "Low Stock Product",
      "description": "Product with low stock",
      "data": {
        "product": { "name": "Laptop", "price": 999, "stock": 2 },
        "availability": "In Stock",
        "stockMessage": "Only 2 left!"
      }
    },
    {
      "name": "Out of Stock",
      "description": "Unavailable product",
      "data": {
        "product": { "name": "Laptop", "price": 999, "stock": 0 },
        "availability": "Out of Stock"
      }
    }
  ],
  "tags": ["products", "details"]
}
```

### Step 4: Save the Manifest

Place the file at: `src/widgets/widget-manifest.json`

## Viewing Widgets in Studio

### Accessing UI Widgets

1. **Start your project:**
   ```bash
   npm run dev
   ```

2. **Open Studio:** http://localhost:3000

3. **Navigate to Resources tab**

4. **See "UI Widgets" section** at the top

### UI Widgets Section Features

```
┌─────────────────────────────────────┐
│ 🎨 UI Widgets (16)                  │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🔐 Login Result                 │ │
│ │ 1 example                       │ │
│ ├─────────────────────────────────┤ │
│ │ Displays login success...       │ │
│ │ /login-result                   │ │
│ │ #auth #login                    │ │ ← Tags
│ ├─────────────────────────────────┤ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ ✨ Successful Login          │ │ │ ← Example Name
│ │ │                             │ │ │
│ │ │  [Widget Preview]           │ │ │ ← Live Preview
│ │ │                             │ │ │
│ │ └─────────────────────────────┘ │ │
│ ├─────────────────────────────────┤ │
│ │ [Select Example ▼]              │ │ ← Example Selector
│ │ [⛶ Enlarge]                     │ │ ← Enlarge Button
│ └─────────────────────────────────┘ │
│                                     │
│ ... (more widgets)                  │
│                                     │
└─────────────────────────────────────┘
```

### Interactive Features

- **Example Selector:** Switch between different examples
- **Live Preview:** Widget renders with selected example data
- **Enlarge Button:** Open full-screen modal view
- **Search:** Filter widgets by name or description

## Example Workflow

### Scenario: Adding a New Widget

Let's add a "User Profile" widget to an e-commerce app.

#### 1. Create the Widget Component

```tsx
// src/widgets/app/user-profile/page.tsx
'use client';

export default function UserProfile({ data }: { data: any }) {
  return (
    <div className="p-6 bg-white rounded-lg">
      <img 
        src={data.user.avatar} 
        alt={data.user.name}
        className="w-24 h-24 rounded-full"
      />
      <h2 className="text-2xl font-bold mt-4">{data.user.name}</h2>
      <p className="text-gray-600">{data.user.email}</p>
      <div className="mt-4">
        <p>Member since: {data.user.memberSince}</p>
        <p>Orders: {data.stats.totalOrders}</p>
      </div>
    </div>
  );
}
```

#### 2. Define the Tool with Example

```typescript
// src/modules/users/users.tools.ts
@Tool({
  name: 'get_user_profile',
  description: 'Get user profile information',
  inputSchema: z.object({}),
  examples: {
    request: {},
    response: {
      user: {
        id: 'user-1',
        name: 'Emily Johnson',
        email: 'emily@example.com',
        avatar: 'https://example.com/avatar.jpg',
        memberSince: '2024-01-01'
      },
      stats: {
        totalOrders: 15,
        totalSpent: 1234.56
      }
    }
  }
})
@Widget('user-profile')
async getUserProfile(input: any, ctx: ExecutionContext) {
  // Tool implementation...
}
```

#### 3. Add to Widget Manifest

```json
{
  "uri": "/user-profile",
  "name": "User Profile",
  "description": "Displays user profile with stats",
  "examples": [
    {
      "name": "Emily's Profile",
      "description": "Profile for Emily Johnson",
      "data": {
        "user": {
          "id": "user-1",
          "name": "Emily Johnson",
          "email": "emily@example.com",
          "avatar": "https://example.com/avatar.jpg",
          "memberSince": "2024-01-01"
        },
        "stats": {
          "totalOrders": 15,
          "totalSpent": 1234.56
        }
      }
    },
    {
      "name": "New User Profile",
      "description": "Profile for a new user",
      "data": {
        "user": {
          "id": "user-2",
          "name": "John Doe",
          "email": "john@example.com",
          "avatar": "https://example.com/avatar2.jpg",
          "memberSince": "2025-01-20"
        },
        "stats": {
          "totalOrders": 0,
          "totalSpent": 0
        }
      }
    }
  ],
  "tags": ["users", "profile"]
}
```

#### 4. Preview in Studio

1. **Restart dev server (rebuilds):** `npm run dev`
2. **Open Studio → Resources tab**
3. **Find "User Profile" in UI Widgets section**
5. **Switch between examples using dropdown**
6. **Click Enlarge for full view**

#### 5. Iterate on UI

Now you can:
- Adjust styles in `user-profile/page.tsx`
- See changes instantly with hot reload
- Test with different example data
- No backend needed!

## Best Practices

### Data Quality

**Use Realistic Data**
```json
{
  "data": {
    "product": {
      "name": "Wireless Bluetooth Headphones",
      "price": 79.99,
      "image_url": "https://cdn.example.com/headphones.jpg"
    }
  }
}
```

**Don't Use Placeholder Data**
```json
{
  "data": {
    "product": {
      "name": "Product Name",
      "price": 0,
      "image_url": "image.jpg"
    }
  }
}
```

### Example Naming

**Descriptive Names**
- "In Stock Product"
- "Low Stock Warning"
- "Out of Stock"

**Generic Names**
- "Example 1"
- "Test"
- "Data"

### Data Consistency

**Match Tool Output Structure**
```typescript
// Tool returns this:
return {
  items: [...],
  total: 123.45,
  itemCount: 3
};

// Manifest should have:
{
  "data": {
    "items": [...],
    "total": 123.45,
    "itemCount": 3
  }
}
```

### Multiple Examples

Provide examples for different UI states:
- Empty states (no data)
- Loading states (if applicable)
- Error states (if applicable)
- Success states (normal operation)
- Edge cases (very long text, many items, etc.)

### Tags

Use consistent, lowercase tags:
```json
{
  "tags": ["auth", "login", "user"]
}
```

Common tag categories:
- **Module:** `auth`, `products`, `cart`, `orders`
- **Type:** `list`, `details`, `form`, `confirmation`
- **Action:** `create`, `update`, `delete`, `view`

## Troubleshooting

### Widgets Not Appearing in Studio

**Problem:** Resources tab doesn't show UI Widgets section

**Solutions:**
1. Check manifest exists at `src/widgets/widget-manifest.json`
2. Verify JSON is valid (no syntax errors)
3. Rebuild the project: `npm run build`
4. Restart dev server: `npm run dev`

### Widget Preview Not Loading

**Problem:** Preview shows "No widget URI available"

**Solutions:**
1. Check `uri` field matches your widget folder name
2. Verify widget component exists at `src/widgets/app{uri}/page.tsx`
3. Check `uri` starts with `/` (e.g., `/product-card`)

### Wrong Data Displayed

**Problem:** Widget shows incorrect or malformed data

**Solutions:**
1. Compare manifest `data` structure with tool's example `response`
2. Check for typos in field names
3. Ensure nested objects match exactly
4. Verify data types (string vs number)

### Example Selector Not Working

**Problem:** Dropdown doesn't update preview

**Solutions:**
1. Check multiple examples exist in widget definition
2. Ensure each example has unique `name`
3. Clear browser cache and reload
4. Check browser console for errors

### Enlarge Button Not Working

**Problem:** Modal doesn't open or opens delayed

**Solutions:**
1. Verify `EnlargeModal` is in root layout
2. Check Zustand store is properly configured
3. Try clicking once and waiting a moment
4. Check browser console for errors

## Advanced Features

### Dynamic Example Generation

For large datasets, you can generate examples programmatically:

```javascript
// generate-manifest.js
const products = require('./data/products.json');

const manifest = {
  version: "1.0.0",
  widgets: [
    {
      uri: "/products-grid",
      name: "Products Grid",
      description: "Browse products",
      examples: [
        {
          name: "Electronics",
          data: {
            products: products.filter(p => p.category === 'Electronics').slice(0, 10)
          }
        },
        {
          name: "Clothing",
          data: {
            products: products.filter(p => p.category === 'Clothing').slice(0, 10)
          }
        }
      ],
      tags: ["products", "grid"]
    }
  ]
};

require('fs').writeFileSync(
  'src/widgets/widget-manifest.json',
  JSON.stringify(manifest, null, 2)
);
```

Run: `node generate-manifest.js`

### TypeScript Type Safety

Define types for your manifest:

```typescript
// widget-manifest.d.ts
export interface WidgetExample {
  name: string;
  description?: string;
  data: Record<string, any>;
}

export interface WidgetMetadata {
  uri: string;
  name: string;
  description: string;
  examples: WidgetExample[];
  tags?: string[];
}

export interface WidgetManifest {
  version: string;
  widgets: WidgetMetadata[];
  generatedAt?: string;
}
```

Use with `defineWidgetMetadata` helper (available in SDK):

```typescript
import { defineWidgetMetadata } from '@nitrostack/widgets';

const widget = defineWidgetMetadata({
  uri: '/product-card',
  name: 'Product Card',
  description: 'Display product details',
  examples: [{ name: 'Example', data: {} }],
  tags: ['products']
});
```

## Next Steps

- **Learn More:** Check out the [UI Widgets Guide](./sdk/typescript/16-ui-widgets-guide.md)
- **See Templates:** Explore `docs/templates/03-pizzaz-template.md` for a complete widget-focused example
- **Join Community:** Share your widgets and get help

---

**Need Help?** If you encounter issues not covered here, please open an issue on GitHub or join our community Discord.

