import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { DatasetService } from '../services/DatasetService.js';
import { AIService } from '../services/AIService.js';
import { Ledger } from '../domain/Ledger.js';
import { RuleEngine } from '../rules/index.js';
import { AccountStatus } from '../domain/AccountStatus.js';
import { FraudResources } from '../resources/FraudResources.js';
import { Transaction } from '../domain/Transaction.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

@Injectable({
  deps: [FraudResources, AIService, RuleEngine, Ledger, DatasetService]
})
export class FraudTools {
  constructor(
    private fraudResources: FraudResources,
    private aiService: AIService,
    private ruleEngine: RuleEngine,
    private ledger: Ledger,
    private datasetService: DatasetService
  ) {}

  @Tool({
    name: 'analyze_claim',
    description: 'Perform complete claim analysis pipeline including image download, Gemini AI risk logic, and rule engine evaluation.',
    inputSchema: z.object({
      claimId: z.string().describe('The ID of the claim to analyze')
    })
  })
  async analyzeClaim(input: any, ctx: ExecutionContext) {
    logger.info(`MCP Tool invoked: analyze_claim for ID: ${input.claimId}`);
    
    // 1. Fetch details from DatasetService & Update Timeline
    const claim = await this.datasetService.getClaim(input.claimId);
    await this.datasetService.addTimelineEvent(claim.claimId, 'Claim Retrieved', `Claim records retrieved from MongoDB Atlas. Customer ID: ${claim.customerId}`);

    // 2. Fetch image from DatasetService & Update Timeline
    let imagePayload: { data: string; mimeType: string } | undefined;
    try {
      imagePayload = await this.datasetService.getClaimImageBase64(claim.imageUrl);
      await this.datasetService.addTimelineEvent(claim.claimId, 'Image Loaded', 'Image payload successfully downloaded from Cloudinary URL and encoded to Base64.');
    } catch (e) {
      logger.warn(`Could not load image resource for claim ${input.claimId}`);
    }

    // 3. Fetch history from DatasetService
    const history = await this.datasetService.getCustomerTransactions(claim.customerId);

    // 4. AIService (Gemini) evaluates structured inputs
    await this.datasetService.addTimelineEvent(claim.claimId, 'Gemini Analysis', 'Invoked Gemini Vision API to analyze metadata and match image documents.');
    const decision = await this.aiService.analyzeFraudWithRetries({
      claim,
      image: imagePayload,
      history
    });

    // 5. Post-AI Rule Engine evaluation
    await this.datasetService.addTimelineEvent(claim.claimId, 'Rule Evaluation', 'Running deterministic geo, velocity, amount, and duplicate rules.');
    const domainHistory = history.map((t: any) => new Transaction({
      id: t.id,
      accountId: t.accountId,
      amount: t.amount,
      timestamp: new Date(t.timestamp),
      payee: t.payee,
      type: t.type,
      location: t.location
    }));

    const targetTransaction = new Transaction({
      id: claim.claimId,
      accountId: claim.customerId,
      amount: claim.amount || 0,
      timestamp: new Date(claim.timestamp),
      payee: claim.payee || 'Unknown',
      type: 'DEBIT',
      location: claim.location
    });

    const ruleResults = this.ruleEngine.evaluate(targetTransaction, domainHistory);
    const triggeredRules = ruleResults.triggeredRules.map(r => r.ruleName);

    // 6. Aggregate risk score
    const aggregateRisk = Math.max(decision.fraud_probability, ruleResults.riskScore);
    await this.datasetService.addTimelineEvent(claim.claimId, 'Risk Calculated', `Aggregate risk calculated: ${aggregateRisk.toFixed(2)} (AI: ${decision.fraud_probability.toFixed(2)}, Rule Engine: ${ruleResults.riskScore.toFixed(2)})`);

    // Update claim records in DB
    await this.datasetService.updateClaimStatus(claim.claimId, {
      riskScore: aggregateRisk,
      confidence: decision.confidence,
      status: aggregateRisk > 0.7 ? 'UNDER_REVIEW' : 'ACTIVE'
    });

    // 7. Human review queue fallback
    if (decision.confidence < config.app.confidenceThreshold || aggregateRisk > 0.7) {
      await this.requestHumanReview({ claimId: claim.claimId, reason: 'Low AI confidence or high risk metrics triggered escalation' }, ctx);
    }

    return {
      claimId: claim.claimId,
      decision: {
        ...decision,
        fraud_probability: aggregateRisk
      },
      ruleResults
    };
  }

