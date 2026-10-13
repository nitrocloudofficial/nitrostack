import { loggerConfig } from '../config/logger.config.js';

export class Logger {
  public static info(message: string, context?: Record<string, unknown>): void {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, context ? JSON.stringify(context) : '');
  }

  public static warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, context ? JSON.stringify(context) : '');
  }

  public static error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, error, context ? JSON.stringify(context) : '');
  }

  public static debug(message: string, context?: Record<string, unknown>): void {
    if (loggerConfig.level === 'debug') {
      console.log(`[DEBUG] [${new Date().toISOString()}] ${message}`, context ? JSON.stringify(context) : '');
    }
  }
}
