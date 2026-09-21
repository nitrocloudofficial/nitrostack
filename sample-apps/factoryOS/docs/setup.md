# FactoryOS Setup & Installation Guide

## Prerequisites

- Node.js >= 18.x
- npm >= 9.x

## Installation

1. Install root & MCP server dependencies:
   ```bash
   npm install
   ```

2. Install Widget dependencies:
   ```bash
   npm run widget -- install
   ```

3. Configure Environment Variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

## Development

- Start MCP server: `npm run dev`
- Build MCP server: `npm run build`
- Run widgets dev server: `npm run widget -- dev`

## OAuth 2.1 Setup

For complete OAuth 2.1 setup instructions with Auth0, refer to the [OAuth Setup Guide](../OAUTH_SETUP.md).
