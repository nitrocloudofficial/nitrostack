# Local Development Guide

This guide explains how to develop and test NitroStack packages locally.

## Package Structure

NitroStack is organized as a monorepo with three main packages:

| Package | Description | Binary |
|---------|-------------|--------|
| `@nitrostack/core` | Core SDK for building MCP servers | - |
| `@nitrostack/cli` | CLI tools and project templates | `nitrostack-cli`, `create-nitrostack` |
| `@nitrostack/widgets` | Widget utilities for building interactive UIs | - |

## Quick Start

### 1. Build All Packages

```bash
cd typescript
npm run build:all
```

### 2. Link All Packages Globally

```bash
npm run link:all
```

This runs `npm link` for all packages, making them available globally.

### 3. Create a Test Project

```bash
# Navigate to a directory outside the nitrostack repo
cd ~/projects

# Create a new project using the CLI
npx create-nitrostack my-test-project
# OR use the linked CLI
nitrostack-cli init my-test-project
```

### 4. Link Packages to Test Project

```bash
cd my-test-project

# Link the SDK
npm link @nitrostack/core

# Link the CLI (for dev commands)
npm link @nitrostack/cli

# Link widgets (if project has widgets)
cd src/widgets
npm link @nitrostack/widgets
cd ../..
```

### 5. Run Development Server

```bash
npm run dev
```

## Development Workflow

### Making Changes to Core SDK (`@nitrostack/core`)

1. Make changes in `typescript/packages/core/src/`
2. Rebuild: `cd packages/core && npm run build`
3. Changes are automatically available in linked projects

### Making Changes to CLI (`@nitrostack/cli`)

1. Make changes in `typescript/packages/cli/src/`
2. Rebuild: `cd packages/cli && npm run build`
3. Test with `nitrostack-cli <command>`

### Making Changes to Widgets (`@nitrostack/widgets`)

1. Make changes in `typescript/packages/widgets/src/`
2. Rebuild: `cd packages/widgets && npm run build`
3. Changes are automatically available in linked widget projects

## Unlinking Packages

When done with local development:

```bash
cd typescript
npm run unlink:all
```

Then in your test projects:

```bash
npm unlink @nitrostack/core
npm unlink @nitrostack/cli
npm unlink @nitrostack/widgets
npm install  # Re-install from npm registry
```

## Testing

### Run All Tests

```bash
cd typescript
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run CLI Package Tests

```bash
cd packages/cli
npm test
```

### Run Widgets Package Tests

```bash
cd packages/widgets
npm test
```

## Common Issues

### "Module not found" after linking

Make sure you've built the package before linking:
```bash
npm run build
npm link
```

### Changes not reflecting in test project

1. Rebuild the changed package
2. No need to re-link - changes are automatically available

### Binary not found

After `npm link`, you may need to restart your terminal or run:
```bash
hash -r  # bash/zsh
```

### Conflicting versions

If you have conflicting versions installed:
```bash
npm unlink <package>
rm -rf node_modules
npm install
npm link <package>
```
