# Aurora Billing - Architecture Overview

Three tiers, one repository.

1. **Web tier** (`web/`) - React 16 + Tailwind 2, rendered by an Express static handler.
   All visual primitives come from `web/src/components/`. Design tokens live in
   `web/src/styles/tokens.css` and are mirrored into `tailwind.config.js`.
2. **Service tier** (`server/`) - Express routes -> services -> AuroraORM -> Oracle.
   Cross-cutting concerns are Express middleware in `server/middleware/`.
3. **Batch tier** (`scripts/`) - Python reconciliation jobs run nightly by Control-M.

## Where things live
| Concern | Location |
| --- | --- |
| HTTP routing | `server/routes/*.route.js` |
| Business logic | `server/services/*.service.js` |
| Data access | `server/db/aurora-orm.js` (the ONLY sanctioned path) |
| Auth | `server/middleware/auth.js` (JWT, `req.principal`) |
| Caching | `server/middleware/cache.js` (Memcached, see ADR-014) |
| UI primitives | `web/src/components/` |
| Design tokens | `web/src/styles/tokens.css` |
