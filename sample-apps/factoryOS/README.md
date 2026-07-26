# FactoryOS

FactoryOS is an enterprise platform featuring a NitroStack Model Context Protocol (MCP) server with OAuth 2.1 compliance, interactive UI widgets, frontend admin portal, backend Express API, and shared architecture.

## 📁 Repository Structure

```
factoryos/
│
├── src/                         # Official NitroStack MCP Server
│   ├── guards/
│   ├── health/
│   ├── modules/
│   │   ├── flights/
│   │   ├── inventory/
│   │   ├── suppliers/
│   │   └── analytics/
│   ├── services/
│   ├── app.module.ts
│   └── index.ts
│
├── widgets/                     # NitroStack Widgets
│   ├── app/
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── widget-manifest.json
│
├── frontend/                    # Customer/Admin UI
│   ├── app/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── utils/
│   ├── assets/
│   └── public/
│
├── backend/                     # Express API (Optional)
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── models/
│   │   ├── config/
│   │   ├── utils/
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                      # Shared types, interfaces, constants, & utils
├── docs/                        # Architecture & deployment docs
├── scripts/                     # Automation scripts
├── .github/                     # GitHub Actions CI Workflows
│
├── package.json
├── package-lock.json
├── tsconfig.json
├── widget-manifest.json
├── README.md
├── .env.example
├── .gitignore
└── LICENSE
```

## 🚀 Quick Start

```bash
# Install root dependencies
npm install

# Run MCP server in development mode
npm run dev

# Build MCP server
npm run build
```

## 📄 License

[MIT](LICENSE)
