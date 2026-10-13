import { Injectable, ConfigService, type OnModuleInit } from '@nitrostack/core';
import mongoose from 'mongoose';

/**
 * DatabaseService
 *
 * Manages the Mongoose connection for the app, backed by MONGODB_URI.
 * Gracefully handles offline / missing MongoDB without crashing server startup.
 */
@Injectable({ deps: [ConfigService] })
export class DatabaseService implements OnModuleInit {
  private connection: typeof mongoose | null = null;
  private connecting: Promise<typeof mongoose | null> | null = null;

  constructor(private config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
    } catch {
      // MongoDB connection skipped or failed — running in fallback mode.
    }
  }

  async connect(): Promise<typeof mongoose | null> {
    if (this.connection) {
      return this.connection;
    }
    if (this.connecting) {
      return this.connecting;
    }

    const uri = this.config.get<string>('MONGODB_URI') || process.env.MONGODB_URI;
    if (!uri) {
      // MONGODB_URI is not set. Audit log will operate in-memory.
      return null;
    }

    this.connecting = mongoose
      .connect(uri, { dbName: 'nitroAppDB', serverSelectionTimeoutMS: 2000 })
      .then((conn) => {
        this.connection = conn;
        return conn;
      })
      .catch(() => {
        // MongoDB connection error. Operating in fallback mode.
        this.connection = null;
        return null;
      });

    return this.connecting;
  }

  getConnection(): typeof mongoose | null {
    return this.connection;
  }

  isConnected(): boolean {
    return this.connection !== null && mongoose.connection.readyState === 1;
  }
}
