export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMetadata {
  toolName?: string;
  durationMs?: number;
  error?: Error | unknown;
  [key: string]: unknown;
}

export interface ILogger {
  debug(message: string, metadata?: LogMetadata): void;
  info(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  error(message: string, metadata?: LogMetadata): void;
  setLevel(level: LogLevel): void;
}
