# Install Command

## Overview

The `install` command runs `npm install` in both the root project directory and the `src/widgets` directory, ensuring all dependencies are properly installed.

## Usage

```bash
nitrostack-cli install [options]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--skip-widgets` | Skip installing widget dependencies | `false` |

## What It Does

When you run `nitrostack-cli install`:

1. **Root Installation**
   - Runs `npm install` in the project root
   - Installs SDK dependencies (`@nitrostack/core`, `zod`, etc.)
   - Installs dev dependencies (`typescript`, `@types/node`)

2. **Widget Installation** (if `src/widgets` exists)
   - Runs `npm install` in `src/widgets`
   - Installs widget SDK (`@nitrostack/widgets`)
   - Installs Next.js and React dependencies

## Examples

### Basic Usage

```bash
nitrostack-cli install
```

Output:
```
┌──────────────────────────────────────────────────────────────────┐
│  NITROSTACK ━━ Install                                           │
│  Installing dependencies                                         │
└──────────────────────────────────────────────────────────────────┘

✔ Root dependencies installed
✔ Widget dependencies installed

┌──────────────────────────────────────────────────────────────────┐
│  ✓ Installation Complete                                         │
│                                                                  │
│  • Root packages: 45 packages                                    │
│  • Widget packages: 128 packages                                 │
└──────────────────────────────────────────────────────────────────┘
```

### Skip Widgets

If you only want to install root dependencies:

```bash
nitrostack-cli install --skip-widgets
```

### Using npm Script

Projects include a convenient npm script:

```bash
npm run install:all
```

This is equivalent to `nitrostack-cli install`.

## When to Use

Use the install command when:

- **After cloning a project** - Install all dependencies
- **After pulling updates** - Sync dependencies with lock files
- **After clearing node_modules** - Reinstall everything
- **Setting up CI/CD** - Ensure consistent installations

## Project Structure

The command expects this structure:

```
my-project/
├── package.json         # Root dependencies
├── package-lock.json    # Root lock file
├── src/
│   └── widgets/
│       ├── package.json       # Widget dependencies
│       └── package-lock.json  # Widget lock file
```

## Comparison with npm install

| Command | Root | Widgets |
|---------|------|---------|
| `npm install` | ✓ | ✗ |
| `npm run install:all` | ✓ | ✓ |
| `nitrostack-cli install` | ✓ | ✓ |
| `nitrostack-cli install --skip-widgets` | ✓ | ✗ |

## Troubleshooting

### No Widgets Directory

If `src/widgets` doesn't exist, the command skips widget installation automatically:

```
✔ Root dependencies installed
ℹ No widgets directory found, skipping
```

### Permission Errors

On Linux/macOS, if you encounter permission errors:

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

### Conflicting Versions

If you get peer dependency warnings:

```bash
# Use legacy peer deps mode
npm install --legacy-peer-deps
```

Or add to `.npmrc`:
```
legacy-peer-deps=true
```

### Cache Issues

Clear npm cache if installation fails:

```bash
npm cache clean --force
nitrostack-cli install
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Install dependencies
  run: npx @nitrostack/cli install
```

### Docker

```dockerfile
COPY package*.json ./
COPY src/widgets/package*.json ./src/widgets/
RUN npx @nitrostack/cli install
```

## Related Commands

- [Upgrade Command](/cli/09-upgrade-command.md) - Update package versions
- [Dev Command](/cli/04-dev-command.md) - Start development server
- [Build Command](/cli/05-build-command.md) - Build for production

## Next Steps

- [Dev Command](./04-dev-command.md)
- [Upgrade Command](./09-upgrade-command.md)

