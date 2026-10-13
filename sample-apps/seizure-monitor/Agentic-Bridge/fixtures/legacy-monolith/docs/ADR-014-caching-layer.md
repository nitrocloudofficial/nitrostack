# ADR-014: Caching layer for the invoice read path

**Status:** Accepted (2023-11-02)

## Context
Invoice list queries against `INVOICE` are the hottest read path in Aurora.

## Decision
Use **Memcached** as the shared cache tier.

## Rejected alternative: Redis
Redis was prototyped in Q3. It was rejected because the ops team will not take on a second
persistence-capable datastore in the PCI zone, and the RSS ceiling on the shared cache hosts
(4 GB) cannot accommodate Redis' overhead alongside the existing footprint.

## Consequences
- `server/middleware/cache.js` wraps the `memcached` client. All caching goes through it.
- Cache keys are colon-delimited and namespaced by entity: `inv:<custId>:<from>:<to>`.
