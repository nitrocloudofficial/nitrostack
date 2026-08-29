import 'dotenv/config';

/**
 * Clinical Copilot - Database Configuration Interface
 */
export interface DatabaseConfig {
  uri: string;
  dbName: string;
}

/**
 * Loads and exports MongoDB Atlas connection configuration from process.env.
 * Uses dynamic getters to ensure live resolution of environment variables
 * without hardcoding any local MongoDB fallbacks (localhost / 127.0.0.1 / ::1).
 */
export const databaseConfig: DatabaseConfig = {
  get uri(): string {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('[databaseConfig] MONGODB_URI environment variable is missing in process.env!');
    }
    return uri;
  },
  get dbName(): string {
    return process.env.DATABASE_NAME || 'clinical_copilot';
  },
};
