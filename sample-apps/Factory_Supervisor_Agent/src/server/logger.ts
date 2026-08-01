import { ILogger, LogLevel, LogMetadata } from '../types/logger.js';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger implements ILogger {
  private currentLevelPriority: number;

  constructor(initialLevel: LogLevel = 'info') {
    this.currentLevelPriority = LOG_LEVEL_PRIORITY[initialLevel];
  }

  public setLevel(level: LogLevel): void {
    this.currentLevelPriority = LOG_LEVEL_PRIORITY[level];
  }

  public debug(message: string, metadata?: LogMetadata): void {
    this.log('debug', message, metadata);
  }

  public info(message: string, metadata?: LogMetadata): void {
    this.log('info', message, metadata);
  }

  public warn(message: string, metadata?: LogMetadata): void {
    this.log('warn', message, metadata);
  }

  public error(message: string, metadata?: LogMetadata): void {
    this.log('error', message, metadata);
  }

  private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    if (LOG_LEVEL_PRIORITY[level] < this.currentLevelPriority) {
      return;
    }

    const timestamp = new Date().toISOString();
    const formattedLevel = level.toUpperCase().padEnd(5);
    const metaString = metadata && Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : '';
    
    // Write logs to stderr so stdout remains clean for MCP stdio JSON-RPC transport
    process.stderr.write(`[${timestamp}] [${formattedLevel}] ${message}${metaString}\n`);
  }
}
