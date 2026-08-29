export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    console.error(JSON.stringify({ level: 'INFO', message, context, timestamp: new Date().toISOString() }));
  },
  warn: (message: string, context?: Record<string, any>) => {
    console.error(JSON.stringify({ level: 'WARN', message, context, timestamp: new Date().toISOString() }));
  },
  error: (message: string, context?: Record<string, any>) => {
    console.error(JSON.stringify({ level: 'ERROR', message, context, timestamp: new Date().toISOString() }));
  },
  debug: (message: string, context?: Record<string, any>) => {
    console.error(JSON.stringify({ level: 'DEBUG', message, context, timestamp: new Date().toISOString() }));
  }
};
