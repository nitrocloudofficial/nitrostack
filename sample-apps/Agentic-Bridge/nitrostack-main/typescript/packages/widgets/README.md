# @nitrostack/widgets

React SDK for building interactive widget UIs that render with NitroStack MCP
tool outputs.

[![npm version](https://img.shields.io/npm/v/@nitrostack/widgets?style=flat-square)](https://www.npmjs.com/package/@nitrostack/widgets)
[![npm downloads](https://img.shields.io/npm/dm/@nitrostack/widgets?style=flat-square)](https://www.npmjs.com/package/@nitrostack/widgets)
[![license](https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square)](https://opensource.org/licenses/Apache-2.0)

## Installation

```bash
npm install @nitrostack/widgets react react-dom
```

## What You Get

- `useWidgetSDK()` for data and host interaction
- Theme/display helpers for adaptive UI behavior
- State helpers for interactive widget flows
- Compatibility with NitroStudio widget previews

## Quick Example

```tsx
'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

export default function ProductCard() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<{ name: string; price: number }>();

  if (!isReady || !data) return <div>Loading...</div>;

  return (
    <div>
      <h3>{data.name}</h3>
      <p>${data.price}</p>
    </div>
  );
}
```

## NitroStudio

NitroStudio is the fastest way to test widget output and interaction behavior in
real MCP workflows.

- Download: <https://nitrostack.ai/studio>
- Widgets guide: <https://docs.nitrostack.ai/sdk/typescript/ui/widgets>

## Links

- Widgets docs: <https://docs.nitrostack.ai/sdk/typescript/ui/widgets>
- Full docs: <https://docs.nitrostack.ai>
- Source: <https://github.com/nitrocloudofficial/nitrostack>
- npm: <https://www.npmjs.com/package/@nitrostack/widgets>
- Blog: <https://blog.nitrostack.ai>

## Community

- Discord: <https://discord.gg/uVWey6UhuD>
- X: <https://x.com/nitrostackai>
- YouTube: <https://www.youtube.com/@nitrostackai>
- LinkedIn: <https://linkedin.com/company/nitrostack-ai/>
- GitHub: <https://github.com/nitrostackai>
