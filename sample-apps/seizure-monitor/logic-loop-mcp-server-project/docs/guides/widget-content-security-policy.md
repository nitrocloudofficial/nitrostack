# Widget Content Security Policy (CSP)

Hosted widget UIs (for example in **ChatGPT Apps** or **MCP Apps**) run inside a **sandboxed iframe**. The host applies a strict **Content Security Policy**: only domains you declare are allowed for **`img-src`**, **`connect-src`**, **`frame-src`**, and related directives.

NitroStack lets you declare those allowlists from the **`@Widget`** decorator. The framework mirrors metadata into the places hosts and the MCP Apps spec expect:

- **Tool descriptor** — `_meta['openai/widgetCSP']` (snake_case: `resource_domains`, `connect_domains`, `frame_domains`) and a richer **`_meta.ui`** object (camelCase: `resourceUri`, optional `csp`, `domain`, `prefersBorder`).
- **Widget template resource** — `resources/read` returns HTML in `contents[]` and, when configured, **`contents[]._meta`** including **`_meta.ui.csp`** (MCP Apps style) and the same OpenAI passthrough keys.

This matches the patterns described in the [OpenAI Apps SDK — Build your MCP server](https://developers.openai.com/apps-sdk/build/mcp-server) documentation.

## Declaring CSP with `@Widget`

Use the **object** form of `@Widget` and supply a **`csp`** object (all keys optional):

| Key | Maps to (OpenAI) | Purpose |
|-----|------------------|---------|
| `resourceDomains` | `resource_domains` | Static assets: images, fonts, scripts loaded from URLs |
| `connectDomains` | `connect_domains` | **`fetch` / XHR** targets your widget calls |
| `frameDomains` | `frame_domains` | Origins you **embed as iframes** inside the widget (use sparingly; hosts may review strictly) |

Example: allow **Unsplash** images for shop photos:

```typescript
import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';

function myWidget(route: string) {
  return {
    route,
    prefersBorder: true,
    csp: {
      resourceDomains: ['https://images.unsplash.com'],
    },
  };
}

@Tool({ name: 'show_catalog', description: '...', inputSchema: z.object({}) })
@Widget(myWidget('catalog'))
async showCatalog(_input: unknown, _ctx: ExecutionContext) {
  return { items: [] };
}
```

## `domain` and `prefersBorder`

These are **not** CSP keys but are part of the same widget metadata surface:

- **`prefersBorder`** — boolean; maps to **`openai/widgetPrefersBorder`** (host may draw a border around the widget).
- **`domain`** — HTTPS origin string (for example `https://myapp.example.com`); maps to **`openai/widgetDomain`** via the component’s internal `subdomain` field. Required for some **ChatGPT** submission flows so the host can route the widget sandbox.

```typescript
@Widget({
  route: 'checkout',
  prefersBorder: true,
  domain: 'https://myapp.example.com',
  csp: {
    connectDomains: ['https://api.myapp.example.com'],
    resourceDomains: ['https://cdn.myapp.example.com'],
  },
})
```

## String vs object `@Widget`

Backward compatible:

```typescript
@Widget('product-card')
```

Object form — **`route` is required**; other fields are optional:

```typescript
@Widget({
  route: 'product-card',
  csp: { resourceDomains: ['https://cdn.example.com'] },
})
```

If you pass an object **without** a non-empty **`route`**, the decorator throws at class evaluation time.

## Where metadata appears

1. **`tools/list`** — each tool with a widget includes **`_meta.openai/widgetCSP`**, **`_meta.openai/widgetDomain`**, etc., when set, and **`_meta.ui`** with **`resourceUri`** plus optional **`csp`**, **`domain`**, **`prefersBorder`**.
2. **`resources/read`** on the widget’s **`ui://…`** (or component) URI — **`contents[]._meta`** includes **`ui.csp`** (camelCase) and OpenAI passthrough fields for clients that read CSP from the resource body.

## Practical tips

- List **exact origins** you use (`https://images.unsplash.com`, not just `https://unsplash.com`, unless your URLs match).
- If images are blocked in the host devtools, verify **`resourceDomains`** includes the image host and that you **restarted** the server after changing **`@Widget`**.
- **`frameDomains`** enables nested iframes; only enable when necessary and expect stricter app review.
- For full product semantics, follow host documentation (OpenAI MCP server guide, MCP Apps **`_meta.ui.csp`**).

## See also

- [UI Widgets Guide](../sdk/typescript/16-ui-widgets-guide.md) — `@Widget` and widget development
- [Decorators reference](../api-reference/decorators.md) — `@Widget` API
- [Streamable HTTP and legacy SSE](./streamable-http-and-legacy-sse.md)
