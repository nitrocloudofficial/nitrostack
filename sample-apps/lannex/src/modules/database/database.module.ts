import { Module } from '@nitrostack/core';
import { PrismaService } from './prisma.service.js';

@Module({
  name: 'database',
  description: 'Database connection and Prisma ORM service',
  providers: [PrismaService],
  exports: [PrismaService]
})
export class DatabaseModule {}
