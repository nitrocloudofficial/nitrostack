# Converra One - Enterprise Deployment & Operations Guide

This guide describes how to run, test, and deploy **Converra One** across Local, Docker, and **NitroStack Cloud** environments.

---

## 🛠️ 1. Local Development Setup

### Prerequisites
- Node.js >= 18.x
- npm >= 9.x

### Steps
```bash
# 1. Install dependencies
npm install

# 2. Run TypeScript compilation check
npx tsc --noEmit

# 3. Run Master System Smoke Test
npx tsx tests/smokeTest.ts

# 4. Start Local Development Server
npm run dev
```

---

## 🐳 2. Docker Deployment

### Run Container via Docker Compose
```bash
# Build and launch production container
docker-compose up --build -d

# View container logs
docker-compose logs -f converra-one
```

---

## ☁️ 3. NitroStack Cloud Deployment

Deploy directly using the NitroStack CLI:

```bash
# 1. Login to NitroStack Cloud
npx @nitrostack/cli login

# 2. Deploy Converra One MCP Application
npx @nitrostack/cli deploy --env production
```

---

## 🧪 4. Single-Command Master Validation

Validate all frontend, backend, agent, workflow, and connector subsystems with one command:

```bash
npx tsx tests/smokeTest.ts
```
