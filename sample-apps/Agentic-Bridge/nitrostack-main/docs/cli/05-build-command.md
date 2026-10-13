# Build Command

## Usage

```bash
nitrostack-cli build
```

## What It Does

1. Compiles TypeScript to JavaScript
2. Bundles dependencies
3. Optimizes for production
4. Creates \`dist/\` directory

## Output

```
dist/
├── index.js
├── modules/
└── ... (compiled code)
```

## Production Deployment

```bash
nitrostack-cli build
node dist/index.js
```

## Next Steps

- [Deployment Checklist](../deployment/01-checklist.md)
- [Docker Guide](../deployment/02-docker-guide.md)
- [Cloud Platforms](../deployment/03-cloud-platforms.md)
