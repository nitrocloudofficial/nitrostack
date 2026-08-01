import { env } from './env.config.js';
import { APP_NAME, APP_TAGLINE, APP_VERSION } from '../constants/app.constants.js';

export const appConfig = {
  name: APP_NAME,
  tagline: APP_TAGLINE,
  version: APP_VERSION,
  environment: env.NODE_ENV,
  port: env.PORT,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development'
};
