import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  compatibilityDate: '2024-04-03',
  srcDir: 'src',
  routesDir: 'routes',
  port: 3002,
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    redisUrl: process.env.REDIS_URL || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  typescript: {
    strict: true,
  },
  // Exclude test files — Nitro picks up all .ts files in src/ otherwise
  ignore: ['**/*.test.ts', '**/*.spec.ts'],
})
