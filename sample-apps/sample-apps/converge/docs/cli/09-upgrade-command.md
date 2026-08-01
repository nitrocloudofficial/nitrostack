# Upgrade Command

## Overview

The `upgrade` command updates NitroStack packages to the latest compatible versions in both the root project and widget directories, keeping your project up-to-date with the latest SDK features and fixes.

## Usage

```bash
nitrostack-cli upgrade [options]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--dry-run` | Show what would be updated without making changes | `false` |

## What It Does

When you run `nitrostack-cli upgrade`:

1. **Fetches Latest Version**
   - Queries npm registry for latest `@nitrostack/core` version
   - Compares with currently installed version

2. **Updates Root Project**
   - Updates `@nitrostack/core` in `package.json`
   - Runs `npm install` to update `package-lock.json`

3. **Updates Widgets** (if applicable)
   - Updates `@nitrostack/widgets` in `src/widgets/package.json`
   - Runs `npm install` in widgets directory

## Examples

### Basic Upgrade

```bash
nitrostack-cli upgrade
```

Output:
```
┌──────────────────────────────────────────────────────────────────┐
│  NITROSTACK ━━ Upgrade                                           │
│  Updating NitroStack packages                                    │
└──────────────────────────────────────────────────────────────────┘

✔ Fetched latest version: 1.2.0
✔ Root: @nitrostack/core 1.1.0 → 1.2.0
✔ Widgets: @nitrostack/widgets 1.1.0 → 1.2.0

┌──────────────────────────────────────────────────────────────────┐
│  ✓ Upgrade Complete                                              │
│                                                                  │
│  Updated to @nitrostack/core@1.2.0                               │
└──────────────────────────────────────────────────────────────────┘
```

### Dry Run

Preview what would be updated:

```bash
nitrostack-cli upgrade --dry-run
```

Output:
```
┌──────────────────────────────────────────────────────────────────┐
│  NITROSTACK ━━ Upgrade (Dry Run)                                 │
│  Checking for updates                                            │
└──────────────────────────────────────────────────────────────────┘

Current version: 1.1.0
Latest version: 1.2.0

Would update:
  • package.json: @nitrostack/core ^1.1.0 → ^1.2.0
  • src/widgets/package.json: @nitrostack/widgets ^1.1.0 → ^1.2.0

Run without --dry-run to apply changes.
```

### Using npm Script

Projects include a convenient npm script:

```bash
npm run upgrade
```

This is equivalent to `nitrostack-cli upgrade`.

### Already Up to Date

```bash
nitrostack-cli upgrade
```

Output:
```
┌──────────────────────────────────────────────────────────────────┐
│  NITROSTACK ━━ Upgrade                                           │
│  Checking for updates                                            │
└──────────────────────────────────────────────────────────────────┘

✔ Already up to date (1.2.0)
```

## Packages Updated

The upgrade command updates these packages:

| Location | Package |
|----------|---------|
| Root | `@nitrostack/core` |
| Widgets | `@nitrostack/widgets` |

### CLI Updates

To update the CLI itself:

```bash
npm install -g @nitrostack/cli@latest
```

## Version Strategy

The command uses caret (`^`) versioning:

```json
{
  "dependencies": {
    "@nitrostack/core": "^1.2.0"
  }
}
```

This allows compatible updates while preventing breaking changes.

## Breaking Changes

### Major Version Upgrades

For major version upgrades (e.g., 1.x → 2.x):

1. Check the [changelog](https://github.com/nitrocloudofficial/nitrostack/releases)
2. Review migration guide
3. Update manually if needed:

```bash
npm install @nitrostack/core@2
```

### Migration Guides

See migration guides for major versions:
- [Widget SDK Migration Guide](/guides/widget-sdk-migration.md)

## Troubleshooting

### Network Errors

If you get network errors fetching the latest version:

```bash
# Check npm registry connectivity
npm view @nitrostack/core version

# Use different registry
npm config set registry https://registry.npmjs.org/
nitrostack-cli upgrade
```

### Permission Errors

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Or use npx
npx @nitrostack/cli upgrade
```

### Lock File Conflicts

If `package-lock.json` has conflicts:

```bash
# Remove lock files
rm package-lock.json
rm src/widgets/package-lock.json

# Reinstall
nitrostack-cli install
```

### Dependency Conflicts

If upgrade fails due to peer dependencies:

```bash
# Check what needs updating
npm outdated

# Update all dependencies
npm update

# Then run NitroStack upgrade
nitrostack-cli upgrade
```

## CI/CD Integration

### Automated Updates

Use GitHub Actions to check for updates:

```yaml
name: Check Updates

on:
  schedule:
    - cron: '0 0 * * 1'  # Weekly

jobs:
  check-updates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npx @nitrostack/cli upgrade --dry-run
```

### Dependabot

Configure Dependabot for automatic PRs:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      nitrostack:
        patterns:
          - "@nitrostack/core"
          - "@nitrostack/*"
```

## Best Practices

1. **Test After Upgrade** - Always run tests after upgrading
2. **Read Changelog** - Check for new features and fixes
3. **Use Dry Run First** - Preview changes before applying
4. **Commit Lock Files** - Always commit `package-lock.json`
5. **Pin Major Versions** - Use `^` for minor updates only

## Related Commands

- [Install Command](/cli/07-install-command.md) - Install all dependencies
- [Build Command](/cli/05-build-command.md) - Build for production
- [Dev Command](/cli/04-dev-command.md) - Start development server

## Next Steps

- [Build Command](./05-build-command.md)
- [Changelog](https://github.com/nitrocloudofficial/nitrostack/releases)

