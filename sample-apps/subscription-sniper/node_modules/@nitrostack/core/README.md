# @nitrostack/core

TypeScript framework for building production-ready MCP servers with decorators,
dependency injection, validation, auth, and middleware pipelines.

[![npm version](https://img.shields.io/npm/v/@nitrostack/core?style=flat-square)](https://www.npmjs.com/package/@nitrostack/core)
[![npm downloads](https://img.shields.io/npm/dm/@nitrostack/core?style=flat-square)](https://www.npmjs.com/package/@nitrostack/core)
[![license](https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square)](https://opensource.org/licenses/Apache-2.0)

## Installation

```bash
npm install @nitrostack/core zod reflect-metadata
```

## Why `@nitrostack/core`

- Decorator-first authoring for tools, resources, and prompts
- Built-in DI container with module architecture
- Auth primitives for API key, JWT, and OAuth 2.1 flows
- Middleware-style request lifecycle (guards, pipes, interceptors)
- Strong runtime validation with Zod-based schemas

## Quick Example

```typescript
import { McpApp, Module, ToolDecorator as Tool, z } from '@nitrostack/core';

export class MathTools {
  @Tool({
    name: 'add_numbers',
    description: 'Add two numbers',
    inputSchema: z.object({
      a: z.number(),
      b: z.number(),
    }),
  })
  async add(input: { a: number; b: number }) {
    return { result: input.a + input.b };
  }
}

@McpApp({
  server: { name: 'math-server', version: '1.0.0' },
})
@Module({
  name: 'app',
  controllers: [MathTools],
})
export class AppModule {}
```

## NitroStudio

Use NitroStudio to test tools visually, inspect payloads, and validate behavior
while developing your MCP server.

- Download: <https://nitrostack.ai/studio>
- Studio: <https://nitrostack.ai/studio>

## Links

- Docs: <https://docs.nitrostack.ai>
- SDK guide: <https://docs.nitrostack.ai/sdk/typescript/server>
- Source: <https://github.com/nitrocloudofficial/nitrostack>
- npm: <https://www.npmjs.com/package/@nitrostack/core>
- Blog: <https://blog.nitrostack.ai>

## Community

- Discord: <https://discord.gg/uVWey6UhuD>
- X: <https://x.com/nitrostackai>
- YouTube: <https://www.youtube.com/@nitrostackai>
- LinkedIn: <https://linkedin.com/company/nitrostack-ai/>
- GitHub: <https://github.com/nitrostackai>
