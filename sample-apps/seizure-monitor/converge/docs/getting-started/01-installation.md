# Installation

## Package Overview

NitroStack consists of three separate packages:

| Package | Purpose | When to Install |
|---------|---------|-----------------|
| `@nitrostack/cli` | CLI tools for project management | Install globally once |
| `@nitrostack/core` | Core SDK for MCP servers | Included in projects |
| `@nitrostack/widgets` | Widget development SDK | Included in widget projects |

## Install CLI (Required)

Install the NitroStack CLI globally:

```bash
npm install -g @nitrostack/cli
```

### Verify Installation

```bash
nitrostack-cli --version
```

### Alternative: Use npx

You can also use npx without global installation:

```bash
npx @nitrostack/cli init my-project
```

## Project Dependencies

When you create a new project, dependencies are automatically added:

### Root Project (`package.json`)

```json
{
  "dependencies": {
    "@nitrostack/core": "^1",
    "zod": "^3.22.4",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@nitrostack/cli": "^1",
    "@types/node": "^22.10.0",
    "typescript": "^5.3.3"
  }
}
```

### Widgets Project (`src/widgets/package.json`)

```json
{
  "dependencies": {
    "@nitrostack/widgets": "^1",
    "next": "^14",
    "react": "^18",
    "react-dom": "^18"
  }
}
```

## System Requirements

- **Node.js**: 18.x or 20.x (LTS recommended)
- **npm**: 8.x or newer
- **OS**: Windows, macOS, or Linux

## Install in Existing Projects

### Installing Root Dependencies

```bash
# Install all dependencies in root and widgets
nitrostack-cli install
```

This runs `npm install` in both the root directory and `src/widgets`.

### Manual Installation

```bash
# Root dependencies
npm install @nitrostack/core zod dotenv
npm install -D @nitrostack/cli @types/node typescript

# Widget dependencies (if using widgets)
cd src/widgets
npm install @nitrostack/widgets next react react-dom
```

## Upgrading Packages

Upgrade NitroStack packages to the latest version:

```bash
nitrostack-cli upgrade
```

This updates NitroStack packages (including `@nitrostack/core` and `@nitrostack/widgets`) in root and widget directories.

See [Upgrade Command](../cli/09-upgrade-command.md) for more options.

## NitroStudio Setup

NitroStudio is now a standalone application:

1. **Download** NitroStudio from [nitrostack.ai/studio](https://nitrostack.ai/studio)
2. **Start your project**: `npm run dev`
3. **Connect Studio** to your project directory

Studio connects to your MCP server and widget server automatically.

## Next Steps

- [Quick Start Guide](./02-quick-start.md)
- [Init Command](../cli/03-init-command.md)
- [Dev Command](../cli/04-dev-command.md)
