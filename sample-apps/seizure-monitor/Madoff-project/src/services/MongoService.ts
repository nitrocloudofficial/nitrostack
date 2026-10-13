import { Injectable, OnModuleInit, OnModuleDestroy } from '@nitrostack/core';
import { MongoClient, Db } from 'mongodb';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

@Injectable({ deps: [] })
export class MongoService implements OnModuleInit, OnModuleDestroy {
  private client: MongoClient;
  private dbInstance!: Db;

  constructor() {
    this.client = new MongoClient(config.mongo.uri);
  }

  async onModuleInit() {
    logger.info('Connecting to MongoDB Atlas...', { uri: config.mongo.uri });
    try {
      await this.client.connect();
      this.dbInstance = this.client.db();
      logger.info('Successfully connected to MongoDB Atlas');
      await this.seedIfNeeded();
    } catch (error) {
      logger.error('Failed to connect to MongoDB', { error: (error as Error).message });
      throw error;
    }
  }

  async onModuleDestroy() {
    logger.info('Closing MongoDB connection...');
    await this.client.close();
  }

  public getDb(): Db {
    if (!this.dbInstance) {
      throw new Error('Database connection not initialized');
    }
    return this.dbInstance;
  }

  private async seedIfNeeded() {
    const claimsCol = this.dbInstance.collection('claims');
    const count = await claimsCol.countDocuments();
    if (count === 0) {
      logger.info('Database empty. Seeding initial claims, customers, and history records...');
      
      // 1. Seed a claim
      await claimsCol.insertOne({
        claimId: 'claim_001',
        customerId: 'cust_001',
        claimText: 'Auto collision claim on freeway. Fender damaged.',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        timestamp: new Date().toISOString(),
        status: 'PENDING',
        riskScore: 0.0,
        confidence: 0.0,
        reviewStatus: 'NONE',
        amount: 1500,
        payee: 'Store B',
        location: { latitude: 37.7749, longitude: -122.4194, country: 'US' }
      });

      // 2. Seed historical transactions for Ledger/Rule evaluation
      const transactionsCol = this.dbInstance.collection('transactions');
      await transactionsCol.insertMany([
        {
          id: 'tx_001',
          accountId: 'cust_001',
          amount: 150.0,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          payee: 'Store A',
          type: 'DEBIT',
          location: { latitude: 37.7749, longitude: -122.4194, country: 'US' }
        },
        {
          id: 'tx_002',
          accountId: 'cust_001',
          amount: 50.0,
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          payee: 'Gas Station',
          type: 'DEBIT',
          location: { latitude: 37.7749, longitude: -122.4194, country: 'US' }
        }
      ]);

      // 3. Seed customer information
      await this.dbInstance.collection('customers').insertOne({
        customerId: 'cust_001',
        name: 'John Doe',
        email: 'john.doe@example.com',
        kycStatus: 'PASSED',
        riskLevel: 'LOW'
      });

      // 4. Seed initial timeline events in investigations
      await this.dbInstance.collection('investigations').insertOne({
        claimId: 'claim_001',
        events: [
          {
            eventName: 'Claim Retrieved',
            description: 'Initial claim received and parsed.',
            timestamp: new Date().toISOString()
          }
        ]
      });

      logger.info('Database seeding completed.');
    }
  }
}
