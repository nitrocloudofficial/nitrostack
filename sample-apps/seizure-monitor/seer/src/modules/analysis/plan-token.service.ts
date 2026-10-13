import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nitrostack/core';
import { loadAnalysisPlanConfig, type AnalysisPlanConfig } from '../../config/environment.js';
import { signedAnalysisPlanSchema, type AnalysisPlan, type SignedAnalysisPlan } from './analysis.schemas.js';

export class PlanTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanTokenError';
  }
}

@Injectable({ deps: [] })
export class PlanTokenService {
  private config: AnalysisPlanConfig;
  private now: () => number;

  constructor() {
    this.config = loadAnalysisPlanConfig();
    this.now = () => Date.now();
  }

  static forTesting(config: AnalysisPlanConfig, now: () => number = () => Date.now()): PlanTokenService {
    const service = Object.create(PlanTokenService.prototype) as PlanTokenService;
    service.config = config;
    service.now = now;
    return service;
  }

  issueReview(plan: AnalysisPlan, datasetHash: string): { token: string; expiresAt: string } {
    const issuedAt = this.now();
    const payload: SignedAnalysisPlan = {
      version: 2,
      purpose: 'review',
      datasetHash,
      issuedAt,
      expiresAt: issuedAt + this.config.tokenLifetimeMs,
      plan,
    };
    return this.sign(payload);
  }

  issueExecution(review: SignedAnalysisPlan): { token: string; expiresAt: string } {
    if (review.purpose !== 'review') {
      throw new PlanTokenError('Only a review token can be confirmed for execution.');
    }
    return this.sign({
      ...review,
      purpose: 'execution',
      issuedAt: this.now(),
    });
  }

  private sign(payload: SignedAnalysisPlan): { token: string; expiresAt: string } {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return {
      token: `${encodedPayload}.${this.signature(encodedPayload)}`,
      expiresAt: new Date(payload.expiresAt).toISOString(),
    };
  }

  verify(token: string): SignedAnalysisPlan {
    const [encodedPayload, signature, ...unexpectedParts] = token.split('.');
    if (!encodedPayload || !signature || unexpectedParts.length) {
      throw new PlanTokenError('Analysis-plan token is invalid. Create a new plan and approve it again.');
    }

    const expectedSignature = this.signature(encodedPayload);
    const supplied = Buffer.from(signature, 'base64url');
    const expected = Buffer.from(expectedSignature, 'base64url');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      throw new PlanTokenError('Analysis-plan token is invalid. Create a new plan and approve it again.');
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    } catch {
      throw new PlanTokenError('Analysis-plan token is invalid. Create a new plan and approve it again.');
    }

    const parsed = signedAnalysisPlanSchema.safeParse(parsedPayload);
    if (!parsed.success || parsed.data.expiresAt <= this.now()) {
      throw new PlanTokenError('Analysis-plan token has expired or is invalid. Create a new plan and approve it again.');
    }
    return parsed.data;
  }

  private signature(encodedPayload: string): string {
    return createHmac('sha256', this.config.tokenSecret).update(encodedPayload).digest('base64url');
  }
}
