# Init Command

## Usage

```bash
nitrostack-cli init my-project
```

## Options

```bash
nitrostack-cli init my-project --template typescript-starter
```

## Available Templates

- `typescript-starter` - Basic TypeScript starter template
- `typescript-oauth` - OAuth 2.1-ready template
- `typescript-pizzaz` - Advanced widget-focused template

## What It Creates

```
my-project/
├── src/
│   ├── modules/         # Feature modules
│   ├── app.module.ts    # Root module
│   └── index.ts         # Entry point
├── widgets/             # UI components
├── .env.example         # Environment template
└── package.json
```

## Next Steps

1. \`cd my-project\`
2. \`npm install\`
3. \`npm run dev\`


## CloudOps Guardian

Use `nitrostack init guardian --preset cloudops-guardian` or choose **CloudOps Guardian** in the template picker. The feature-branch setup uses locally packed packages. [Setup and walkthrough](../../typescript/packages/cli/templates/typescript-dynamic-guardrails/README.md)
