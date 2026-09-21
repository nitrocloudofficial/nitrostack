import { ResourceDecorator as Resource, ExecutionContext, Injectable } from '@nitrostack/core';
import { DatasetService } from '../services/DatasetService.js';
import { ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

@Injectable({
  deps: [DatasetService]
})
export class FraudResources {
  constructor(private datasetService: DatasetService) {}

  @Resource({
    uri: 'fraud://claim/{id}',
    name: 'Claim Details',
    description: 'Details for a specific claim by ID',
    mimeType: 'application/json'
  })
  async getClaimDetails(uri: string, ctx: ExecutionContext) {
    const claimId = uri.split('/').pop() || '';
    if (!claimId || claimId.includes('/') || claimId === 'claim') {
      throw new ValidationError(`Invalid claim ID: ${claimId}`);
    }
    logger.info(`MCP Resource accessed: fraud://claim/${claimId}`);
    const claim = await this.datasetService.getClaim(claimId);
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(claim, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'fraud://customer/{id}',
    name: 'Customer Details',
    description: 'Details for a specific customer profile by customerId',
    mimeType: 'application/json'
  })
  async getCustomerDetails(uri: string, ctx: ExecutionContext) {
    const customerId = uri.split('/').pop() || '';
    if (!customerId || customerId.includes('/') || customerId === 'customer') {
      throw new ValidationError(`Invalid customer ID: ${customerId}`);
    }
    logger.info(`MCP Resource accessed: fraud://customer/${customerId}`);
    const customer = await this.datasetService.getCustomer(customerId);
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(customer, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'fraud://history/{claimId}',
    name: 'Investigation History',
    description: 'Investigation event timeline for a claim',
    mimeType: 'application/json'
  })
  async getInvestigationTimeline(uri: string, ctx: ExecutionContext) {
    const claimId = uri.split('/').pop() || '';
    if (!claimId || claimId.includes('/') || claimId === 'history') {
      throw new ValidationError(`Invalid claim ID: ${claimId}`);
    }
    logger.info(`MCP Resource accessed: fraud://history/${claimId}`);
    const timeline = await this.datasetService.getTimeline(claimId);
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(timeline, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'fraud://reviews/{claimId}',
    name: 'Manual Reviews',
    description: 'Manual reviews for a claim, or all if ID is "all"',
    mimeType: 'application/json'
  })
  async getReviews(uri: string, ctx: ExecutionContext) {
    const claimId = uri.split('/').pop() || '';
    if (!claimId || claimId.includes('/') || claimId === 'reviews') {
      throw new ValidationError(`Invalid claim ID for reviews: ${claimId}`);
    }
    logger.info(`MCP Resource accessed: fraud://reviews/${claimId}`);
    const reviews = await this.datasetService.getReviewTasks();
    const filtered = claimId === 'all' ? reviews : reviews.filter(r => r.claimId === claimId);
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(filtered, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'fraud://fraud-rules',
    name: 'Fraud Rules',
    description: 'List of active deterministic fraud rules',
    mimeType: 'application/json'
  })
  async getFraudRulesList(uri: string, ctx: ExecutionContext) {
    logger.info('MCP Resource accessed: fraud://fraud-rules');
    const activeRules = [
      'VelocityRule: Checks if > 5 transactions in last hour',
      'GeoImpossibilityRule: Country changed in < 4 hours',
      'AmountAnomalyRule: Amount > 5x average',
      'NewPayeeHighValueRule: First time payee > 1000',
      'DuplicateClaimRule: Duplicate claim submission check'
    ];
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ activeRules }, null, 2)
      }]
    };
  }
}