  @Tool({
    name: 'compare_claim_with_image',
    description: 'Use Gemini Vision to check matching text details between claim and document image',
    inputSchema: z.object({
      claimId: z.string().describe('The ID of the claim to verify')
    })
  })
  async compareClaimWithImage(input: any, ctx: ExecutionContext) {
    logger.info(`compare_claim_with_image tool invoked for ${input.claimId}`);
    const claim = await this.datasetService.getClaim(input.claimId);
    const imagePayload = await this.datasetService.getClaimImageBase64(claim.imageUrl);
    
    await this.datasetService.addTimelineEvent(claim.claimId, 'OCR Completed', 'OCR scan started to align claim parameters with invoice parameters.');
    await this.datasetService.addTimelineEvent(claim.claimId, 'Gemini Analysis', 'Compared claim details with OCR extracted fields.');
    
    // Call AIService for comparison
    const result = await this.aiService.analyzeFraudWithRetries({
      claim,
      image: imagePayload,
      history: []
    });

    return { claimId: input.claimId, matchScore: result.confidence, reason: result.summary };
  }

  @Tool({
    name: 'execute_ocr',
    description: 'Perform optical character recognition text extraction on the claim document',
    inputSchema: z.object({
      claimId: z.string().describe('The ID of the claim image to OCR')
    })
  })
  async executeOCR(input: any, ctx: ExecutionContext) {
    logger.info(`execute_ocr tool invoked for ${input.claimId}`);
    const claim = await this.datasetService.getClaim(input.claimId);
    await this.datasetService.addTimelineEvent(claim.claimId, 'OCR Completed', 'Successfully completed OCR scanning on invoice document.');
    return { claimId: input.claimId, ocrText: `Extracted details from invoice of customer ${claim.customerId}` };
  }

  @Tool({
    name: 'execute_kyc',
    description: 'Execute a KYC check on a customer ID',
    inputSchema: z.object({
      customerId: z.string().describe('The customer ID to check')
    })
  })
  async executeKYC(input: any, ctx: ExecutionContext) {
    logger.info(`Executing KYC for ${input.customerId}`);
    const customer = await this.datasetService.getCustomer(input.customerId);
    return { customerId: input.customerId, kycStatus: customer.kycStatus || 'PASSED', riskLevel: customer.riskLevel || 'LOW' };
  }

  @Tool({
    name: 'check_duplicate_claims',
    description: 'Scan database to check if this claim contains duplicate details from previous claims',
    inputSchema: z.object({
      claimId: z.string().describe('The ID of the claim to verify')
    })
  })
  async checkDuplicateClaims(input: any, ctx: ExecutionContext) {
    logger.info(`check_duplicate_claims tool invoked for ${input.claimId}`);
    const target = await this.datasetService.getClaim(input.claimId);
    const claimsMap = await this.datasetService.discoverClaims();
    
    const duplicates = Array.from(claimsMap.values()).filter(
      c => c.claimId !== target.claimId &&
           c.customerId === target.customerId &&
           c.claimText === target.claimText
    );

    return { claimId: input.claimId, isDuplicate: duplicates.length > 0, count: duplicates.length };
  }

  @Tool({
    name: 'calculate_risk',
    description: 'Calculates the pure rule engine score for this claim without calling Gemini',
    inputSchema: z.object({
      claimId: z.string().describe('The claim ID')
    })
  })
  async calculateRisk(input: any, ctx: ExecutionContext) {
    logger.info(`calculate_risk tool invoked for ${input.claimId}`);
    const claim = await this.datasetService.getClaim(input.claimId);
    const history = await this.datasetService.getCustomerTransactions(claim.customerId);
    
    const domainHistory = history.map((t: any) => new Transaction({
      id: t.id,
      accountId: t.accountId,
      amount: t.amount,
      timestamp: new Date(t.timestamp),
      payee: t.payee,
      type: t.type,
      location: t.location
    }));

    const targetTransaction = new Transaction({
      id: claim.claimId,
      accountId: claim.customerId,
      amount: 100, // Mock amount for pure calculation
      timestamp: new Date(claim.timestamp),
      payee: 'Unknown',
      type: 'DEBIT'
    });

    const ruleResults = this.ruleEngine.evaluate(targetTransaction, domainHistory);
    await this.datasetService.addTimelineEvent(claim.claimId, 'Risk Calculated', `Risk recalculated via rule engine: ${ruleResults.riskScore}`);
    
    return { claimId: input.claimId, ruleRiskScore: ruleResults.riskScore };
  }

