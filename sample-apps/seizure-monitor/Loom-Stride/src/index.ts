/**
 * ShoeFit MCP Server
 *
 * Measures foot length and width from coin-calibrated photos,
 * then matches against a scraped shoe sizing database.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SneaksAPI = require('sneaks-api');

import 'dotenv/config';
// @ts-ignore
import express from 'express';

// Monkeypatch express body parsers to force 100mb limit for large base64 image uploads
const originalJson = express.json;
express.json = function (options?: any) {
  return originalJson({ ...options, limit: '100mb' });
};

const originalUrlEncoded = express.urlencoded;
express.urlencoded = function (options?: any) {
  return originalUrlEncoded({ ...options, limit: '100mb', extended: true });
};

import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch((error) => {
  console.error('Failed to start ShoeFit server:', error);
  process.exit(1);
});
