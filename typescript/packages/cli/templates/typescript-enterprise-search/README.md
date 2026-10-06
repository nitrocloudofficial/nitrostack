# Enterprise Search MCP Service

An enterprise-grade Model Context Protocol (MCP) service optimized with BM25 progressive tool discovery.

## Features
- **BM25 Progressive Tool Discovery**: Automatically compresses large catalogs into a lightweight search index.
- **Catalog Browsing**: Calling `search_tools` with no query (or a generic one like "show tools") returns a brief index of every tool, capped at 20.
- **Always Visible Anchors**: Core operational tools (`support_auth_login`, `support_get_system_status`) remain available at all times.
- **Enterprise Controllers**: Includes Finance, Inventory, and Customer Support domain modules.

## Getting Started
```bash
npm install
npm run build
npm run dev
```
