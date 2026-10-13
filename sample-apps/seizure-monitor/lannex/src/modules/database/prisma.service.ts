import { Injectable } from '@nitrostack/core';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService {
  public readonly client: PrismaClient;

  constructor() {
    this.client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }
}
