import dotenv from 'dotenv';
import { LogLevel } from '../types/logger.js';

dotenv.config();

export interface ServerConfig {
  serverName: string;
  serverVersion: string;
  logLevel: LogLevel;
  transport: 'stdio';
}

export function loadConfig(): ServerConfig {
  const validLogLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  const envLogLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
  const logLevel = validLogLevels.includes(envLogLevel) ? envLogLevel : 'info';

  return {
    serverName: process.env.SERVER_NAME || 'factory-supervisor-server',
    serverVersion: process.env.SERVER_VERSION || '1.0.0',
    logLevel,
    transport: 'stdio',
  };
}
