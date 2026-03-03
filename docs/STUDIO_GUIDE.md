# NitroStack Studio Guide

## What is Studio?

NitroStack Studio is a **Next.js-based visual testing environment** for your MCP servers. It replaces the old inspector with a modern, feature-rich development experience.

## Features

### AI Chat Integration

Test your tools naturally by chatting with AI:

- **OpenAI GPT-4** - Industry standard, excellent tool calling
- **Gemini 2.0 Flash Exp** - Free experimental, 1M token context
- Automatic tool execution
- Widget rendering in chat
- Multi-turn conversations

### Widget Preview

- Live widget rendering
- Enlarge modal for detailed view
- Test with example data
- Hot reload support

### Tool Testing

- Execute tools manually
- Dynamic form generation from schemas
- Input validation
- Response visualization
- Widget rendering with results

### Resource Browser

- View all available resources
- Execute resource handlers
- Preview resource data
- Widget rendering for UI resources

### Beautiful UI

- Dark/light theme toggle
- Black & gold brand colors
- Modern, responsive design
- Smooth transitions

## Getting Started

### 1. Start Studio

```bash
cd your-project
nitrostack-cli dev
```

Studio automatically opens at `http://localhost:3000`

### 2. Configure AI Provider

#### OpenAI Setup

1. Click the settings icon (⚙️)
2. Select **OpenAI** as provider
3. Enter your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
4. Key is stored in browser's `localStorage`

#### Gemini Setup

1. Click the settings icon (⚙️)
2. Select **Gemini** as provider  
3. Enter your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
4. Key is stored in browser's `localStorage`

### 3. Test with Chat

Go to the **Chat** tab and try:

```
Show me the product categories
```

The AI will:
1. Recognize this requires the `get_categories` tool
2. Call the tool automatically
3. Display the response
4. Render the associated widget

### 4. Manual Tool Testing

1. Go to **Tools** tab
2. Find a tool (e.g., "Get Product Details")
3. Click **Execute**
4. Fill in the form:
   - `product_id`: `prod-1`
5. Click **Submit**
6. See response + widget preview

### 5. View Resources

1. Go to **Resources** tab
2. Browse available resources
3. Click **Execute** to fetch data
4. Preview resource content
5. See widget if available

## Architecture

### Studio Stack

```
┌─────────────────────────────────┐
│      Next.js Studio (3000)      │
│   - Chat interface              │
│   - Tool testing                │
│   - Resource browser            │
└────────────┬────────────────────┘
             │
             ├─── MCP Client (stdio) ───┐
             │                           │
             │                      ┌────▼────┐
             │                      │   MCP   │
             │                      │  Server │
             │                      └────┬────┘
             │                           │
             ├─── Widget Proxy ──────────┤
             │                           │
        ┌────▼────┐                 ┌───▼────┐
        │ Widgets │                 │Database│
        │  (3001) │                 └────────┘
        └─────────┘
```

### Communication Flow

1. **Studio → MCP Server**: stdio transport
2. **Studio → Widgets**: Next.js middleware proxy
3. **Widgets → Data**: postMessage or `window.openai.toolOutput`

## AI Chat Integration

### Message Flow

```typescript
User: "Show me products in Electronics"
  ↓
Studio sends to OpenAI/Gemini with tool definitions
  ↓
AI decides to call: browse_products({ category: "Electronics" })
  ↓
Studio executes tool via MCP server
  ↓
Tool returns: { products: [...], pagination: {...} }
  ↓
Widget renders with data
  ↓
AI responds: "Here are the electronics products..." + Widget
```

### Supported Features

- Function/tool calling
- Multi-turn conversations
- Widget rendering in chat
- Error handling
- Streaming (coming soon)

### OpenAI Configuration

Model: `gpt-4-turbo-preview`

Features:
- Excellent tool calling accuracy
- 128K context window
- Fast response times
- Reliable function execution

### Gemini Configuration

Model: `gemini-2.0-flash-exp`

Features:
- Free during experimental phase
- 1M token context window
- Very fast responses
- Advanced function calling

## Widget Integration

### How Widgets Work

1. **Tool Execution**:
   ```typescript
   @Tool({ name: 'get_product' })
   @Widget('product-card')
   async getProduct(input: any) {
     return { id: '1', name: 'Product', price: 99.99 };
   }
   ```

2. **Studio Detects Widget**:
   - Checks `tool.widget.route`
   - Checks `tool.outputTemplate`
   - Uses example data if available

3. **Widget Renders**:
   ```tsx
   // Receives data via postMessage or window.openai.toolOutput
   function ProductCard({ data }) {
     return <div>{data.name}: ${data.price}</div>;
   }
   ```

### Development Mode

In dev mode (`nitrostack-cli dev`):
- Widgets run on `http://localhost:3001`
- Studio proxies requests via Next.js middleware
- Hot reload enabled
- React Fast Refresh works

### Production Mode

After build:
- Widgets are static HTML/CSS/JS
- Served from `widgets/out/` directory
- No server required
- Can be hosted on CDN

## Tool Testing

### Dynamic Form Generation

Studio automatically generates forms based on your Zod schemas:

