# DEPLOY.md

**Purpose:** Provide actionable local setup, NitroStack config, and deployment guidance for ClinicaMind.

## Local Development

### Prerequisites
- Node.js v16+ installed
- npm
- NitroStack CLI installed globally: `npm install -g @nitrostack/cli`

### Setup
1. Clone the repository:
   ```bash
git clone https://github.com/your-repo/clinica-mind.git
cd clinica-mind
```
2. Install dependencies:
   ```bash
npm install
```
3. Copy environment variables:
   ```bash
cp .env.example .env
```
4. Set API keys in `.env`:
   - `OPENAI_API_KEY`
   - `PUBMED_API_KEY` (optional, improves PubMed rate limits)
   - `NEXT_PUBLIC_MAPBOX_TOKEN` if using map widgets

### Run Dev Server

```bash
npm run dev
```

This starts NitroStack and the React frontend for live development.

## NitroStack CLI

- `nitrostack-cli dev`: Run the app in development mode with hot reload.
- `nitrostack-cli build`: Build the server and widget bundle.
- `nitrostack-cli start`: Start the production server.
- `nitrostack-cli install`: Install NitroStack skill dependencies.

## NitroStack Config

ClinicaMind modules are located under `src/modules/*` and widget code is under `src/widgets`.

If a config file is used, it should include module registration and transport settings. Example values:

```json
{
  "mcp": {
    "transportType": "dual",
    "host": "localhost",
    "port": 3000
  }
}
```

## CI/CD

A minimal GitHub Actions workflow:

```yaml
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
```

## Deployment

### Docker

Example Dockerfile:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Cloud

Deploy to any Node-compatible service using environment variables for secrets.

## Tokens & Environment

- Keep `.env` out of source control by verifying `.gitignore` includes it.
- Store `OPENAI_API_KEY` and `PUBMED_API_KEY` securely.
- NitroStack token budgets are for model use during development and should not be exposed in client code.

This deployment guide gives the commands and environment details needed for demo and production preparation.
