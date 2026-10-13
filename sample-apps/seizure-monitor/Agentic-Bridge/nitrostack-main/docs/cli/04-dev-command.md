# Dev Command

## Overview

The `dev` command starts your NitroStack server in development mode with hot reload and the widget development server.

> **Note**: NitroStudio is now a standalone application. The `dev` command no longer starts Studio automatically. See [Studio Standalone Setup](../studio/04-standalone-setup.md) for details.

## Usage

```bash
nitrostack-cli dev [options]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--no-open` | Don't open browser (widget server) | false |

## What It Does

When you run `nitrostack-cli dev`, it:

1. **Starts MCP Server**
   - Runs your server via stdio transport
   - Watches for file changes in `src/`
   - Auto-reloads on changes

2. **Starts Widget Server** (if `src/widgets` exists)
   - Next.js dev server on port 3001
   - Hot reload for widgets
   - React Fast Refresh

3. **Shows Ready Screen**
   - Displays connection information
   - Shows how to connect NitroStudio

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    nitrostack-cli dev                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────┐     ┌────────────────────────┐      │
│  │     MCP Server         │     │    Widget Server       │      │
│  │     (stdio)            │     │    (port 3001)         │      │
│  │                        │     │                        │      │
│  │  • TypeScript watch    │     │  • Next.js dev         │      │
│  │  • Auto-reload         │     │  • Hot reload          │      │
│  │  • Tools & Resources   │     │  • React components    │      │
│  └────────────────────────┘     └────────────────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Connect separately
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NitroStudio (Standalone)                     │
│                                                                  │
│  • Select project folder                                         │
│  • Connects to MCP server                                        │
│  • Renders widgets from port 3001                                │
└─────────────────────────────────────────────────────────────────┘
```

## Examples

### Basic Usage

```bash
nitrostack-cli dev
```

Output:
```
┌──────────────────────────────────────────────────────────────────┐
│  NITROSTACK ━━ Development                                       │
│  Starting development servers                                    │
└──────────────────────────────────────────────────────────────────┘

✔ MCP Server ready (stdio)
✔ Widget Server ready (http://localhost:3001)

┌──────────────────────────────────────────────────────────────────┐
│  ✓ Development servers ready                                     │
│                                                                  │
│  MCP Server: stdio transport                                     │
│  Widgets: http://localhost:3001                                  │
│                                                                  │
│  To test your server:                                            │
│  1. Open NitroStudio                                             │
│  2. Select this project folder                                   │
│  3. Click Connect                                                │
└──────────────────────────────────────────────────────────────────┘
```

### Using npm Script

```bash
npm run dev
```

## Features

### Hot Reload

Changes to your code automatically reload the server:

**Watched Files**:
- `src/**/*.ts` - TypeScript source
- `src/**/*.js` - JavaScript source
- `.env` - Environment variables

**Not Watched**:
- `node_modules/`
- `dist/`
- `logs/`
- `src/widgets/` (handled by Next.js)

### Widget Hot Reload

Widgets support React Fast Refresh:
- Save changes to see updates instantly
- State preserved during reload
- Fast iteration cycle

## Environment Variables

Configure dev mode via `.env`:

```bash
# Widget port
WIDGET_PORT=3001

# Log level
LOG_LEVEL=info

# Transport type (for MCP)
MCP_TRANSPORT_TYPE=stdio
```

## Development Workflow

1. **Start Dev Mode**
   ```bash
   npm run dev
   ```

2. **Open NitroStudio**
   - Launch NitroStudio (standalone app)
   - Select your project folder
   - Click Connect

3. **Make Changes**
   - Edit tools in `src/modules/*/tools.ts`
   - Edit widgets in `src/widgets/app/`
   - Edit services in `src/services/`

4. **Test in Studio**
   - Use AI chat to test tools
   - Execute tools manually
   - Preview widgets

5. **Iterate**
   - Changes auto-reload
   - Test again
   - Repeat

## Troubleshooting

### Port Already in Use

**Error**: `listen EADDRINUSE: address already in use :::3001`

**Solution**:
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>
```

### TypeScript Errors

**Error**: Compilation errors on start

**Solution**:
```bash
# Check for type errors
npx tsc --noEmit

# Fix errors and restart
npm run dev
```

### Widgets Not Loading

**Error**: 500 error when loading widgets

**Solution**:
```bash
# Check widget server
curl http://localhost:3001

# Ensure widget dependencies installed
cd src/widgets && npm install

# Restart
npm run dev
```

### Hot Reload Not Working

**Solution**:
```bash
# Ensure watching is enabled
# Check file permissions
ls -la src/

# Restart dev mode
npm run dev

# Verify build succeeds
npm run build
```

## Performance Tips

### 1. Exclude Large Directories

Add to `.gitignore`:
```
node_modules/
dist/
.next/
logs/
```

### 2. Use Incremental Compilation

In `tsconfig.json`:
```json
{
  "compilerOptions": {
    "incremental": true
  }
}
```

### 3. Limit Watching

The dev server automatically excludes:
- `node_modules/`
- `dist/`
- `.next/`
- `*.log`

## Connecting NitroStudio

Since Studio is now standalone:

1. **Download NitroStudio** from [nitrostack.ai/studio](https://nitrostack.ai/studio)
2. **Start your project**: `npm run dev`
3. **Open Studio** and select your project folder
4. **Click Connect**

Studio will connect to your MCP server and widget server automatically.

## Advanced Usage

### Add Widget Dependencies

To add a new package to your widgets:

```bash
npm run widget add @mui/material @emotion/react
```

### Debug Mode

Enable verbose logging:

```bash
LOG_LEVEL=debug npm run dev
```

### Custom Entry Point

By default, the server runs from `src/index.ts`. To use a different entry:

```bash
# In package.json
{
  "main": "src/custom-entry.ts"
}
```

## Next Steps

- [Build Command](./05-build-command.md)
- [Install Command](./07-install-command.md)
- [Studio Standalone Setup](../studio/04-standalone-setup.md)
- [Testing Guide](../sdk/typescript/14-testing-guide.md)

---

**Tip**: Keep NitroStudio open while coding - it automatically refreshes when your server reloads!
