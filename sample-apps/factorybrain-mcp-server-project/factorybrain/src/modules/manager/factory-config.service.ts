import { Injectable } from '@nitrostack/core';
import { DatabaseService } from '../../services/database.service.js';
import { FactoryConfiguration } from './manager.types.js';

@Injectable({ deps: [DatabaseService] })
export class FactoryConfigService {
  private config?: FactoryConfiguration;

  constructor(private readonly database: DatabaseService) {}

  async initialize(): Promise<FactoryConfiguration> {
    const defaults: FactoryConfiguration = {
      configId: 'factory-default',
      currency: 'GBP',
      downtimeCostPerHour: positiveEnv('FACTORYBRAIN_DOWNTIME_COST_PER_HOUR', 2_500),
      approvalThreshold: positiveEnv('FACTORYBRAIN_APPROVAL_THRESHOLD', 1_000),
      productionDelayCostFactor: positiveEnv('FACTORYBRAIN_DELAY_COST_FACTOR', 0.35),
      autoApprovalEnabled: process.env.FACTORYBRAIN_AUTO_APPROVAL !== 'false',
      updatedAt: new Date().toISOString(),
    };
    this.config = await this.database.initializeFactoryConfiguration(defaults);
    return this.get();
  }

  get(): FactoryConfiguration {
    if (!this.config) throw new Error('Factory configuration has not been initialized');
    return { ...this.config };
  }
}

function positiveEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}