```typescript
inputSchema: z.object({
  name: z.string().describe('User name'),
  age: z.number().optional().describe('User age'),
  role: z.enum(['admin', 'user']).describe('User role')
})
```

Generates:
- Text input for `name`
- Number input for `age`
- Select dropdown for `role`
- Displays descriptions as labels

### Execute Modal

When you click **Execute**:
1. Modal opens
2. Form fields auto-generated
3. Fill in values
4. Click **Submit**
5. See response
6. Widget renders if available

### Example Data

Tools can include example data:

```typescript
@Tool({
  name: 'get_product',
  examples: {
    request: { product_id: 'prod-1' },
    response: {
      id: 'prod-1',
      name: 'Awesome Product',
      price: 99.99
    }
  }
})
```

This enables:
- Widget preview without execution
- "Try Example" button
- Better documentation

## Troubleshooting

### Studio Not Connecting

**Symptoms**: "Not connected" error in Studio

**Solutions**:
```bash
# 1. Check MCP server is running
ps aux | grep node

# 2. Restart dev mode
nitrostack-cli dev

# 3. Check logs
tail -f logs/server.log
```

### Widgets Not Loading

**Symptoms**: 500 errors when loading widgets

**Solutions**:
```bash
# 1. Ensure widget dev server is running
curl http://localhost:3001

# 2. Check widget exists
# 2. Check src/widgets/app/ has widgets
ls src/widgets/app/

# 3. Restart dev mode (rebuilds everything)
npm run dev
```

### AI Not Calling Tools

**Symptoms**: AI responds but doesn't use tools

**Solutions**:
1. Check tool descriptions are clear
2. Verify inputSchema is valid
3. Test tool manually first
4. Check API key is valid
5. Review console for errors

### Theme Not Persisting

**Symptoms**: Theme resets on page reload

**Solutions**:
```javascript
// Check localStorage
localStorage.getItem('theme')

// Clear and reset
localStorage.removeItem('theme')
// Reload page, toggle theme again
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open search (coming soon) |
| `Ctrl/Cmd + /` | Toggle theme |
| `Esc` | Close modal |

## API Endpoints

Studio exposes these internal APIs:

### `/api/init`

Initialize MCP client connection

**POST**
```json
{ "projectPath": "/path/to/project" }
```

### `/api/tools`

List all available tools

**GET**
```json
{
  "tools": [
    {
      "name": "get_product",
      "description": "...",
      "inputSchema": {...},
      "widget": { "route": "product-card" }
    }
  ]
}
```

### `/api/tools/execute`

Execute a specific tool

**POST**
```json
{
  "name": "get_product",
  "arguments": { "product_id": "prod-1" }
}
```

### `/api/chat`

Chat with AI

**POST**
```json
{
  "provider": "openai",
  "messages": [...],
  "apiKey": "sk-..."
}
```

### `/api/resources`

List all resources

**GET**

### `/api/prompts`

List all prompts

**GET**

## Configuration

### Environment Variables

```bash
# .env in project root
STUDIO_PORT=3000
WIDGET_PORT=3001
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

### Custom Port

```bash
nitrostack-cli dev --port 8080
# Studio: http://localhost:8080
# Widgets: http://localhost:8081
```

## Best Practices

### 1. Clear Tool Descriptions

```typescript
// Good
@Tool({
  name: 'search_products',
  description: 'Search products by name, category, or price range'
})

// Bad
@Tool({
  name: 'search_products',
  description: 'Search'
})
```

### 2. Provide Examples

```typescript
@Tool({
  name: 'get_product',
  examples: {
    request: { id: 'prod-1' },
    response: { id: 'prod-1', name: 'Product', price: 99.99 }
  }
})
```

### 3. Use Descriptive Zod Schemas

```typescript
inputSchema: z.object({
  query: z.string().describe('Search query (name, SKU, or keywords)'),
  minPrice: z.number().optional().describe('Minimum price filter'),
  maxPrice: z.number().optional().describe('Maximum price filter')
})
```

### 4. Test Tools Manually First

Before testing with AI:
1. Execute tool manually
2. Verify response format
3. Check widget renders correctly
4. Then try AI chat

### 5. Use Type Generation

```bash
nitrostack-cli generate types
```

Ensures type safety between tools and widgets.

## Advanced Features

### Custom LLM Provider

Coming soon: Support for custom LLM endpoints

### Streaming Responses

Coming soon: Real-time token streaming

### Tool Composition

Coming soon: Test multiple tools in sequence

### Request History

Coming soon: Save and replay requests

## Updates & Roadmap

### v3.0 (Current)

- Next.js-based architecture
- OpenAI GPT-4 integration
- Gemini 2.0 Flash integration
- Dark/light theme
- Widget preview
- Dynamic forms

### v3.1 (Planned)

- ⏳ Streaming responses
- ⏳ Request history
- ⏳ Tool composition
- ⏳ Custom LLM providers
- ⏳ Keyboard shortcuts
- ⏳ Search functionality

## Getting Help

- 📖 [Full Documentation](../README.md)
- 💬 [GitHub Discussions](https://github.com/yourusername/nitrostack/discussions)
- 🐛 [Report Issues](https://github.com/yourusername/nitrostack/issues)

---

For additional assistance, refer to the troubleshooting documentation.

