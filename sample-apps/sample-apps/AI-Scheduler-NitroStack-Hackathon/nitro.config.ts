import { defineConfig } from '@nitrostack/cli';

export default defineConfig({
  appName: 'ai-assistant',
  entry: 'src/index.ts',
  server: {
    port: 3000,
    runtime: 'node'
  },
  env: {
    MONGODB_URI: process.env.MONGODB_URI || '',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    GOOGLE_ACCESS_TOKEN: process.env.GOOGLE_ACCESS_TOKEN || '',
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN || '',
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret'
  }
});
