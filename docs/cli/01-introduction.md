# CLI Introduction

## Overview

The NitroStack CLI is a powerful command-line tool for creating, developing, and building MCP servers with v3.0's decorator-based architecture.

## Features

- **Quick Initialization** - Create new projects in seconds
- **Hot Reload** - Development mode with automatic reloading
- 🎨 **Studio Integration** - Visual testing environment
- 🔨 **Code Generation** - Generate modules, tools, types, and more
- 📦 **Production Builds** - Optimize for deployment
- 🎯 **Templates** - Pre-built templates (starter, oauth, pizzaz)

## Commands

| Command | Description |
|---------|-------------|
| `init` | Create a new NitroStack project |
| `dev` | Start development server with Studio |
| `build` | Build project for production |
| `generate` | Generate code (types, modules, tools, etc.) |

## Installation

### Global Installation

```bash
npm install -g @nitrostack/cli
```

Verify installation:

```bash
nitrostack-cli --version
```

### Using npx

No installation required:

```bash
npx @nitrostack/cli init my-project
```

## Quick Start

```bash
# Create a new project
nitrostack-cli init my-server --template typescript-starter

# Navigate to project
cd my-server

# Install dependencies
npm install

# Start development
nitrostack-cli dev
```

Studio opens at `http://localhost:3000` automatically!

## Command Reference

### nitrostack-cli init

Create a new NitroStack project.

```bash
nitrostack-cli init <project-name> [options]
```

**Options**:
- `--template <name>` - Template to use (`typescript-starter`, `typescript-oauth`, `typescript-pizzaz`)

**Example**:
```bash
nitrostack-cli init oauth-app --template typescript-oauth
```

### nitrostack-cli dev

Start development server with hot reload and Studio.

```bash
nitrostack-cli dev [options]
```

**Options**:
- `--port <number>` - Studio port (default: 3000)

**Example**:
```bash
nitrostack-cli dev --port 8080
```

### nitrostack-cli build

Build project for production.

```bash
nitrostack-cli build
```

Outputs to `dist/` directory.

### nitrostack-cli generate

Generate code from templates.

```bash
nitrostack-cli generate <type> [name] [options]
```

**Types**:
- `types` - Generate TypeScript types from tools
- `module` - Generate a new module
- `tool` - Generate a tool definition
- `resource` - Generate a resource definition
- `prompt` - Generate a prompt definition
- `guard` - Generate an authentication guard
- `middleware` - Generate middleware
- `interceptor` - Generate an interceptor
- `pipe` - Generate a pipe
- `filter` - Generate an exception filter
- `service` - Generate a service

**Examples**:
```bash
# Generate types
nitrostack-cli generate types

# Generate module
nitrostack-cli generate module payments

# Generate tool
nitrostack-cli generate tool create-payment --module payments

# Generate guard
nitrostack-cli generate guard admin
```

## Configuration

CLI behavior can be configured via:

1. **Command-line flags** - Highest priority
2. **Environment variables** - Medium priority
3. **Config file** - Lowest priority

### Environment Variables

```bash
# .env
NITROSTACK_PORT=3000
NITROSTACK_WIDGET_PORT=3001
```

### Config File

Create `nitrostack.config.js`:

```javascript
export default {
  dev: {
    port: 3000,
    widgetPort: 3001,
    openBrowser: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
};
```

## Development Workflow

1. **Initialize** - Create project with `init`
2. **Develop** - Use `dev` for hot reload + Studio
3. **Generate** - Add features with `generate`
4. **Test** - Test in Studio with AI chat
5. **Build** - Production build with `build`
6. **Deploy** - Deploy `dist/` to server

## Best Practices

### 1. Use Templates

Start with a template for best practices:

```bash
nitrostack-cli init my-project --template typescript-starter
```

### 2. Generate Code

Use generators instead of manual coding:

```bash
nitrostack-cli generate module users
nitrostack-cli generate tool get-user --module users
```

### 3. Type Generation

Regenerate types after tool changes:

```bash
nitrostack-cli generate types
```

### 4. Test in Studio

Always test in Studio before deployment:

```bash
nitrostack-cli dev
# Test with AI chat
# Test manual execution
```

## Troubleshooting

### Command Not Found

```bash
# If installed globally
npm install -g @nitrostack/cli

# Or use npx
npx @nitrostack/cli --version
```

### Port Already in Use

```bash
# Use different port
nitrostack-cli dev --port 8080
```

### Permission Errors

```bash
# Fix npm permissions
sudo chown -R $USER /usr/local/lib/node_modules
```

## Next Steps

- [Installation Guide](./02-installation.md)
- [Init Command](./03-init-command.md)
- [Dev Command](./04-dev-command.md)
- [Generate Command](./08-generate-command.md)

---

**CLI Version**: 3.0.0
