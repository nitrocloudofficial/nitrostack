import winston from 'winston';
import os from 'os';
import { Logger, LogMeta } from './types.js';
import { EventEmitterTransport } from './events/log-emitter.js';

/**
 * Create a logger instance with custom configuration
 * 
 * IMPORTANT: For MCP servers, console logging is DISABLED by default
 * as it breaks the JSON-RPC protocol over stdio. All logs go to files.
 */
export function createLogger(options: {
  level?: string;
  file?: string;
  serviceName?: string;
  enableConsole?: boolean; // Only for non-MCP use cases
}): Logger {
  const { level = 'info', file, serviceName = 'nitrostack', enableConsole = false } = options;

  const transports: winston.transport[] = [new EventEmitterTransport()];

  // CRITICAL: Console logging disabled by default for MCP compatibility
  // MCP uses stdio for JSON-RPC communication, console output breaks it
  if (enableConsole) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : '';
            return `${timestamp} [${serviceName}] ${level}: ${message}${metaStr}`;
          })
        ),
      })
    );
  }

  // File logging - always recommended for MCP servers
  if (file) {
    transports.push(
      new winston.transports.File({
        filename: file,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );
  }

  // If no transports configured, use a null transport to avoid crashes
  if (transports.length === 0) {
    // Silent logger - logs nowhere (better than crashing)
    transports.push(
      new winston.transports.File({
        filename: os.devNull, // Cross-platform: works on Windows, macOS, Linux
        silent: true,
      })
    );
  }

  const winstonLogger = winston.createLogger({
    level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports,
  });

  return {
    debug: (message: string, meta?: LogMeta) => winstonLogger.debug(message, meta),
    info: (message: string, meta?: LogMeta) => winstonLogger.info(message, meta),
    warn: (message: string, meta?: LogMeta) => winstonLogger.warn(message, meta),
    error: (message: string, meta?: LogMeta) => winstonLogger.error(message, meta),
  };
}

/**
 * Default logger instance
 */
export const defaultLogger = createLogger({ level: 'info' });


