import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? [
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ]
    : [{ emit: 'stdout', level: 'error' }],
});

export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.error('[Database] Connected to PostgreSQL via Prisma');
  } catch (error) {
    console.error('[Database] Connection failed:', error);
    process.exit(1);
  }
}
