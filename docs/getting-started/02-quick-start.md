# Quick Start Guide

This guide walks you through creating your first NitroStack MCP server. By the end, you will have a working server with tools, resources, and a visual widget.

## Prerequisites

- **Node.js 20.18.1** (recommended) - Use [NVM (Node Version Manager)](https://www.nvmnode.com/guide/download.html) to install and manage Node.js versions
- npm 9 or higher
- **tsx** - Install globally: `npm i tsx -g`

## Step 1: Install NitroStudio (Optional)

NitroStudio is a desktop application for testing and debugging MCP servers. Download it from [nitrostack.ai/studio](https://nitrostack.ai/studio).

While optional, NitroStudio significantly improves the development experience by providing:
- Real-time tool testing
- AI chat integration
- Widget preview
- Request/response inspection

## Step 2: Create Your Project

Use the NitroStack CLI to scaffold a new project:

```bash
npx @nitrostack/cli init my-server
```

This creates a complete project structure with:
- Sample tools, resources, and prompts
- Widget components (Next.js)
- TypeScript configuration
- Development scripts

Navigate to your project directory:

```bash
cd my-server
```

## Step 3: Open Project in NitroStudio

Open your project folder in NitroStudio to connect automatically. NitroStudio will start the development server and provide a visual interface for testing your MCP server.

If you prefer running the server manually, you can still use:

```bash
npm run dev
```

## Project Structure

```
my-server/
├── src/
│   ├── index.ts              # Application entry point
│   ├── app.module.ts         # Root module configuration
│   └── modules/
│       └── calculator/       # Sample feature module
│           ├── calculator.module.ts
│           ├── calculator.tools.ts
│           ├── calculator.resources.ts
│           └── calculator.prompts.ts
├── src/widgets/              # Next.js widget components
│   └── app/
│       └── calculator-result/
│           └── page.tsx
├── package.json
├── tsconfig.json
└── .env
```

## Understanding the Code

### Entry Point

The entry point bootstraps the application:

```typescript
// src/index.ts
import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap();
```

### Root Module

The root module configures the application and imports feature modules:

```typescript
// src/app.module.ts
import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { CalculatorModule } from './modules/calculator/calculator.module.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'calculator-server',
    version: '1.0.0'
  }
})
@Module({
  imports: [
    ConfigModule.forRoot(),
    CalculatorModule
  ]
})
export class AppModule {}
```

### Tool Definition

Tools are functions that AI models can invoke:

```typescript
// src/modules/calculator/calculator.tools.ts
import { ToolDecorator as Tool, Widget, z, ExecutionContext } from '@nitrostack/core';

export class CalculatorTools {
  @Tool({
    name: 'calculate',
    description: 'Perform arithmetic calculations on two numbers',
    inputSchema: z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'divide'])
        .describe('The arithmetic operation to perform'),
      a: z.number().describe('First operand'),
      b: z.number().describe('Second operand')
    })
  })
  @Widget('calculator-result')
  async calculate(
    input: { operation: string; a: number; b: number },
    ctx: ExecutionContext
  ) {
    const operations: Record<string, number> = {
      add: input.a + input.b,
      subtract: input.a - input.b,
      multiply: input.a * input.b,
      divide: input.a / input.b
    };

    const result = operations[input.operation];

    return {
      result,
      expression: `${input.a} ${input.operation} ${input.b} = ${result}`
    };
  }
}
```

### Widget Component

Widgets provide visual representations of tool outputs:

```tsx
// src/widgets/app/calculator-result/page.tsx
'use client';
import { useWidgetSDK } from '@nitrostack/widgets';

export default function CalculatorResult() {
  const { isReady, getToolOutput } = useWidgetSDK();

  if (!isReady) {
    return <div className="p-4">Loading...</div>;
  }

  const data = getToolOutput();

  return (
    <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white text-center">
      <h2 className="text-4xl font-bold">{data.result}</h2>
      <p className="text-lg opacity-90">{data.expression}</p>
    </div>
  );
}
```

## Common Commands

```bash
# Development
npm run dev              # Start development server with hot reload

# Building
npm run build            # Build for production
npm start                # Run production server

# CLI Commands
nitrostack-cli dev       # Alternative: run dev server directly
nitrostack-cli build     # Build with CLI
nitrostack-cli generate types  # Generate TypeScript types for widgets
```

## Adding Your First Tool

Create a new tool in an existing module or create a new module:

```typescript
// src/modules/calculator/calculator.tools.ts
@Tool({
  name: 'format_number',
  description: 'Format a number with specified decimal places and locale',
  inputSchema: z.object({
    value: z.number().describe('The number to format'),
    decimals: z.number().int().min(0).max(10).default(2)
      .describe('Number of decimal places'),
    locale: z.string().default('en-US')
      .describe('Locale for formatting')
  })
})
async formatNumber(
  input: { value: number; decimals: number; locale: string },
  ctx: ExecutionContext
) {
  const formatted = new Intl.NumberFormat(input.locale, {
    minimumFractionDigits: input.decimals,
    maximumFractionDigits: input.decimals
  }).format(input.value);

  return {
    original: input.value,
    formatted,
    locale: input.locale
  };
}
```

## Troubleshooting

### Port Already in Use

If the default port is in use, specify an alternative:

```bash
nitrostack-cli dev --port 3002
```

### Widget Not Loading

1. Verify the widget server is running at `http://localhost:3001`
2. Ensure the widget route matches the `@Widget('name')` decorator
3. Check browser console for errors

### TypeScript Compilation Errors

```bash
npm install
npm run build
```

### Module Not Found

Ensure all imports use the `.js` extension for ESM compatibility:

```typescript
// Correct
import { UserService } from './user.service.js';

// Incorrect
import { UserService } from './user.service';
```

## Next Steps

- [Server Concepts](../sdk/typescript/03-server-concepts.md) - Learn about modules, DI, and architecture
- [Tools Guide](../sdk/typescript/04-tools-guide.md) - Deep dive into tool creation
- [UI Widgets Guide](../sdk/typescript/16-ui-widgets-guide.md) - Build custom visual components
- [Authentication](../sdk/typescript/09-authentication-overview.md) - Secure your server
- [Deployment](../deployment/01-checklist.md) - Prepare for production
