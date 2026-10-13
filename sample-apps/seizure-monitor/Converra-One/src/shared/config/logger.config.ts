import { env } from './env.config.js';

export const loggerConfig = {
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === 'production' ? 'json' : 'pretty',
  timestamp: true
};
