/**
 * ThreatMatrix Database Layer
 * Singleton Prisma Client connection manager with graceful failure handling.
 * Database failures will never crash the server.
 */
import { PrismaClient } from '../generated/prisma/index.js';
import { logger } from './logger.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient | null = null;

try {
  prismaInstance = globalForPrisma.prisma ?? new PrismaClient({
    log: ['error', 'warn'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance;
  }
} catch (e: any) {
  logger.warn('Prisma initialization failed — continuing in memory mode', { error: e.message });
}

export const prisma = prismaInstance;

export async function isDatabaseConnected(): Promise<boolean> {
  if (!prisma) return false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (e) {
    return false;
  }
}
