import { Module } from '@nitrostack/core';
import { HealthInsuranceTools } from './health-insurance.tools.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'health-insurance',
  description: 'Health Insurance Module — Analyze sum insured adequacy, coverage gaps, premium ranges, and protection alerts',
  controllers: [HealthInsuranceTools],
  providers: [FinanceStore],
})
export class HealthInsuranceModule {}
