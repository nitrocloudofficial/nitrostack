# Starter Template

## Overview

The Starter Template is a minimal NitroStack project designed for learning core concepts. It features a simple calculator with one module, demonstrating tools, resources, prompts, and widgets without authentication or database complexity.

## What's Included

- **Calculator Module** - Single feature module with all NitroStack primitives
- **Tools** - `calculate` tool for arithmetic operations (add, subtract, multiply, divide)
- **Resources** - `calculator://operations` listing available operations
- **Prompts** - `calculator_help` for usage instructions
- **Widgets** - Two Next.js widgets for results and operations display
- **No Authentication** - Focus on learning without auth complexity
- **No Database** - Pure computation example

## Quick Start

### Create Project

```bash
npx @nitrostack/cli init my-calculator --template typescript-starter
cd my-calculator
npm run dev
```

The CLI automatically installs dependencies, builds widgets, and starts:
- MCP Server (STDIO + HTTP on port 3002)
- Studio on http://localhost:3000
- Widget Dev Server on http://localhost:3001

### Project Structure

```
src/
├── modules/
│   └── calculator/
│       ├── calculator.module.ts       # Module definition
│       ├── calculator.tools.ts        # Tool with @Tool decorator
│       ├── calculator.resources.ts    # Resource endpoint
│       └── calculator.prompts.ts      # Prompt template
├── widgets/
│   └── app/
│       ├── calculator-result/         # Result widget
│       └── calculator-operations/     # Operations list widget
├── app.module.ts                      # Root module
└── index.ts                           # Bootstrap
```

## Features

### Calculate Tool

Performs basic arithmetic with input validation:

```typescript
@Tool({
  name: 'calculate',
  description: 'Perform basic arithmetic calculations',
  inputSchema: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number()
  }),
  examples: {
    request: { operation: 'add', a: 5, b: 3 },
    response: { result: 8, expression: '5 + 3 = 8' }
  }
})
@Widget('calculator-result')
async calculate(input: any, ctx: ExecutionContext) {
  // Implementation
}
```

### Calculator Resource

Lists all available operations with examples:

```typescript
@Resource({
  uri: 'calculator://operations',
  name: 'Calculator Operations',
  mimeType: 'application/json'
})
@Widget('calculator-operations')
async getOperations(uri: string, ctx: ExecutionContext) {
  return { contents: [/* operations */] };
}
```

### Help Prompt

Provides usage instructions:

```typescript
@Prompt({
  name: 'calculator_help',
  arguments: [/* args */]
})
async getHelp(args: any, ctx: ExecutionContext) {
  return { messages: [/* help messages */] };
}
```

## Widgets

### Calculator Result Widget
- Gradient background with operation icon
- Number breakdown display
- Smooth animations
- Theme-aware styling

### Calculator Operations Widget
- Grid layout of all operations
- Color-coded by operation type
- Example usage for each operation

## Learning Path

This template teaches:

1. **Module Organization** - Feature module structure
2. **Tool Creation** - Using @Tool decorator with validation
3. **Resources** - Exposing data endpoints
4. **Prompts** - Creating conversation templates
5. **Widgets** - Building UI components
6. **Examples** - Providing request/response examples
7. **Validation** - Using Zod schemas

## Example Usage

### Basic Calculation
```
User: "What's 12 times 8?"
AI: Calls calculate(operation="multiply", a=12, b=8)
Result: Widget showing "12 × 8 = 96"
```

### Get Help
```
User: "How do I use the calculator?"
AI: Uses calculator_help prompt
Result: Complete usage instructions
```

### List Operations
```
User: "What operations are available?"
AI: Fetches calculator://operations resource
Result: Widget showing all 4 operations
```

## Extending the Template

### Add More Operations

Edit `calculator.tools.ts` to add new operations to the enum and implementation.

### Add History Feature

1. Create a service to store calculations
2. Add a `get_history` tool
3. Create a history widget

### Add More Modules

```bash
npx @nitrostack/cli generate module converter
```

## Commands

```bash
npm run dev              # Start dev server with Studio
npm run build            # Build for production
npm start                # Run production server
npm run widget <command> # Run command in widgets directory
```

## Next Steps

- [OAuth Template](./02-oauth-template.md) - Authentication patterns
- [Pizzaz Template](./03-pizzaz-template.md) - Advanced widget features
- [Quick Start Guide](../getting-started/02-quick-start.md) - Build your first server
- [Server Concepts](../sdk/typescript/03-server-concepts.md) - Module architecture
- [Tools Guide](../sdk/typescript/04-tools-guide.md) - Advanced patterns
- [UI Widgets Guide](../sdk/typescript/16-ui-widgets-guide.md) - UI development

## Use Cases

Perfect starting point for:
- Unit converters (temperature, currency)
- Text tools (string manipulation, formatting)
- Data processors (JSON, CSV, XML parsing)
- Simple APIs (weather, jokes, facts)
- Utilities (date/time, UUID generation)