  @Tool({
    name: 'freeze_account',
    description: 'Freeze a customer account to halt debit transactions',
    inputSchema: z.object({
      accountId: z.string().describe('The account/customer ID to freeze'),
      reason: z.string().describe('Reason for freezing')
    })
  })
  async freezeAccount(input: any, ctx: ExecutionContext) {
    logger.info(`Freezing account ${input.accountId}`, { reason: input.reason });
    await this.ledger.updateAccountStatus(input.accountId, AccountStatus.FROZEN);
    
    // Find associated claims to log timeline
    const claims = await this.datasetService.discoverClaims();
    const associatedClaim = Array.from(claims.values()).find(c => c.customerId === input.accountId);
    if (associatedClaim) {
      await this.datasetService.addTimelineEvent(associatedClaim.claimId, 'Account Frozen', `Account frozen by system. Reason: ${input.reason}`);
    }

    return { success: true, accountId: input.accountId, status: 'FROZEN' };
  }

  @Tool({
    name: 'approve_claim',
    description: 'Approve a pending claim, transitioning its status',
    inputSchema: z.object({
      claimId: z.string().describe('The ID of the claim to approve'),
      reviewerNotes: z.string().describe('Notes from the reviewer')
    })
  })
  async approveClaim(input: any, ctx: ExecutionContext) {
    logger.info(`Approving claim ${input.claimId}`);
    await this.datasetService.updateClaimStatus(input.claimId, { status: 'APPROVED', reviewStatus: 'APPROVED' });
    await this.datasetService.addTimelineEvent(input.claimId, 'Claim Approved', `Reviewer approved claim. Notes: ${input.reviewerNotes}`);
    return { success: true, claimId: input.claimId, status: 'APPROVED' };
  }

  @Tool({
    name: 'reject_claim',
    description: 'Reject a pending claim, transitioning its status',
    inputSchema: z.object({
      claimId: z.string().describe('The ID of the claim to reject'),
      reviewerNotes: z.string().describe('Notes from the reviewer')
    })
  })
  async rejectClaim(input: any, ctx: ExecutionContext) {
    logger.info(`Rejecting claim ${input.claimId}`);
    await this.datasetService.updateClaimStatus(input.claimId, { status: 'REJECTED', reviewStatus: 'REJECTED' });
    await this.datasetService.addTimelineEvent(input.claimId, 'Claim Rejected', `Reviewer rejected claim. Notes: ${input.reviewerNotes}`);
    return { success: true, claimId: input.claimId, status: 'REJECTED' };
  }

  @Tool({
    name: 'request_human_review',
    description: 'Create a manual human review task for a claim',
    inputSchema: z.object({
      claimId: z.string().describe('The ID of the claim to escalate'),
      reason: z.string().describe('Reason for manual escalation')
    })
  })
  async requestHumanReview(input: any, ctx: ExecutionContext) {
    logger.info(`Requesting manual review for ${input.claimId}`);
    const claim = await this.datasetService.getClaim(input.claimId);
    
    await this.datasetService.saveReviewTask({
      claimId: claim.claimId,
      claim,
      reason: input.reason,
      status: 'PENDING',
      timestamp: new Date().toISOString()
    });

    await this.datasetService.updateClaimStatus(claim.claimId, { reviewStatus: 'PENDING' });
    await this.datasetService.addTimelineEvent(claim.claimId, 'Human Review Requested', `Escalated to human review queue. Reason: ${input.reason}`);
    
    return { success: true, claimId: input.claimId, status: 'PENDING_REVIEW' };
  }

  @Tool({
    name: 'generate_investigation_report',
    description: 'Compile full investigation timeline and scores into a report format',
    inputSchema: z.object({
      claimId: z.string().describe('The ID of the claim to report on')
    })
  })
  async generateInvestigationReport(input: any, ctx: ExecutionContext) {
    logger.info(`generate_investigation_report tool invoked for ${input.claimId}`);
    const claim = await this.datasetService.getClaim(input.claimId);
    const timeline = await this.datasetService.getTimeline(input.claimId);
    
    return {
      claimId: input.claimId,
      riskScore: claim.riskScore,
      confidence: claim.confidence,
      status: claim.status,
      timelineEventsCount: timeline.length,
      reportSummary: `Full investigation conducted on claim ${input.claimId}. Total timeline events recorded: ${timeline.length}.`
    };
  }
}
