# CLI Commands Reference

## Overview

The NitroStack CLI (`@nitrostack/cli`) provides commands for creating, developing, and building MCP server projects.

## Installation

```bash
npm install -g @nitrostack/cli
```

## Commands

### nitrostack-cli init

Create a new NitroStack project.

```bash
nitrostack-cli init <project-name> [options]
```

**Arguments:**

| Argument | Description | Required |
|----------|-------------|----------|
| `project-name` | Name of the project directory | Yes |

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--template <name>` | Template to use | `typescript-starter` |

**Templates:**

- `typescript-starter` - Basic MCP server with calculator example
- `typescript-oauth` - OAuth 2.1 authentication with Duffel API
- `typescript-pizzaz` - Map widgets with Mapbox integration

**Example:**

```bash
nitrostack-cli init my-project --template typescript-oauth
```

---

### nitrostack-cli dev

Start development mode with hot reload.

```bash
nitrostack-cli dev [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--no-open` | Don't open browser | `false` |

**What it starts:**

- MCP Server with file watching
- Widget Server on port 3001 (if widgets exist)

**Note:** NitroStudio is now a standalone application and must be started separately.

**Example:**

```bash
nitrostack-cli dev
```

---

### nitrostack-cli build

Build project for production.

```bash
nitrostack-cli build [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--output <dir>` | Output directory | `dist` |

**What it builds:**

- Compiles TypeScript to JavaScript
- Bundles widgets for production (if present)

**Example:**

```bash
nitrostack-cli build
```

---

### nitrostack-cli start

Start the production server.

```bash
nitrostack-cli start [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--port <number>` | Server port | `3002` |

**Example:**

```bash
nitrostack-cli start --port 8080
```

---

### nitrostack-cli install

Install dependencies in root and widgets directories.

```bash
nitrostack-cli install [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--skip-widgets` | Skip widget installation | `false` |

**What it does:**

1. Runs `npm install` in project root
2. Runs `npm install` in `src/widgets` (if exists)

**Example:**

```bash
# Install all dependencies
nitrostack-cli install

# Install root only
nitrostack-cli install --skip-widgets
```

---

### nitrostack-cli upgrade

Upgrade NitroStack packages to latest version.

```bash
nitrostack-cli upgrade [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--dry-run` | Preview changes without applying | `false` |

**What it updates:**

- `@nitrostack/core` in root `package.json`
- `@nitrostack/widgets` in `src/widgets/package.json`

**Example:**

```bash
# Upgrade packages
nitrostack-cli upgrade

# Preview changes
nitrostack-cli upgrade --dry-run
```

---

### nitrostack-cli generate

Generate code scaffolds.

```bash
nitrostack-cli generate <type> [name] [options]
```

**Types:**

| Type | Description |
|------|-------------|
| `module` | Generate a complete module |
| `tool` | Generate a tool class |
| `resource` | Generate a resource |
| `prompt` | Generate a prompt |
| `guard` | Generate an auth guard |
| `middleware` | Generate middleware |
| `interceptor` | Generate an interceptor |
| `pipe` | Generate a validation pipe |
| `filter` | Generate an exception filter |
| `service` | Generate a service class |

**Options:**

| Option | Description |
|--------|-------------|
| `--module <name>` | Parent module for tool/resource/prompt |
| `--output <path>` | Custom output path |

**Examples:**

```bash
# Generate a module
nitrostack-cli generate module products

# Generate a tool in a module
nitrostack-cli generate tool search --module products

# Generate middleware
nitrostack-cli generate middleware logging

# Generate a guard
nitrostack-cli generate guard auth
```

---

## npm Scripts

Projects include these npm scripts:

```json
{
  "scripts": {
    "dev": "nitrostack-cli dev",
    "build": "nitrostack-cli build",
    "start": "nitrostack-cli start",
    "upgrade": "nitrostack-cli upgrade",
    "install:all": "nitrostack-cli install"
  }
}
```

**Usage:**

```bash
npm run dev          # Start development
npm run build        # Build for production
npm start            # Start production server
npm run upgrade      # Upgrade packages
npm run install:all  # Install all dependencies
```

## Exit Codes

| Code | Description |
|------|-------------|
| `0` | Success |
| `1` | General error |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `MCP_SERVER_PORT` | MCP server port | `3002` |
| `WIDGET_PORT` | Widget server port | `3001` |
| `LOG_LEVEL` | Logging level | `info` |

## Related Documentation

- [Init Command](/cli/03-init-command.md)
- [Dev Command](/cli/04-dev-command.md)
- [Build Command](/cli/05-build-command.md)
- [Install Command](/cli/07-install-command.md)
- [Generate Command](/cli/08-generate-command.md)
- [Upgrade Command](/cli/09-upgrade-command.md)
