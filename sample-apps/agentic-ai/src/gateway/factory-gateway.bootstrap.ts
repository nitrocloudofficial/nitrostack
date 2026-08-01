import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { FactoryGatewayModule } from './factory-gateway.module.js';

let application: INestApplication | undefined;

export async function startFactoryGateway(): Promise<void> {
  if (application) return;
  const port = Number(process.env.FACTORYBRAIN_WEBSOCKET_PORT) || 3002;
  const host = process.env.FACTORYBRAIN_WEBSOCKET_HOST || 'localhost';
  application = await NestFactory.create(FactoryGatewayModule, { logger: ['error', 'warn'] });
  await application.listen(port, host);
  console.log(`FactoryBrain Socket.IO gateway listening on http://${host}:${port}/socket.io/`);
}

export async function stopFactoryGateway(): Promise<void> {
  await application?.close();
  application = undefined;
}
