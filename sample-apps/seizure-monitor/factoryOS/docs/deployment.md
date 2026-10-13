# FactoryOS Deployment Guide

## Production Build

To build all services for production deployment:

```bash
npm run build
```

## Docker & Server Deployment

- Ensure `NODE_ENV=production`.
- Pass required OAuth environment variables: `RESOURCE_URI`, `AUTH_SERVER_URL`, `OAUTH_REQUIRED=true`.
- Execute `npm run start:prod`.
