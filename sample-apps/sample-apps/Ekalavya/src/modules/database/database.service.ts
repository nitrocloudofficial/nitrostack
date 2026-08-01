import { Injectable, OnModuleInit, OnApplicationShutdown } from '@nitrostack/core';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL || 'file:dev.db' });

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnApplicationShutdown {
  constructor() {
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onApplicationShutdown() {
    await this.$disconnect();
  }
}
