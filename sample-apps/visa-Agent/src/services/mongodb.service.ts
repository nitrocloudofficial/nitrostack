import { Injectable } from '@nitrostack/core';
import { MongoClient, Db, Collection, Document } from 'mongodb';

/**
 * [HLD] Scalability: Queueing + Caching
 * [STATUS: CONCEPTUAL for RabbitMQ/Redis; MongoDB adapter is IMPLEMENTED]
 * ------------------------------------------------------------------
 * Long-running scrape, OCR, embedding, and report work belongs on parallel
 * workers so it never blocks case requests. The scale-tier design uses
 * RabbitMQ for that work and Redis for slow-changing requirement sets and hot
 * RAG answers. Live case, task, and approval state is always read from
 * MongoDB: caching it can expose stale decisions and break the trust model.
 *
 * The knowledge base gets faster as common country/visa combinations warm the
 * cache. This adapter currently provides only MongoDB connectivity for the
 * implemented housing and broker collections.
 * [/HLD]
 */
/**
 * Collection names owned by this slice.
 *
 * Per docs/ARCHITECTURE.md §"MongoDB collection names use lowercase plural
 * nouns", these are fixed here rather than passed in by callers so a typo
 * cannot silently create a new collection at runtime.
 */
export const COLLECTIONS = {
    brokerProfiles: 'broker_profiles',
    housingPreferences: 'housing_preferences',
    brokerRecommendations: 'broker_recommendations'
} as const;

/**
 * MongoService
 *
 * Integration Adapter Service for MongoDB Atlas (docs/ARCHITECTURE.md §7
 * "Integration Adapter Services", §183 — adapters own connection handling,
 * timeouts, retries, provider error normalization, and health reporting).
 *
 * Connection model: a single MongoClient shared process-wide. The official
 * driver already maintains an internal connection pool, so creating a client
 * per call or per request is the documented anti-pattern — one client is
 * reused and connected lazily on first use.
 *
 * Configuration is read from the environment (MONGODB_URI, DB_NAME) at
 * connect time rather than at import time, so importing this module never
 * throws and the server can still boot when Mongo is not configured. The
 * failure surfaces on first use, where it can be reported to a caller.
 *
 * TODO(housing): no retry/backoff policy, circuit breaker, or health-check
 * registration yet — docs/ARCHITECTURE.md §183 requires all three at the
 * adapter boundary before production use.
 * TODO(housing): provider errors are surfaced as-is. They must be normalized
 * into the application error taxonomy (docs/ARCHITECTURE.md §16) so callers
 * never depend on driver-specific error shapes.
 * TODO(housing): every collection needs explicit indexes, tenant boundaries,
 * and retention/soft-delete rules per docs/ARCHITECTURE.md §487. This slice
 * creates none.
 */
@Injectable()
export class MongoService {
    /**
     * Process-wide singleton state. Held as statics so that even if the DI
     * container were to construct this provider more than once (e.g. the
     * service being registered in several modules), every instance still
     * shares one client and one in-flight connection promise.
     */
    private static client: MongoClient | null = null;
    private static db: Db | null = null;
    private static connecting: Promise<Db> | null = null;

    /**
     * Returns the connected database handle, connecting on first call.
     *
     * Concurrent callers share a single in-flight connection promise rather
     * than racing to open multiple clients.
     */
    async getDb(): Promise<Db> {
        if (MongoService.db) {
            return MongoService.db;
        }
        if (MongoService.connecting) {
            return MongoService.connecting;
        }

        MongoService.connecting = this.connect();
        try {
            return await MongoService.connecting;
        } catch (error) {
            // Allow a later call to retry instead of caching the failure.
            MongoService.connecting = null;
            throw error;
        }
    }

    private async connect(): Promise<Db> {
        const uri = process.env.MONGODB_URI;
        const dbName = process.env.DB_NAME;

        if (!uri) {
            throw new Error(
                'MONGODB_URI is not set. Housing tools require a MongoDB Atlas connection string ' +
                '— copy .env.example to .env and set MONGODB_URI.'
            );
        }
        if (!dbName) {
            throw new Error(
                'DB_NAME is not set. Housing tools require a database name ' +
                '— copy .env.example to .env and set DB_NAME.'
            );
        }

        const client = new MongoClient(uri);
        await client.connect();

        MongoService.client = client;
        MongoService.db = client.db(dbName);
        return MongoService.db;
    }

    /**
     * Typed collection accessor. Callers pass a name from COLLECTIONS so the
     * set of collections this service touches stays enumerable.
     */
    async collection<T extends Document>(
        name: (typeof COLLECTIONS)[keyof typeof COLLECTIONS]
    ): Promise<Collection<T>> {
        const db = await this.getDb();
        return db.collection<T>(name);
    }

    /**
     * True when a connection has already been established. Does not connect.
     *
     * TODO(housing): expose this through a NitroStack HealthCheck alongside
     * SystemHealthCheck once the adapter reports liveness properly.
     */
    isConnected(): boolean {
        return MongoService.db !== null;
    }

    /**
     * Closes the shared client. Intended for tests and graceful shutdown.
     *
     * TODO(housing): wire into a process shutdown hook so Atlas connections
     * are released on SIGTERM.
     */
    async close(): Promise<void> {
        if (MongoService.client) {
            await MongoService.client.close();
        }
        MongoService.client = null;
        MongoService.db = null;
        MongoService.connecting = null;
    }
}
