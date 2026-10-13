import { Injectable, OnModuleInit, OnModuleDestroy, OnApplicationShutdown } from '@nitrostack/core';
import { MongoClient, Db, Collection } from 'mongodb';
import { databaseConfig } from '../config/database.config.js';

/**
 * Clinical Copilot MCP Server - Reusable MongoDB Service
 *
 * Singleton service managing MongoDB Atlas client connection, collection accessors,
 * reconnection logic, and graceful server shutdown hooks.
 */
@Injectable()
export class MongoService implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnecting = false;

  async onModuleInit(): Promise<void> {
    try {
      if (databaseConfig.uri && !databaseConfig.uri.includes('<username>')) {
        await this.connect();
      } else {
        console.error('[MongoService] MONGODB_URI contains placeholder credentials (<username>:<password>). Skipping initial DB connection. Server will connect on first tool call.');
      }
    } catch (error: any) {
      console.error(`[MongoService] Database connection deferred (${error.message}). MCP Server will continue running.`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    console.error(`[MongoService] Application shutdown signal received (${signal}). Closing database connections.`);
    await this.disconnect();
  }

  /**
   * Connects to MongoDB Atlas if not already connected
   */
  async connect(): Promise<Db> {
    if (this.db && this.client) {
      return this.db;
    }

    if (this.isConnecting) {
      // Wait for ongoing connection attempt to complete
      while (this.isConnecting) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (this.db) return this.db;
    }

    this.isConnecting = true;
    try {
      const uri = process.env.MONGODB_URI || databaseConfig.uri;
      const dbName = process.env.DATABASE_NAME || databaseConfig.dbName;

      if (!uri) {
        throw new Error('MONGODB_URI is not defined in environment variables.');
      }

      console.error(`[MongoService] Connecting to MongoDB Atlas database '${dbName}'...`);
      
      // Recommended official MongoDB Atlas MongoClient configuration
      this.client = new MongoClient(process.env.MONGODB_URI!, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
      });

      await this.client.connect();
      this.db = this.client.db(dbName);
      console.error(`[MongoService] Successfully connected to MongoDB Atlas database '${dbName}'.`);
      return this.db;
    } catch (error: any) {
      console.error(`[MongoService] MongoDB connection failed: ${error.message}`);
      this.client = null;
      this.db = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Disconnects gracefully from MongoDB Atlas
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        console.error('[MongoService] MongoDB connection closed.');
      } catch (error: any) {
        console.error('[MongoService] Error closing MongoDB connection:', error.message);
      } finally {
        this.client = null;
        this.db = null;
      }
    }
  }

  /**
   * Returns active Db instance. Attempts auto-connect if disconnected.
   */
  async getDb(): Promise<Db> {
    if (!this.db) {
      return await this.connect();
    }
    return this.db;
  }

  /**
   * Generic collection accessor helper
   */
  async getCollection<T extends Record<string, any>>(collectionName: string): Promise<Collection<T>> {
    const db = await this.getDb();
    return db.collection<T>(collectionName);
  }

  /**
   * Collections accessors matching schema requirements:
   * users, reports, patients, timelines, referrals
   */
  async getUsersCollection(): Promise<Collection<any>> {
    return this.getCollection('users');
  }

  async getReportsCollection(): Promise<Collection<any>> {
    return this.getCollection('reports');
  }

  async getPatientsCollection(): Promise<Collection<any>> {
    return this.getCollection('patients');
  }

  async getTimelinesCollection(): Promise<Collection<any>> {
    return this.getCollection('timelines');
  }

  async getReferralsCollection(): Promise<Collection<any>> {
    return this.getCollection('referrals');
  }
}
