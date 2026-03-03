# CLI Installation Guide

## Overview

The NitroStack CLI (`@nitrostack/cli`) is a separate package that provides commands for creating, developing, and building MCP server projects.

## Global Installation

Install the CLI globally for easy access:

```bash
npm install -g @nitrostack/cli
```

## Verify Installation

```bash
nitrostack-cli --version
```

Expected output:
```
@nitrostack/cli/1.0.3
```

## Alternative: Using npx

You can use npx without global installation:

```bash
# Create a new project
npx @nitrostack/cli init my-project

# Run commands in existing project
npx @nitrostack/cli dev
```

## Requirements

- **Node.js**: 18.x or 20.x (LTS recommended)
- **npm**: 8.x or newer
- **OS**: Windows, macOS, or Linux

## Package Architecture

NitroStack uses a monorepo structure with separate packages:

| Package | Purpose | Install Method |
|---------|---------|----------------|
| `@nitrostack/cli` | CLI tools | `npm install -g` |
| `@nitrostack/core` | Core SDK | Auto-installed in projects |
| `@nitrostack/widgets` | Widget SDK | Auto-installed in widget projects |

## Available Commands

After installation, you have access to:

| Command | Description |
|---------|-------------|
| `nitrostack-cli init` | Create new project |
| `nitrostack-cli dev` | Start development mode |
| `nitrostack-cli build` | Build for production |
| `nitrostack-cli start` | Start production server |
| `nitrostack-cli install` | Install all dependencies |
| `nitrostack-cli upgrade` | Upgrade packages |
| `nitrostack-cli generate` | Generate code scaffolds |

## Quick Start

```bash
# 1. Install CLI
npm install -g @nitrostack/cli

# 2. Create project
nitrostack-cli init my-project

# 3. Enter project
cd my-project

# 4. Start development
npm run dev
```

## Updating the CLI

To update to the latest version:

```bash
npm install -g @nitrostack/cli@latest
```

Check for updates:

```bash
npm outdated -g @nitrostack/cli
```

## Troubleshooting

### Permission Errors (Linux/macOS)

If you get `EACCES` errors:

```bash
# Option 1: Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Option 2: Use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

### Command Not Found

If `nitrostack-cli` is not found:

```bash
# Check npm global bin directory
npm bin -g

# Add to PATH if needed
export PATH="$(npm bin -g):$PATH"
```

### Version Mismatch

Ensure CLI version matches your project:

```bash
# Check CLI version
nitrostack-cli --version

# Check project dependencies
cat package.json | grep nitrostack
```

## Uninstalling

To remove the CLI:

```bash
npm uninstall -g @nitrostack/cli
```

## Next Steps

- [Init Command](./03-init-command.md)
- [Dev Command](./04-dev-command.md)
- [Quick Start Guide](../getting-started/02-quick-start.md)
